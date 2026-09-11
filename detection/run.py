"""Detection engine entry point.

Reads camera streams from config.CAMERAS (RTSP url, video file, or webcam index),
runs YOLOv8 object detection + MediaPipe behavior analysis with multi-frame
validation, saves an evidence clip, and posts a confirmed alert to the backend.
"""
import time
import cv2
import requests
import config
from detector import UFMDetector
from behavior import BehaviorAnalyzer
from evidence_capture import EvidenceCapture


def post_alert(camera_id: str, label: str, confidence: float, frames: int, evidence_path: str):
    try:
        requests.post(f"{config.BACKEND_URL}/api/alerts", json={
            "camera_id": camera_id,
            "room": config.ROOM_MAP.get(camera_id, ""),
            "label": label,
            "confidence": round(confidence, 3),
            "frame_count": frames,
            "evidence_path": evidence_path,
        }, timeout=5)
        print(f"[ALERT] {camera_id} {label} conf={confidence:.2f} -> backend")
    except requests.RequestException as e:
        print(f"[WARN] backend unreachable: {e}")


def open_source(src: str):
    return cv2.VideoCapture(int(src)) if src.isdigit() else cv2.VideoCapture(src)


def main():
    detector = UFMDetector()
    behavior = BehaviorAnalyzer()
    capture = EvidenceCapture()

    caps = {cam: open_source(src) for cam, src in config.CAMERAS.items()}
    print(f"VigilantEye detection engine started. Cameras: {list(caps)}")

    while True:
        for cam, cap in caps.items():
            ok, frame = cap.read()
            if not ok:
                # attempt reconnect for RTSP drops / loop video files
                cap.release()
                caps[cam] = open_source(config.CAMERAS[cam])
                continue
            capture.push(cam, frame)

            events, _ = detector.process_frame(cam, frame)
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            behavior_events = behavior.process_frame(cam, rgb)
            for ev in behavior_events:
                ev["frames"] = 10
            all_events = (events or []) + behavior_events

            for ev in all_events:
                clip = capture.save_clip(cam, ev["label"])
                post_alert(cam, ev["label"], ev["confidence"], ev.get("frames", 1), clip)
        time.sleep(0.03)


if __name__ == "__main__":
    main()
