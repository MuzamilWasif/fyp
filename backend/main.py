"""Standalone entrypoint for serverless platforms (Vercel).
Loads the FastAPI application as a proper package so relative imports work."""
import os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("EVIDENCE_DIR", "/tmp/evidence_store")

from app.main import app  # noqa: F401,E402
