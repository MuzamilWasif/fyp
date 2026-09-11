"""VigilantEye detection engine.

Pipeline per camera (RTSP url, video file, or webcam index):
  frame -> YOLOv8 object detection + MediaPipe head-pose behavior analysis
        -> multi-frame repeated-error validation (suppresses false positives)
        -> rolling-buffer evidence clip saved on confirmation
        -> alert POSTed to backend (severity scored server-side)
Annotated frames are also served as MJPEG at :8090/stream/<camera_id>
for the portal's Live Monitoring page.
"""
import time
import cv2
import requests
import config
import stream_server
from detector import UFMDetector
from behavior import BehaviorAnalyzer
from evidence_capture import EvidenceCapture

COLORS = {"mobile_phone": (60, 60, 245), "notes": (0, 165, 255),
          "electronic_device": (255, 120, 0), "looking_around": (0, 220, 255)}


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


def annotate(frame, results, model_names):
    for box in results.boxes:
        cls_name = model_names[int(box.cls[0])]
        if cls_name not in config.UFM_CLASSES:
            continue
        label = config.UFM_CLASSES[cls_name]
        conf = float(box.conf[0])
        x1, y1, x2, y2 = map(int, box.xyxy[0])
        color = COLORS.get(label, (163, 230, 53))
        cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
        cv2.putText(frame, f"{label} {conf:.2f}", (x1, max(y1 - 8, 12)),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.55, color, 2)
    return frame


def open_source(src: str):
    return cv2.VideoCapture(int(src)) if src.isdigit() else cv2.VideoCapture(src)


def main():
    detector = UFMDetector()
    behavior = BehaviorAnalyzer()
    capture = EvidenceCapture()
    stream_server.start(config.STREAM_PORT)

    caps = {cam: open_source(src) for cam, src in config.CAMERAS.items()}
    print(f"VigilantEye detection engine started. Cameras: {list(caps)}")

    while True:
        for cam, cap in caps.items():
            ok, frame = cap.read()
            if not ok:
                cap.release()
                caps[cam] = open_source(config.CAMERAS[cam])
                continue
            capture.push(cam, frame)

            events, results = detector.process_frame(cam, frame)
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            behavior_events = behavior.process_frame(cam, rgb)
            for ev in behavior_events:
                ev["frames"] = 10
            all_events = (events or []) + behavior_events

            annotated = annotate(frame.copy(), results, detector.model.names)
            cv2.putText(annotated, f"{cam}  {time.strftime('%H:%M:%S')}", (10, 24),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (163, 230, 53), 2)
            stream_server.update(cam, annotated)

            for ev in all_events:
                clip = capture.save_clip(cam, ev["label"])
                post_alert(cam, ev["label"], ev["confidence"], ev.get("frames", 1), clip)
        time.sleep(0.03)


if __name__ == "__main__":
    main()
