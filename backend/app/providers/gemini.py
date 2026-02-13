import base64
from pathlib import Path
from typing import Any

from google import genai
from google.genai import types

from app.config import settings
from app.providers.base import ImageProvider, ProviderConfig, ProviderResult

_SAFETY_SETTINGS = [
    types.SafetySetting(
        category="HARM_CATEGORY_HARASSMENT",
        threshold="BLOCK_ONLY_HIGH",
    ),
    types.SafetySetting(
        category="HARM_CATEGORY_HATE_SPEECH",
        threshold="BLOCK_ONLY_HIGH",
    ),
    types.SafetySetting(
        category="HARM_CATEGORY_SEXUALLY_EXPLICIT",
        threshold="BLOCK_ONLY_HIGH",
    ),
    types.SafetySetting(
        category="HARM_CATEGORY_DANGEROUS_CONTENT",
        threshold="BLOCK_ONLY_HIGH",
    ),
]


class GeminiProvider(ImageProvider):
    def __init__(self):
        http_options = None
        if settings.GEMINI_API_BASE_URL:
            http_options = types.HttpOptions(base_url=settings.GEMINI_API_BASE_URL)
        self._client = genai.Client(
            api_key=settings.GEMINI_API_KEY,
            http_options=http_options,
        )

    @property
    def name(self) -> str:
        return "gemini"

    @property
    def available_models(self) -> list[str]:
        return ["gemini-2.5-flash-image", "gemini-3-pro-image-preview"]

    async def process(
        self,
        image_path: Path,
        prompt: str,
        config: ProviderConfig,
    ) -> ProviderResult:
        image_bytes = image_path.read_bytes()
        mime = f"image/{image_path.suffix.lstrip('.').replace('jpg', 'jpeg')}"

        image_part = types.Part.from_bytes(data=image_bytes, mime_type=mime)
        text_part = types.Part.from_text(text=prompt)

        # Build image_config (aspect_ratio, image_size)
        aspect_ratio = config.normalized_params.get("aspect_ratio")
        image_size = config.normalized_params.get("image_size")

        image_config_kwargs: dict[str, Any] = {}
        if aspect_ratio:
            image_config_kwargs["aspect_ratio"] = aspect_ratio
        if image_size:
            image_config_kwargs["image_size"] = image_size

        generation_config: dict[str, Any] = {
            "safety_settings": _SAFETY_SETTINGS,
        }
        if image_config_kwargs:
            generation_config["image_config"] = types.ImageConfig(**image_config_kwargs)

        if "temperature" in config.normalized_params:
            generation_config["temperature"] = config.normalized_params["temperature"]

        response = self._client.models.generate_content(
            model=config.model,
            contents=[image_part, text_part],
            config=types.GenerateContentConfig(**generation_config),
        )

        candidates = response.candidates or []
        if not candidates:
            raise RuntimeError("Gemini response has no candidates")

        first_candidate = candidates[0]
        content = first_candidate.content
        parts = content.parts if content and content.parts else []

        # Extract image from response
        for part in parts:
            if part.inline_data is not None:
                image_data = part.inline_data.data
                if isinstance(image_data, str):
                    image_data = base64.b64decode(image_data)
                image_format = part.inline_data.mime_type.split("/")[-1].replace(
                    "jpeg", "jpg"
                )

                meta: dict[str, Any] = {
                    "model": config.model,
                    "finish_reason": str(
                        first_candidate.finish_reason if first_candidate.finish_reason else None
                    ),
                }
                if response.usage_metadata:
                    meta["prompt_tokens"] = response.usage_metadata.prompt_token_count
                    meta["candidates_tokens"] = (
                        response.usage_metadata.candidates_token_count
                    )
                    meta["total_tokens"] = response.usage_metadata.total_token_count

                return ProviderResult(
                    image_data=image_data,
                    image_format=image_format,
                    response_meta=meta,
                )

        raise RuntimeError("Gemini response did not contain an image part")
