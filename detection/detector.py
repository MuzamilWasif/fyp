"""YOLOv8 object detection with multi-frame validation to suppress false positives."""
import time
from collections import deque, defaultdict
from ultralytics import YOLO
import config


class UFMDetector:
    def __init__(self, model_path: str = "yolov8n.pt"):
        self.model = YOLO(model_path)
        # (camera_id, label) -> deque of detection timestamps
        self.history = defaultdict(lambda: deque(maxlen=64))
        self.last_alert = {}

    def process_frame(self, camera_id: str, frame):
        """Returns list of confirmed events: [{label, confidence}]"""
        results = self.model(frame, verbose=False)[0]
        now = time.time()
        confirmed = []

        for box in results.boxes:
            cls_name = self.model.names[int(box.cls[0])]
            conf = float(box.conf[0])
            if cls_name not in config.UFM_CLASSES or conf < config.CONFIDENCE_THRESHOLD:
                continue
            label = config.UFM_CLASSES[cls_name]
            key = (camera_id, label)
            hist = self.history[key]
            hist.append(now)

            recent = [t for t in hist if now - t <= config.CONFIRM_WINDOW_SEC]
            if len(recent) >= config.CONFIRM_FRAMES:
                last = self.last_alert.get(key, 0)
                if now - last >= config.ALERT_COOLDOWN_SEC:
                    self.last_alert[key] = now
                    hist.clear()
                    confirmed.append({"label": label, "confidence": conf, "frames": len(recent)})
        return confirmed, results
