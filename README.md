# Prompt Lab

Workspace para experimentar con prompts e imágenes: crea experimentos con una imagen de referencia, configura proveedores (Gemini, OpenAI, etc.) y lanza trials comparando resultados.

Si clonas desde cero, el repo incluye backend y frontend en uno. Si antes tenías `backend/` en otro repositorio, borra `backend/.git` para que todo sea un único repo.

## Estructura del repositorio

```
prompt-lab/
├── backend/          # API FastAPI (Python, uv)
├── frontend/         # UI React + Vite + Tailwind
├── package.json      # Scripts de desarrollo y build
└── pnpm-workspace.yaml
```

- **Backend**: FastAPI, SQLite, proveedores de imagen (Gemini, PyAPI, etc.), cola de trials.
- **Frontend**: React 19, React Router, Tailwind CSS v4, UI tipo VertexGuard (sidebar, experimentos, prompts, trials).

## Requisitos

- **Node.js** 20+ y **pnpm**
- **Python** 3.11+ y **uv** (o pip)

## Instalación

```bash
# Dependencias del workspace (frontend)
pnpm install

# Dependencias del backend (desde la raíz)
cd backend && uv sync && cd ..
```

## Variables de entorno (backend)

Copia el ejemplo y edita en `backend/`:

```bash
cp backend/.env.example backend/.env
```

Configura al menos una API key para generación (p. ej. `GEMINI_API_KEY`). El resto de variables están documentadas en `backend/.env.example`.

## Desarrollo

Desde la raíz del repo:

```bash
# Backend (API en http://localhost:8000)
pnpm run dev:backend

# Frontend (UI en http://localhost:5173) — en otra terminal
pnpm run dev:frontend
```

O ambos a la vez:

```bash
pnpm run dev
```

La UI por defecto apunta a `http://localhost:8000` para la API.

## Build

```bash
pnpm run build
```

Genera el frontend en `frontend/dist/`. El backend puede servir esos estáticos en producción si lo configuras (FastAPI `StaticFiles` desde `frontend/dist`).

## Licencia

MIT — ver [LICENSE](LICENSE).
