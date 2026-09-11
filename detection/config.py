import os

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")
EVIDENCE_DIR = os.getenv("EVIDENCE_DIR", "../evidence_store")

# camera_id -> RTSP url or video file path or webcam index ("0")
CAMERAS = {
    "CAM-A101-1": os.getenv("CAM_SOURCE", "0"),
}
ROOM_MAP = {"CAM-A101-1": "A-101"}

# YOLO classes considered UFM-relevant (COCO names until fine-tuned model is ready)
UFM_CLASSES = {"cell phone": "mobile_phone", "book": "notes", "laptop": "electronic_device"}

CONFIDENCE_THRESHOLD = 0.45
# repeated error validation: same label must persist N frames within window before alerting
CONFIRM_FRAMES = 8
CONFIRM_WINDOW_SEC = 5
ALERT_COOLDOWN_SEC = 60          # per camera+label
CLIP_SECONDS = 12                # evidence clip length
