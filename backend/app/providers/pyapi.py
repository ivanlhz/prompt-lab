import base64
import asyncio
import hashlib
import mimetypes
import time
from pathlib import Path
from urllib.parse import urlparse

import httpx

from app.config import settings
from app.providers.base import ImageProvider, ProviderConfig, ProviderResult


class PyApiProvider(ImageProvider):
    def __init__(self):
        self._base_url = settings.pyapi_base_url.rstrip("/")
        self._api_key = settings.pyapi_api_key

    @property
    def name(self) -> str:
        return "pyapi"

    @property
    def available_models(self) -> list[str]:
        return ["gemini-2.5-flash-image", "gemini-3-pro-image-preview"]

    def _map_image_model_to_task_type(self, model: str) -> str:
        # Based on PiAPI "Nano Banana Pro" docs.
        # We keep app model names for UX, but route to the supported PiAPI task type.
        model_map = {
            "gemini-2.5-flash-image": "nano-banana-pro",
            "gemini-3-pro-image-preview": "nano-banana-pro",
            "imagen-4.0-ultra-generate-001": "nano-banana-pro",
            "imagen-4.0-generate-001": "nano-banana-pro",
            "imagen-3.0-generate-002": "nano-banana-pro",
        }
        return model_map.get(model, "nano-banana-pro")

    def _to_base64(self, image_path: Path) -> str:
        raw = image_path.read_bytes()
        return base64.b64encode(raw).decode("ascii")

    async def _upload_to_cloudinary(self, image_path: Path) -> str:
        cloud_name = settings.CLOUDINARY_CLOUD_NAME
        api_key = settings.CLOUDINARY_API_KEY
        api_secret = settings.CLOUDINARY_API_SECRET
        folder = settings.CLOUDINARY_FOLDER.strip()

        if not (cloud_name and api_key and api_secret):
            raise RuntimeError("Cloudinary credentials are not configured")

        timestamp = str(int(time.time()))
        signature_params = {"timestamp": timestamp}
        if folder:
            signature_params["folder"] = folder
        sign_payload = "&".join(
            f"{k}={signature_params[k]}" for k in sorted(signature_params.keys())
        )
        signature = hashlib.sha1(f"{sign_payload}{api_secret}".encode("utf-8")).hexdigest()

        mime_type = mimetypes.guess_type(image_path.name)[0] or "application/octet-stream"
        upload_url = f"https://api.cloudinary.com/v1_1/{cloud_name}/image/upload"
        with image_path.open("rb") as image_file:
            files = {"file": (image_path.name, image_file, mime_type)}
            data = {
                "api_key": api_key,
                "timestamp": timestamp,
                "signature": signature,
            }
            if folder:
                data["folder"] = folder

            async with httpx.AsyncClient(timeout=60.0) as client:
                resp = await client.post(upload_url, data=data, files=files)
                if not resp.is_success:
                    raise RuntimeError(
                        f"Cloudinary upload failed: {resp.status_code} {resp.text[:500]}"
                    )
                payload = resp.json()
                secure_url = payload.get("secure_url")
                if not secure_url:
                    raise RuntimeError("Cloudinary upload returned no secure_url")
                return secure_url

    async def _upload_ephemeral_resource(self, image_path: Path) -> str:
        file_name = image_path.name
        if len(file_name) > 128:
            suffix = image_path.suffix or ".png"
            file_name = f"upload{suffix}"  # Keep valid extension while respecting max length.
        file_data = self._to_base64(image_path)

        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                settings.pyapi_upload_base_url,
                headers={
                    "Content-Type": "application/json",
                    "x-api-key": self._api_key,
                },
                json={
                    "file_name": file_name,
                    "file_data": file_data,
                },
            )
            if resp.status_code == 403:
                raise RuntimeError(
                    "PiAPI upload rejected (403). Ephemeral upload requires Creator plan or higher. "
                    "Configure Cloudinary to provide public URLs instead."
                )
            if not resp.is_success:
                raise RuntimeError(
                    f"PiAPI upload failed: {resp.status_code} {resp.text[:500]}"
                )
            payload = resp.json()
            url = payload.get("data", {}).get("url")
            if not url:
                raise RuntimeError("PiAPI upload returned no URL")
            return url

    async def _get_public_reference_url(self, image_path: Path) -> str:
        if settings.cloudinary_enabled:
            return await self._upload_to_cloudinary(image_path)
        return await self._upload_ephemeral_resource(image_path)

    async def _submit_task(self, payload: dict) -> str:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                self._base_url,
                headers={
                    "Content-Type": "application/json",
                    "x-api-key": self._api_key,
                },
                json=payload,
            )
            if not resp.is_success:
                try:
                    err_payload = resp.json()
                except Exception:
                    err_payload = None

                if isinstance(err_payload, dict):
                    data = err_payload.get("data")
                    logs = data.get("logs") if isinstance(data, dict) else None
                    if isinstance(logs, list):
                        log_text = " | ".join(str(item) for item in logs)
                        if "invalid image url" in log_text.lower():
                            raise RuntimeError(
                                "PiAPI rejected the reference image URL. "
                                "This endpoint requires PUBLIC image URLs in input.image_urls; "
                                "local files/data URLs are not supported."
                            )
                raise RuntimeError(
                    f"PiAPI submit failed: {resp.status_code} {resp.text[:500]}"
                )
            data = resp.json()
            task_id = data.get("data", {}).get("task_id")
            if not task_id:
                raise RuntimeError("PiAPI submit returned no task_id")
            return task_id

    async def _poll_task(self, task_id: str, max_attempts: int = 120) -> dict:
        async with httpx.AsyncClient(timeout=60.0) as client:
            for _ in range(max_attempts):
                # Poll every 5 seconds
                await asyncio.sleep(5)
                resp = await client.get(
                    f"{self._base_url}/{task_id}",
                    headers={"x-api-key": self._api_key},
                )
                if resp.status_code == 404:
                    continue
                if not resp.is_success:
                    raise RuntimeError(
                        f"PiAPI polling failed: {resp.status_code} {resp.text[:500]}"
                    )

                payload = resp.json()
                raw = payload.get("data") or payload
                status = str(raw.get("status", "")).lower()
                if status in {"success", "succeed", "completed"}:
                    return raw
                if status in {"failed", "error"}:
                    err = (
                        raw.get("error", {}).get("message")
                        if isinstance(raw.get("error"), dict)
                        else raw.get("error")
                    ) or raw.get("err_msg") or "PiAPI task failed"
                    raise RuntimeError(str(err))

        raise RuntimeError("PiAPI polling timed out")

    async def _download_image(self, image_url: str) -> tuple[bytes, str]:
        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.get(image_url)
            if not resp.is_success:
                raise RuntimeError(
                    f"PiAPI image download failed: {resp.status_code} {resp.text[:500]}"
                )
            content_type = (resp.headers.get("content-type") or "").lower()
            if "png" in content_type:
                fmt = "png"
            elif "jpeg" in content_type or "jpg" in content_type:
                fmt = "jpg"
            elif "webp" in content_type:
                fmt = "webp"
            else:
                path = urlparse(image_url).path.lower()
                if path.endswith(".png"):
                    fmt = "png"
                elif path.endswith(".webp"):
                    fmt = "webp"
                else:
                    fmt = "jpg"
            return resp.content, fmt

    async def process(
        self,
        image_paths: list[Path] | None,
        prompt: str,
        config: ProviderConfig,
    ) -> ProviderResult:
        if not self._api_key:
            raise RuntimeError("PIAPI/PYAPI key is not configured")

        if not image_paths:
            raise RuntimeError("PyAPI provider requires at least one reference image.")

        reference_image_urls: list[str] = []
        for image_path in image_paths:
            url = await self._get_public_reference_url(image_path)
            reference_image_urls.append(url)
        task_type = self._map_image_model_to_task_type(config.model)
        resolution = str(config.normalized_params.get("image_size", "1K")).upper()
        aspect_ratio = config.normalized_params.get("aspect_ratio")

        payload: dict = {
            "model": "gemini",
            "task_type": task_type,
            "input": {
                "prompt": prompt,
                "output_format": "png",
                "safety_level": "low",
                "resolution": resolution,
                "image_urls": reference_image_urls,
            },
        }
        # PiAPI Nano Banana Pro: for i2i (image_urls provided), aspect_ratio must be omitted.
        # It uses the input image aspect ratio automatically.
        if aspect_ratio and not payload["input"].get("image_urls"):
            payload["input"]["aspect_ratio"] = aspect_ratio

        task_id = await self._submit_task(payload)
        result = await self._poll_task(task_id)

        output = result.get("output") if isinstance(result.get("output"), dict) else {}
        works = output.get("works") or result.get("works") or []
        image_url: str | None = None
        if isinstance(works, list) and works:
            first = works[0]
            if isinstance(first, dict):
                image_url = (
                    first.get("image", {}).get("resource")
                    if isinstance(first.get("image"), dict)
                    else None
                ) or first.get("resource")
        if not image_url:
            image_url = output.get("image_url")
        if not image_url:
            image_urls = output.get("image_urls")
            if isinstance(image_urls, list) and image_urls:
                first_url = image_urls[0]
                if isinstance(first_url, str):
                    image_url = first_url
        if not image_url:
            raise RuntimeError("PiAPI returned no image URL")

        image_data, image_format = await self._download_image(image_url)
        return ProviderResult(
            image_data=image_data,
            image_format=image_format,
            response_meta={
                "provider": "pyapi",
                "model": config.model,
                "task_type": task_type,
                "task_id": task_id,
                "image_url": image_url,
            },
        )
