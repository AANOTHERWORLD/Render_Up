# Architectural Photo Regenerator

Turn architectural renderings into photoreal images with improved lighting and material realism, while preserving geometry via depth guidance.

## What is included

- `frontend` Next.js app with a simple UI: upload, select lighting preset, strength, preserve toggle, size, compare slider.
- `backend` TypeScript HTTP server (no Express) calling Replicate:
  - Depth Anything V2 for depth
  - SDXL ControlNet Depth for faithful regeneration

## Environment variables

Example settings are provided in `.env.example` files for both the backend and frontend.

**Backend**

- `REPLICATE_API_TOKEN` – required API token for Replicate
- `REPLICATE_DEPTH_MODEL` – optional depth model override
- `REPLICATE_CONTROLNET_DEPTH_MODEL` – optional ControlNet model override
- `PORT` – optional port (defaults to `8787`)
- `ALLOWED_ORIGIN` – optional CORS origin (defaults to `http://localhost:3000`)

**Frontend**

- `NEXT_PUBLIC_API_BASE_URL` – URL for the backend server

## Local run

1. Backend
   ```bash
   cd backend
   cp .env.example .env
   # configure PORT, ALLOWED_ORIGIN, REPLICATE_API_TOKEN and model IDs
   npm install
   npm run build
   npm start
   ```

2. Frontend
   ```bash
   cd frontend
   cp .env.example .env.local
   # set NEXT_PUBLIC_API_BASE_URL to your backend URL
   npm install
   npm run dev
   ```

3. Open http://localhost:3000 and try an image.

## Deploy

- Backend on Railway. Set the environment variables described above.
- Frontend on Vercel. Set `NEXT_PUBLIC_API_BASE_URL` to the Railway service URL.

## Notes

- Model versions are pinned in `backend/.env.example` for reproducibility.
- Logs include a request id and timing for debugging.
