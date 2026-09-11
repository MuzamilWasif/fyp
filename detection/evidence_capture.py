"""Rolling frame buffer per camera; writes a short evidence clip when an event confirms."""
import os, time
from collections import deque
import cv2
import config


class EvidenceCapture:
    def __init__(self, fps: int = 15):
        self.fps = fps
        self.buffers = {}
        os.makedirs(config.EVIDENCE_DIR, exist_ok=True)

    def push(self, camera_id: str, frame):
        buf = self.buffers.setdefault(camera_id, deque(maxlen=self.fps * config.CLIP_SECONDS))
        buf.append(frame.copy())

    def save_clip(self, camera_id: str, label: str) -> str:
        buf = self.buffers.get(camera_id)
        if not buf:
            return ""
        ts = time.strftime("%Y%m%d_%H%M%S")
        fname = f"{camera_id}_{label}_{ts}.mp4"
        path = os.path.join(config.EVIDENCE_DIR, fname)
        h, w = buf[0].shape[:2]
        writer = cv2.VideoWriter(path, cv2.VideoWriter_fourcc(*"mp4v"), self.fps, (w, h))
        for f in list(buf):
            writer.write(f)
        writer.release()
        return path
