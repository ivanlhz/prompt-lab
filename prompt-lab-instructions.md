# Prompt Lab — Instrucciones para Claude Code

## Qué es
Un laboratorio local para probar y comparar prompts de restauración/generación de imágenes contra múltiples proveedores de IA. Permite lanzar N prompts contra una misma imagen de referencia, ver resultados lado a lado, puntuar y acumular conocimiento sobre qué funciona mejor.

## Stack
- **Backend:** FastAPI (Python 3.12+)
- **Frontend:** React + Vite + TypeScript + TailwindCSS
- **Base de datos:** SQLite (via SQLAlchemy async + aiosqlite)
- **Imágenes:** Filesystem local

## Estructura del proyecto

```
prompt-lab/
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI app, CORS, lifespan
│   │   ├── config.py                # Settings (paths, DB URL, API keys via env)
│   │   ├── database.py              # SQLAlchemy async engine + session
│   │   ├── models/                  # SQLAlchemy ORM models
│   │   │   ├── experiment.py        # Experiment model
│   │   │   └── trial.py             # Trial model
│   │   ├── schemas/                 # Pydantic schemas (request/response)
│   │   │   ├── experiment.py
│   │   │   └── trial.py
│   │   ├── routers/                 # API endpoints
│   │   │   ├── experiments.py       # CRUD experiments
│   │   │   └── trials.py           # CRUD trials + ejecutar prompt
│   │   ├── providers/               # Adapter pattern para proveedores
│   │   │   ├── base.py             # Protocolo/ABC base
│   │   │   ├── registry.py         # Registry de proveedores disponibles
│   │   │   ├── gemini.py           # Adapter Gemini
│   │   │   └── openai.py           # Adapter OpenAI (placeholder)
│   │   └── services/
│   │       ├── experiment_service.py
│   │       └── trial_service.py
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── api/                     # API client
│   │   │   └── client.ts
│   │   ├── components/
│   │   │   ├── ExperimentList.tsx    # Lista de experimentos
│   │   │   ├── ExperimentDetail.tsx  # Detalle + grid de trials
│   │   │   ├── TrialCard.tsx         # Card con resultado + score
│   │   │   ├── PromptEditor.tsx      # Editor de prompt + params
│   │   │   ├── ImageUploader.tsx     # Upload imagen referencia
│   │   │   └── ComparisonGrid.tsx    # Grid lado a lado de resultados
│   │   ├── hooks/
│   │   │   └── useExperiments.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   └── lib/
│   │       └── utils.ts
│   ├── package.json
│   └── vite.config.ts
├── data/                             # Gitignored — datos locales
│   ├── lab.db                        # SQLite
│   └── experiments/                  # Imágenes
│       └── {experiment_id}/
│           ├── reference.{ext}
│           └── trials/
│               └── {trial_id}/
│                   └── result.{ext}
└── README.md
```

## Modelo de datos (SQLite)

### Experiment
| Campo | Tipo | Notas |
|-------|------|-------|
| id | TEXT (UUID corto, 8 chars) | PK |
| name | TEXT | Nombre descriptivo |
| description | TEXT | Nullable, contexto del experimento |
| reference_image_path | TEXT | Path relativo a data/experiments/ |
| created_at | DATETIME | |
| updated_at | DATETIME | |

### Trial
| Campo | Tipo | Notas |
|-------|------|-------|
| id | TEXT (UUID corto, 8 chars) | PK |
| experiment_id | TEXT | FK → Experiment |
| prompt | TEXT | Prompt EXACTO enviado a la API |
| provider | TEXT | "gemini", "openai", etc. |
| model | TEXT | Modelo específico, ej: "gemini-2.0-flash" |
| normalized_params | JSON | {temperature, quality, etc.} normalizados |
| extra_params | JSON | Params específicos del proveedor |
| response_meta | JSON | Metadata cruda de la respuesta API |
| result_image_path | TEXT | Path relativo, nullable hasta completar |
| score | INTEGER | Nullable, 1-5, puntuación manual |
| notes | TEXT | Nullable |
| status | TEXT | "pending", "running", "completed", "failed" |
| error_message | TEXT | Nullable, si falló |
| duration_ms | INTEGER | Tiempo de ejecución |
| created_at | DATETIME | |

## Provider: contrato base (ABC)

