import cv2
import numpy as np
from ultralytics import YOLO


class DetectionEngine:
    def __init__(self, model_path=None):
        if model_path:
            self.model = YOLO(model_path)
        else:
            self.model = YOLO("yolov8n.pt")

    def _load_image(self, image_bytes, grayscale=False):
        nparr = np.frombuffer(image_bytes, np.uint8)
        if grayscale:
            img = cv2.imdecode(nparr, cv2.IMREAD_GRAYSCALE)
        else:
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        return img

    def detect(self, image_bytes):
        img = self._load_image(image_bytes)
        results = self.model(img, verbose=False)[0]
        detections = []
        if results.boxes is not None:
            for box in results.boxes:
                detections.append({
                    "label": results.names[int(box.cls[0])],
                    "confidence": float(round(box.conf[0].item(), 4)),
                    "box": [float(round(x, 2)) for x in box.xyxy[0].tolist()],
                })
        return detections

    def detect_anomalies(self, image_bytes, expected_labels):
        detections = self.detect(image_bytes)
        detected_labels = {d["label"] for d in detections}
        missing = [l for l in expected_labels if l not in detected_labels]
        unexpected = [d for d in detections if d["label"] not in expected_labels]
        return {
            "detections": detections,
            "missing_expected": missing,
            "unexpected": unexpected,
            "anomaly": len(missing) > 0 or len(unexpected) > 0,
        }

    def compare(self, image1_bytes, image2_bytes):
        img1 = self._load_image(image1_bytes, grayscale=True)
        img2 = self._load_image(image2_bytes, grayscale=True)
        h, w = img1.shape
        img2 = cv2.resize(img2, (w, h))
        mse = np.mean((img1.astype(float) - img2.astype(float)) ** 2)
        similarity = round(1 / (1 + mse / 10000), 4)
        return similarity
