# Contribuir a Prompt Lab

1. **Fork** el repositorio y clónalo en local.
2. **Instala** dependencias:
   ```bash
   pnpm run install:all
   ```
3. **Configura** el backend: copia `backend/.env.example` a `backend/.env` y añade al menos una API key (p. ej. `GEMINI_API_KEY`).
4. **Desarrollo**: desde la raíz, `pnpm run dev` levanta API y frontend; o usa `pnpm run dev:backend` y `pnpm run dev:frontend` en terminales separadas.
5. **Cambios**: haz los cambios en una rama, asegura que `pnpm run build` pase y abre un PR.

Si añades dependencias: en el backend usa `uv add <pkg>` dentro de `backend/`; en el frontend usa `pnpm add <pkg>` dentro de `frontend/`.
