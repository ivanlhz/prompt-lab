from abc import ABC, abstractmethod
from dataclasses import dataclass
from pathlib import Path
from typing import Any


@dataclass
class ProviderResult:
    image_data: bytes
    image_format: str  # "png", "jpg", etc.
    response_meta: dict[str, Any]


@dataclass
class ProviderConfig:
    model: str
    normalized_params: dict[str, Any]
    extra_params: dict[str, Any]


class ImageProvider(ABC):
    """Contract that every provider must implement."""

    @property
    @abstractmethod
    def name(self) -> str:
        ...

    @property
    @abstractmethod
    def available_models(self) -> list[str]:
        ...

    @abstractmethod
    async def process(
        self,
        image_paths: list[Path] | None,
        prompt: str,
        config: ProviderConfig,
    ) -> ProviderResult:
        ...
