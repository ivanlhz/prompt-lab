from app.providers.base import ImageProvider


class ProviderRegistry:
    """Central registry of available providers."""

    _providers: dict[str, ImageProvider] = {}

    @classmethod
    def register(cls, provider: ImageProvider):
        cls._providers[provider.name] = provider

    @classmethod
    def get(cls, name: str) -> ImageProvider:
        if name not in cls._providers:
            raise ValueError(f"Provider '{name}' not registered")
        return cls._providers[name]

    @classmethod
    def clear(cls):
        cls._providers.clear()

    @classmethod
    def list_available(cls) -> list[dict]:
        return [
            {"name": p.name, "models": p.available_models}
            for p in cls._providers.values()
        ]
