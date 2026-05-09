import os
import base64
import io
import json
import re
import tempfile
import imagehash
import cv2
import numpy as np
from PIL import Image
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import google.generativeai as genai
from dotenv import load_dotenv

import kagglehub

# Force TensorFlow to use Legacy Keras (Keras 2) to successfully load older Kaggle models
os.environ["TF_USE_LEGACY_KERAS"] = "1"
try:
    import tensorflow as tf  # type: ignore # noqa: E402
except ImportError:
    tf = None

load_dotenv()

app = FastAPI(title="WitnessChain ML Service - Multimodal Edition")

@app.get("/")
def root():
    return {"message": "WitnessChain ML Service is running. Check /health for status."}

# --- Gemini Configuration ---
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    try:
        genai.configure(api_key=GEMINI_API_KEY)
    except Exception as e:
        print(f"GenAI configuration failed: {e}")

# --- Kaggle Model Load ---
print("Downloading/Locating Kaggle Deepfake model...")
try:
    model_dir = kagglehub.model_download("aestroe/deepfake-detection/tensorFlow2/default")
    print("Model directory:", model_dir)
except Exception as e:
    print(f"Kagglehub download failed: {e}")
    model_dir = None

def load_xception_model(base_path):
    if not base_path or tf is None: return None
    
    paths_to_try = [
        os.path.join(base_path, "image", "deepfake_detection_xception2.h5"),
        os.path.join(base_path, "image", "XceptionModel.keras"),
        os.path.join(base_path, "XceptionModel.keras"),
        os.path.join(base_path, "deepfake_detection_xception2.h5"),
    ]
    
    for path in paths_to_try:
        if os.path.exists(path):
            print(f"Attempting to load model from: {path}")
            try:
                # Use compile=False to avoid issues with custom metrics/optimizers in the saved file
                model = tf.keras.models.load_model(path, compile=False)
                print(f"✓ Model loaded successfully from {path}")
                return model
            except Exception as e:
                print(f"✗ Failed to load {path}: {e}")
    return None

kaggle_model = load_xception_model(model_dir)

class AnalyzeRequest(BaseModel):
    data: str # base64 string
    mimeType: str = "image/jpeg"

class AnalyzeResponse(BaseModel):
    isDeepfake: bool
    confidence: float
    pHash: str
    modelMode: str

def preprocess_image_for_tf(img: Image.Image, target_size=(256, 256)):
    """Preprocess PIL Image for typical TF2 image classification models."""
    img_resized = img.resize(target_size)
    img_array = np.array(img_resized) / 255.0  # Normalize to [0, 1]
    return np.expand_dims(img_array, axis=0).astype(np.float32)

def evaluate_image_tf(img: Image.Image) -> float:
    """Returns deepfake probability for an image [0.0 - 1.0]"""
    if not kaggle_model or tf is None:
        return 0.0
    try:
        tensor = preprocess_image_for_tf(img)
        prediction = kaggle_model(tensor)
        
        # Handle different TF output signatures
        if isinstance(prediction, dict):
            key = list(prediction.keys())[0]
            val = prediction[key].numpy()[0]
        else:
            val = prediction.numpy()[0] if hasattr(prediction, "numpy") else prediction[0]
            
        # If model outputs 2 classes (real/fake), extract fake probability
        if hasattr(val, "__len__") and len(val) > 1:
            return float(val[1])
        return float(val) if isinstance(val, (float, int, np.float32)) else float(val[0])
    except Exception as e:
        print(f"TF evaluation failed: {e}")
        return 0.0

def evaluate_video_tf(video_path: str) -> float:
    """Extract frames and evaluate them using TF model."""
    if not kaggle_model or tf is None: return 0.0
    cap = cv2.VideoCapture(video_path)
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    if frame_count <= 0:
        return 0.0
        
    sample_indices = np.linspace(0, frame_count - 1, min(5, frame_count), dtype=int)
    confidences = []
    
    for idx in sample_indices:
        cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
        ret, frame = cap.read()
        if ret:
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            img = Image.fromarray(frame_rgb)
            confidences.append(evaluate_image_tf(img))
            
    cap.release()
    return float(np.max(confidences)) if confidences else 0.0

def upload_to_gemini(path, mime_type):
    """Uploads the given file to Gemini File API."""
    return genai.upload_file(path, mime_type=mime_type)

@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze_media(req: AnalyzeRequest):
    try:
        media_bytes = base64.b64decode(req.data)
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid base64 data")

    is_deepfake = False
    confidence = 0.0
    p_hash = "0000000000000000"
    mode = "kaggle-tf2" if kaggle_model else "gemini-only"

    is_image = req.mimeType.startswith("image/")
    is_video = req.mimeType.startswith("video/")
    is_audio = req.mimeType.startswith("audio/")
    tmp_path = None

    # 1. pHash for duplicates
    img = None
    if is_image:
        try:
            img = Image.open(io.BytesIO(media_bytes)).convert("RGB")
            p_hash = str(imagehash.phash(img))
        except: pass
    elif is_video:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp:
            tmp.write(media_bytes)
            tmp_path = tmp.name
        cap = cv2.VideoCapture(tmp_path)
        ret, frame = cap.read()
        if ret:
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            p_hash = str(imagehash.phash(Image.fromarray(frame_rgb)))
        cap.release()

    # 2. Local Model Inference
    tf_conf = 0.0
    if kaggle_model:
        if is_image and img:
            tf_conf = evaluate_image_tf(img)
        elif is_video:
            tf_conf = evaluate_video_tf(tmp_path)
    
    # 3. Gemini Multimodal Inference (Strong fallback)
    gemini_conf = 0.0
    if GEMINI_API_KEY:
        try:
            # Explicitly try 'gemini-1.5-flash-latest' which is often more stable
            model = genai.GenerativeModel('gemini-1.5-flash-latest') 
            prompt = (
                "Identify if this media is a deepfake or AI-generated. "
                "Look for artifacts, anatomical errors, or unnatural textures. "
                "Respond ONLY with JSON: {\"is_deepfake\": bool, \"confidence\": 0.0-1.0}"
            )
            
            if is_image and img:
                response = model.generate_content([prompt, img])
            else:
                ext = ".mp4" if is_video else ".mp3"
                if not is_video:
                    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
                        tmp.write(media_bytes)
                        tmp_path = tmp.name
                
                gemini_file = upload_to_gemini(tmp_path, req.mimeType)
                import time
                for _ in range(10): # Wait up to 20s
                    if gemini_file.state.name != 'PROCESSING': break
                    time.sleep(2)
                    gemini_file = genai.get_file(gemini_file.name)
                    
                response = model.generate_content([prompt, gemini_file])
                genai.delete_file(gemini_file.name)
            
            match = re.search(r'\{.*\}', response.text.strip(), re.DOTALL)
            if match:
                res_json = json.loads(match.group(0))
                gemini_conf = float(res_json.get("confidence", 0.0))
        except Exception as e:
            print(f"Gemini failed: {e}")

    confidence = max(tf_conf, gemini_conf)
    if confidence > 0.8: is_deepfake = True
    if gemini_conf > tf_conf: mode = "gemini-api"
        
    if tmp_path and os.path.exists(tmp_path): os.remove(tmp_path)

    return AnalyzeResponse(isDeepfake=is_deepfake, confidence=confidence, pHash=p_hash, modelMode=mode)

@app.get("/health")
def health():
    return {
        "status": "ok", 
        "gemini_enabled": bool(GEMINI_API_KEY),
        "tf_model_loaded": kaggle_model is not None
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("ML_PORT", 5001)))
