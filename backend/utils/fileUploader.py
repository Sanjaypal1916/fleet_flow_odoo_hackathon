


import os
import uuid
from fastapi import UploadFile, HTTPException
import time
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent.parent.parent
MEDIA_DIR = BASE_DIR / "media"

IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}
VIDEO_EXTENSIONS = {".mp4", ".mov", ".avi", ".mkv"}

class FileUploadService:

    @staticmethod
    def generate_media_filename(
    file: UploadFile,
    entity: str,        # "user", "product", "order"
    entity_id: int,     # 42
    sequence_id: int | None = None
        ) -> str:
        if not file or not file.filename:
            raise HTTPException(status_code=400, detail="Invalid file")

        ext = Path(file.filename).suffix.lower()
        if not ext:
            raise HTTPException(status_code=400, detail="File has no extension")

        timestamp = int(time.time())

        if sequence_id is not None:
            return f"{entity}_{entity_id}_{sequence_id}_{timestamp}{ext}"

        return f"{entity}_{entity_id}_{timestamp}{ext}"


    @staticmethod
    def save_media_file(
        file: UploadFile,
        filename: str
    ) -> dict:
        ext = Path(filename).suffix.lower()

        if ext in IMAGE_EXTENSIONS:
            media_type = "image"
            subdir = "images"
        elif ext in VIDEO_EXTENSIONS:
            media_type = "video"
            subdir = "videos"
        else:
            raise HTTPException(status_code=400, detail="Unsupported file type")

        upload_dir = MEDIA_DIR / subdir
        upload_dir.mkdir(parents=True, exist_ok=True)

        file_path = upload_dir / filename

        with open(file_path, "wb") as buffer:
            while chunk := file.file.read(1024 * 1024):
                buffer.write(chunk)

        return {
            "file_name": filename,
            "file_path": str(file_path),
            "media_type": media_type
        }
