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
import tensorflow as tf  # type: ignore # noqa: E402

load_dotenv()

app = FastAPI(title="WitnessChain ML Service - Multimodal Edition")

# --- Gemini Configuration ---
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# --- Kaggle Model Load ---
print("Downloading Kaggle Deepfake model...")
model_path = kagglehub.model_download("aestroe/deepfake-detection/tensorFlow2/default")
print("Path to model files:", model_path)

# The Kaggle model contains multiple files. We will load the Xception image model.
keras_model_path = os.path.join(model_path, "image", "XceptionModel.keras")
print(f"Loading TF2 model from: {keras_model_path}")

try:
    # Attempting to load as standard keras model
    kaggle_model = tf.keras.models.load_model(keras_model_path)
    print("Kaggle keras model loaded successfully.")
except Exception as e:
    print(f"Error loading keras model: {e}")
    kaggle_model = None

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
    try:
        tensor = preprocess_image_for_tf(img)
        prediction = kaggle_model(tensor)
        
        # Handle different TF output signatures
        if isinstance(prediction, dict):
            key = list(prediction.keys())[0]
            val = prediction[key].numpy()[0]
        else:
            val = prediction.numpy()[0]
            
        # If model outputs 2 classes (real/fake), extract fake probability
        if len(val) > 1:
            return float(val[1])
        return float(val[0])
    except Exception as e:
        print(f"TF evaluation failed: {e}")
        return 0.0

def evaluate_video_tf(video_path: str) -> float:
    """Extract frames and evaluate them using TF model."""
    cap = cv2.VideoCapture(video_path)
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    if frame_count == 0:
        return 0.0
        
    # Sample up to 5 frames spread evenly across the video
    sample_indices = np.linspace(0, frame_count - 1, min(5, frame_count), dtype=int)
    confidences = []
    
    for idx in sample_indices:
        cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
        ret, frame = cap.read()
        if ret:
            # OpenCV uses BGR, convert to RGB
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            img = Image.fromarray(frame_rgb)
            confidences.append(evaluate_image_tf(img))
            
    cap.release()
    if not confidences:
        return 0.0
    # If any frame is highly fake, we flag the whole video
    return float(np.max(confidences)) 

def upload_to_gemini(path, mime_type):
    """Uploads the given file to Gemini File API (required for Audio/Video)."""
    file = genai.upload_file(path, mime_type=mime_type)
    return file

@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze_media(req: AnalyzeRequest):
    try:
        media_bytes = base64.b64decode(req.data)
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid base64 data")

    is_deepfake = False
    confidence = 0.0
    p_hash = "0000000000000000"
    mode = "kaggle-tf2"

    is_image = req.mimeType.startswith("image/")
    is_video = req.mimeType.startswith("video/")
    is_audio = req.mimeType.startswith("audio/")
    tmp_path = None

    # 1. pHash for duplicates (Images/Videos only)
    if is_image:
        img = Image.open(io.BytesIO(media_bytes)).convert("RGB")
        p_hash = str(imagehash.phash(img))
    elif is_video:
        # Write to temp file to extract first frame for pHash
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp:
            tmp.write(media_bytes)
            tmp_path = tmp.name
        cap = cv2.VideoCapture(tmp_path)
        ret, frame = cap.read()
        if ret:
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            p_hash = str(imagehash.phash(Image.fromarray(frame_rgb)))
        cap.release()

    # 2. Kaggle TF2 Model Inference
    tf_conf = 0.0
    if is_image:
        tf_conf = evaluate_image_tf(img)
    elif is_video:
        tf_conf = evaluate_video_tf(tmp_path)
    # Standard TF image models don't handle audio, so tf_conf remains 0.0
    
    # 3. Gemini Multimodal Inference (Strong for Video/Audio analysis)
    gemini_conf = 0.0
    if GEMINI_API_KEY:
        try:
            model = genai.GenerativeModel('gemini-1.5-pro')
            prompt = (
                "You are an expert digital forensics analyst. Carefully inspect this media file. "
                "Is there any evidence that this is a deepfake, AI-generated, or digitally manipulated? "
                "For video: Look for AI artifacts, weird lighting, inconsistent textures, or anatomical anomalies. "
                "For audio: Listen for robotic pacing, metallic artifacts, or unnatural breathing. "
                "Respond ONLY with a JSON object in this exact format: {\"is_deepfake\": true/false, \"confidence\": 0.0-1.0}"
            )
            
            if is_image:
                response = model.generate_content([prompt, img])
            else:
                # Video or Audio requires File API
                ext = ".mp4" if is_video else ".mp3"
                if not is_video: # Write audio to temp
                    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
                        tmp.write(media_bytes)
                        tmp_path = tmp.name
                
                gemini_file = upload_to_gemini(tmp_path, req.mimeType)
                
                # Gemini File API processing check for larger videos
                import time
                while gemini_file.state.name == 'PROCESSING':
                    time.sleep(2)
                    gemini_file = genai.get_file(gemini_file.name)
                    
                response = model.generate_content([prompt, gemini_file])
                genai.delete_file(gemini_file.name) # cleanup remote file
            
            text = response.text.strip()
            match = re.search(r'\{.*\}', text, re.DOTALL)
            if match:
                res_json = json.loads(match.group(0))
                gemini_conf = float(res_json.get("confidence", 0.0))
        except Exception as e:
            print(f"[Deepfake Error] Gemini API failed: {e}")

    # Combine signals: take the maximum confidence of both models
    confidence = max(tf_conf, gemini_conf)
    if confidence > 0.8:
        is_deepfake = True

    if gemini_conf > tf_conf:
        mode = "gemini-api"
        
    # Cleanup local temp file
    if tmp_path and os.path.exists(tmp_path):
        os.remove(tmp_path)

    return AnalyzeResponse(
        isDeepfake=is_deepfake,
        confidence=confidence,
        pHash=p_hash,
        modelMode=mode
    )

@app.get("/health")
def health():
    return {
        "status": "ok", 
        "service": "Multimodal Deepfake Detector", 
        "gemini_enabled": bool(GEMINI_API_KEY),
        "tf_model_loaded": kaggle_model is not None
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("ML_PORT", 5001)))
