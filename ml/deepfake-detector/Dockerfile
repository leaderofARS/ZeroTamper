FROM python:3.10-slim

WORKDIR /app

# Install system dependencies for OpenCV and TensorFlow
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5001

# Run with Gunicorn for production
CMD ["gunicorn", "--bind", "0.0.0.0:5001", "main:app", "--timeout", "120"]
