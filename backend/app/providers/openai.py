import asyncio
import base64
from pathlib import Path
from typing import Any, Literal

from openai import OpenAI

from app.config import settings
from app.providers.base import ImageProvider, ProviderConfig, ProviderResult

_OPENAI_SIZE = Literal["1024x1024", "1536x1024", "1024x1536", "auto"]
_OPENAI_OUTPUT_FORMAT = Literal["png", "jpeg", "webp"]


def _normalize_output_format(value: Any) -> str:
    v = str(value or "").strip().lower()
    if v in ("jpg", "jpeg"):
        return "jpeg"
    if v in ("png", "webp"):
        return v
    return "png"


def _normalize_size(value: Any) -> str:
    v = str(value or "").strip().lower()
    if v in ("1024x1024", "1536x1024", "1024x1536", "auto"):
        return v

    # Tolerate app-level presets seen in other providers.
    # - pyapi uses "1K" as default
    if v in ("1k", "1024"):
        return "1024x1024"
    if v in ("portrait", "9:16"):
        return "1024x1536"
    if v in ("landscape", "16:9"):
        return "1536x1024"
    if v in ("square", "1:1"):
        return "1024x1024"

    return "auto"


def _size_from_aspect_ratio(value: Any) -> str | None:
    v = str(value or "").strip().lower()
    if v in ("1:1", "square"):
        return "1024x1024"
    if v in ("16:9", "landscape"):
        return "1536x1024"
    if v in ("9:16", "portrait"):
        return "1024x1536"
    return None


class OpenAIProvider(ImageProvider):
    def __init__(self):
        self._client = OpenAI(api_key=settings.OPENAI_API_KEY)

    @property
    def name(self) -> str:
        return "openai"

    @property
    def available_models(self) -> list[str]:
        return ["gpt-image-1", "gpt-image-2"]

    def _build_image_params(self, config: ProviderConfig) -> dict[str, Any]:
        params: dict[str, Any] = {}

        # normalized_params (portable across providers)
        normalized = config.normalized_params or {}
        size = _normalize_size(normalized.get("image_size"))
        if size == "auto":
            inferred = _size_from_aspect_ratio(normalized.get("aspect_ratio"))
            if inferred:
                size = inferred
        params["size"] = size  # OpenAI supports "auto" as well

        # extra_params (provider-specific passthrough)
        extra = config.extra_params or {}
        if "quality" in extra:
            params["quality"] = extra["quality"]
        if "background" in extra:
            params["background"] = extra["background"]
        if "output_format" in extra:
            params["output_format"] = _normalize_output_format(extra["output_format"])
        if "output_compression" in extra:
            params["output_compression"] = extra["output_compression"]
        if "input_fidelity" in extra:
            params["input_fidelity"] = extra["input_fidelity"]

        # Default output format to png to match the rest of the app.
        params.setdefault("output_format", "png")
        return params

    async def process(
        self,
        image_paths: list[Path] | None,
        prompt: str,
        config: ProviderConfig,
    ) -> ProviderResult:
        if not settings.OPENAI_API_KEY:
            raise RuntimeError("OPENAI_API_KEY is not configured")
        if not prompt.strip():
            raise RuntimeError("Prompt is empty")

        params = self._build_image_params(config)

        def _call_sync():
            if image_paths:
                files = [p.open("rb") for p in image_paths]
                try:
                    return self._client.images.edit(
                        model=config.model,
                        image=files,
                        prompt=prompt,
                        **params,
                    )
                finally:
                    for f in files:
                        try:
                            f.close()
                        except Exception:
                            pass
            return self._client.images.generate(
                model=config.model,
                prompt=prompt,
                **params,
            )

        result = await asyncio.to_thread(_call_sync)

        data = getattr(result, "data", None) or []
        if not data:
            raise RuntimeError("OpenAI returned no image data")
        first = data[0]
        b64 = getattr(first, "b64_json", None)
        if not b64:
            raise RuntimeError("OpenAI response missing b64_json")

        image_bytes = base64.b64decode(b64)
        output_format = _normalize_output_format(params.get("output_format"))
        image_format = "jpg" if output_format == "jpeg" else output_format

        meta: dict[str, Any] = {
            "provider": "openai",
            "model": config.model,
            "size": params.get("size"),
            "output_format": output_format,
        }
        created = getattr(result, "created", None)
        if created is not None:
            meta["created"] = created
        usage = getattr(result, "usage", None)
        if usage is not None:
            try:
                meta["usage"] = usage.model_dump()
            except Exception:
                meta["usage"] = str(usage)

        return ProviderResult(
            image_data=image_bytes,
            image_format=image_format,
            response_meta=meta,
        )
