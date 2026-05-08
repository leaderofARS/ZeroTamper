import * as tf from "@tensorflow/tfjs-node";
import sharp from "sharp";

/** Target dimension for the EfficientNet-Lite model input. */
const IMG_SIZE = 224;

let model: tf.GraphModel | null = null;
let modelLoadError: string | null = null;

/**
 * Load the TensorFlow.js deepfake detection model from the local model directory.
 * Falls back gracefully if the model files are not present.
 */
export async function loadModel(): Promise<void> {
  try {
    model = await tf.loadGraphModel("file://./model/model.json");
    console.log("[deepfake] TF.js model loaded");
  } catch (err: any) {
    modelLoadError = err.message;
    console.warn("[deepfake] Model not found — running in heuristic-only mode:", err.message);
  }
}

/**
 * Preprocess an image buffer into a [1, 224, 224, 3] tensor normalised to [-1, 1].
 */
async function preprocessImage(imageBuffer: Buffer): Promise<tf.Tensor4D> {
  const raw = await sharp(imageBuffer)
    .resize(IMG_SIZE, IMG_SIZE)
    .removeAlpha()
    .raw()
    .toBuffer();

  const floatData = Float32Array.from(raw, v => (v / 127.5) - 1.0);
  return tf.tensor4d(floatData, [1, IMG_SIZE, IMG_SIZE, 3]);
}

/**
 * Run deepfake detection on an image buffer.
 * Returns confidence in [0, 1] — higher means more likely manipulated.
 */
export async function detectDeepfake(imageBuffer: Buffer): Promise<number> {
  if (!model) {
    // Heuristic fallback: analyse variance (real photos tend to have higher colour variance)
    return heuristicConfidence(imageBuffer);
  }

  let tensor: tf.Tensor4D | null = null;
  try {
    tensor = await preprocessImage(imageBuffer);
    const output = model.predict(tensor) as tf.Tensor;
    const [realProb, fakeProb] = await output.data();
    output.dispose();
    return fakeProb ?? 0;
  } finally {
    tensor?.dispose();
  }
}

/**
 * Heuristic-only confidence score using pixel variance analysis.
 * AI-generated images tend to have unnaturally smooth regions.
 */
async function heuristicConfidence(imageBuffer: Buffer): Promise<number> {
  try {
    const { data, info } = await sharp(imageBuffer)
      .resize(64, 64)
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const pixels = Array.from(data);
    const mean = pixels.reduce((a, b) => a + b, 0) / pixels.length;
    const variance = pixels.reduce((a, b) => a + (b - mean) ** 2, 0) / pixels.length;

    // Low variance (<500) is a weak indicator of AI generation
    const confidence = Math.max(0, Math.min(1, 1 - variance / 3000));
    return confidence;
  } catch {
    return 0; // unable to analyse — assume real
  }
}

export { modelLoadError };
