import os
os.environ["TF_USE_LEGACY_KERAS"] = "1"
import tensorflow as tf
import tf_keras

model_path = "/home/ars0x01/.cache/kagglehub/models/aestroe/deepfake-detection/tensorFlow2/default/1/image/XceptionModel.keras"

try:
    model1 = tf.keras.models.load_model(model_path)
    print("tf.keras loaded successfully")
except Exception as e:
    print("tf.keras failed:", e)

try:
    model2 = tf_keras.models.load_model(model_path)
    print("tf_keras loaded successfully")
except Exception as e:
    print("tf_keras failed:", e)
