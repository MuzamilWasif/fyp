"""Serverless entrypoint with self-diagnosis: if the application fails to start,
every request returns the full startup traceback instead of a blank crash page."""
import os, sys, traceback

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("EVIDENCE_DIR", "/tmp/evidence_store")

try:
    from app.main import app  # noqa: F401
except BaseException:
    _tb = traceback.format_exc()
    _info = f"python={sys.version}\ncwd={os.getcwd()}\n\n{_tb}"
    print(_info)

    async def app(scope, receive, send):  # minimal raw ASGI fallback, zero dependencies
        if scope["type"] != "http":
            return
        body = ("VIGILANTEYE STARTUP ERROR\n\n" + _info).encode()
        await send({"type": "http.response.start", "status": 500,
                    "headers": [(b"content-type", b"text/plain; charset=utf-8")]})
        await send({"type": "http.response.body", "body": body})
