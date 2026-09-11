"""MediaPipe head-pose based behavior analysis: flags sustained looking-around."""
import time
from collections import deque, defaultdict
import numpy as np

try:
    import mediapipe as mp
    _mp_ok = True
except ImportError:
    _mp_ok = False

YAW_THRESHOLD_DEG = 35
CONFIRM_FRAMES = 10
WINDOW_SEC = 6
COOLDOWN_SEC = 90


class BehaviorAnalyzer:
    def __init__(self):
        self.enabled = _mp_ok
        if self.enabled:
            self.face_mesh = mp.solutions.face_mesh.FaceMesh(
                max_num_faces=10, refine_landmarks=False,
                min_detection_confidence=0.5, min_tracking_confidence=0.5)
        self.history = defaultdict(lambda: deque(maxlen=64))
        self.last_alert = {}

    def estimate_yaw(self, landmarks, w, h):
        # approximate yaw from nose tip vs eye midpoint horizontal offset
        nose = landmarks[1]
        left_eye = landmarks[33]
        right_eye = landmarks[263]
        eye_mid_x = (left_eye.x + right_eye.x) / 2
        eye_dist = abs(right_eye.x - left_eye.x) + 1e-6
        offset = (nose.x - eye_mid_x) / eye_dist
        return float(np.degrees(np.arctan(offset * 2)))

    def process_frame(self, camera_id: str, frame_rgb):
        if not self.enabled:
            return []
        h, w = frame_rgb.shape[:2]
        out = self.face_mesh.process(frame_rgb)
        if not out.multi_face_landmarks:
            return []
        now = time.time()
        confirmed = []
        for i, face in enumerate(out.multi_face_landmarks):
            yaw = self.estimate_yaw(face.landmark, w, h)
            if abs(yaw) < YAW_THRESHOLD_DEG:
                continue
            key = (camera_id, f"face{i}")
            hist = self.history[key]
            hist.append(now)
            recent = [t for t in hist if now - t <= WINDOW_SEC]
            if len(recent) >= CONFIRM_FRAMES and now - self.last_alert.get(key, 0) >= COOLDOWN_SEC:
                self.last_alert[key] = now
                hist.clear()
                confirmed.append({"label": "looking_around", "confidence": min(abs(yaw) / 90, 0.99)})
        return confirmed
