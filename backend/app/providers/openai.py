from pathlib import Path

from app.providers.base import ImageProvider, ProviderConfig, ProviderResult


class OpenAIProvider(ImageProvider):
    """Placeholder — not yet implemented."""

    @property
    def name(self) -> str:
        return "openai"

    @property
    def available_models(self) -> list[str]:
        return ["gpt-image-1"]

    async def process(
        self,
        image_paths: list[Path] | None,
        prompt: str,
        config: ProviderConfig,
    ) -> ProviderResult:
        raise NotImplementedError("OpenAI provider not yet implemented")
