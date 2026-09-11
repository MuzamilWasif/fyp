"""Serverless entrypoint with self-diagnosis.
Vercel requires a top-level `app` variable; _load() provides either the real
application or, if startup fails, a fallback that prints the full traceback."""
import os, sys, traceback

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("EVIDENCE_DIR", "/tmp/evidence_store")


def _load():
    try:
        from app.main import app as fastapi_app
        return fastapi_app
    except BaseException:
        tb = traceback.format_exc()
        info = f"python={sys.version}\ncwd={os.getcwd()}\n\n{tb}"
        print(info)

        async def fallback(scope, receive, send):
            if scope["type"] != "http":
                return
            body = ("VIGILANTEYE STARTUP ERROR\n\n" + info).encode()
            await send({"type": "http.response.start", "status": 500,
                        "headers": [(b"content-type", b"text/plain; charset=utf-8")]})
            await send({"type": "http.response.body", "body": body})
        return fallback


app = _load()