```python
from abc import ABC, abstractmethod
from dataclasses import dataclass
from pathlib import Path
from typing import Any

@dataclass
class ProviderResult:
    image_data: bytes           # Imagen resultado en bytes
    image_format: str           # "png", "jpg", etc.
    response_meta: dict[str, Any]  # Metadata cruda de la API

@dataclass
class ProviderConfig:
    model: str
    normalized_params: dict[str, Any]   # temperature, quality, etc.
    extra_params: dict[str, Any]        # Específicos del proveedor

class ImageProvider(ABC):
    """Contrato que todo proveedor debe implementar."""
    
    @property
    @abstractmethod
    def name(self) -> str:
        """Identificador del proveedor: 'gemini', 'openai', etc."""
        ...
    
    @property
    @abstractmethod
    def available_models(self) -> list[str]:
        """Modelos disponibles para este proveedor."""
        ...

    @abstractmethod
    async def process(
        self,
        image_path: Path,
        prompt: str,
        config: ProviderConfig,
    ) -> ProviderResult:
        """Envía imagen + prompt y devuelve resultado."""
        ...
```

## Provider Registry

```python
class ProviderRegistry:
    """Registro central de proveedores disponibles."""
    
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
    def list_available(cls) -> list[dict]:
        return [
            {"name": p.name, "models": p.available_models}
            for p in cls._providers.values()
        ]
```

## API Endpoints

### Experiments
- `GET /api/experiments` — Lista todos
- `POST /api/experiments` — Crea uno (multipart: name, description, reference_image)
- `GET /api/experiments/{id}` — Detalle con trials
- `DELETE /api/experiments/{id}` — Borra experimento + archivos

### Trials
- `POST /api/experiments/{id}/trials` — Crea y ejecuta trial (prompt, provider, model, params)
- `POST /api/experiments/{id}/trials/batch` — Ejecuta múltiples trials en paralelo (lista de prompts/configs)
- `PATCH /api/trials/{id}` — Actualiza score/notes
- `DELETE /api/trials/{id}` — Borra trial

### Providers
- `GET /api/providers` — Lista proveedores disponibles y sus modelos

### Images (servir estáticos)
- `GET /api/images/{path}` — Sirve imágenes desde data/experiments/

## Concurrencia para batch

Cuando se lanzan múltiples trials, usar `asyncio.Semaphore(3)` para limitar concurrencia y no comer rate limits. El endpoint batch debe devolver inmediatamente los IDs de los trials creados (status: "pending") y procesarlos en background tasks de FastAPI.

## Frontend: flujo principal

1. **Pantalla inicio:** Lista de experimentos (cards con thumbnail de referencia, nº trials, fecha)
2. **Crear experimento:** Upload imagen referencia + nombre + descripción
3. **Detalle experimento:** 
   - Imagen de referencia prominente arriba
   - Editor de prompt con selector de provider/modelo y params
   - Botón "Run" (single) y "Run Batch" (múltiples prompts)
   - Grid de resultados (TrialCards) ordenables por score/fecha
   - Cada TrialCard muestra: imagen resultado, prompt usado, provider, score (editable), notas
4. **Comparación:** Poder seleccionar 2-4 trials y verlos lado a lado en una vista limpia

## Config / Env

```env
# .env.example
GEMINI_API_KEY=your-key-here
OPENAI_API_KEY=your-key-here
DATA_DIR=./data
DATABASE_URL=sqlite+aiosqlite:///./data/lab.db
MAX_CONCURRENT_TRIALS=3
```

## Notas de implementación

- Las rutas de imágenes en BD son SIEMPRE relativas al DATA_DIR, nunca absolutas
- Usar Pillow para validar/redimensionar imágenes al subir si es necesario
- El frontend hace polling o usa SSE para actualizar status de trials en batch
- SQLAlchemy en modo async con aiosqlite
- Pydantic v2 para schemas
- CORS habilitado para localhost (dev)

## Proveedor Gemini (primer adapter)

Usa el SDK `google-genai` (nueva versión, no `google-generativeai`). La API de Gemini para edición de imagen funciona enviando la imagen como Part junto al prompt, pidiendo respuesta con imagen. Guardar en response_meta: modelo usado, tokens consumidos, finish_reason, y cualquier metadata que devuelva la API.

## Lo que NO hace falta ahora
- Auth (es local)
- Docker (es local)
- Tests (primera iteración)
- Deploy

## Orden de implementación sugerido
1. Backend: models + database + config
2. Backend: provider base + Gemini adapter
3. Backend: services + routers
4. Frontend: scaffold + API client
5. Frontend: ExperimentList + crear experimento
6. Frontend: ExperimentDetail + ejecutar trial
7. Frontend: ComparisonGrid + scoring
