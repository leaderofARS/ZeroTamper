import os
# os.environ["TF_USE_LEGACY_KERAS"] = "1"
import tensorflow as tf

model_path = "/home/ars0x01/.cache/kagglehub/models/aestroe/deepfake-detection/tensorFlow2/default/1/image/XceptionModel.keras"

try:
    model1 = tf.keras.models.load_model(model_path)
    print("Keras 3 loaded successfully")
except Exception as e:
    print("Keras 3 failed:", e)
