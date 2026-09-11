"""Lightweight MJPEG streaming server so the portal can show live annotated feeds.

Serves http://<host>:8090/stream/<camera_id> as multipart JPEG.
The detection loop pushes annotated frames via update(camera_id, frame).
"""
import threading, time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import cv2

_frames = {}
_lock = threading.Lock()


def update(camera_id: str, frame):
    ok, jpg = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
    if ok:
        with _lock:
            _frames[camera_id] = jpg.tobytes()


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def do_GET(self):
        if not self.path.startswith("/stream/"):
            self.send_response(404); self.end_headers()
            return
        cam = self.path.split("/stream/", 1)[1]
        self.send_response(200)
        self.send_header("Content-Type", "multipart/x-mixed-replace; boundary=frame")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        try:
            while True:
                with _lock:
                    data = _frames.get(cam)
                if data:
                    self.wfile.write(b"--frame\r\nContent-Type: image/jpeg\r\n\r\n")
                    self.wfile.write(data)
                    self.wfile.write(b"\r\n")
                time.sleep(1 / 12)
        except (BrokenPipeError, ConnectionResetError):
            pass


def start(port: int = 8090):
    server = ThreadingHTTPServer(("0.0.0.0", port), Handler)
    t = threading.Thread(target=server.serve_forever, daemon=True)
    t.start()
    print(f"MJPEG stream server on :{port} (/stream/<camera_id>)")
    return server
