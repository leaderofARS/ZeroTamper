import os
os.environ["TF_USE_LEGACY_KERAS"] = "1"
import tensorflow as tf

model_path = "/home/ars0x01/.cache/kagglehub/models/aestroe/deepfake-detection/tensorFlow2/default/1/image/deepfake_detection_xception2.h5"

try:
    model1 = tf.keras.models.load_model(model_path)
    print("Keras 2 loaded h5 successfully")
except Exception as e:
    print("Keras 2 h5 failed:", e)
