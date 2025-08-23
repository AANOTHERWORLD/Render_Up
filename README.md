# Architectural Photo Regenerator

Turn architectural renderings into photoreal images with improved lighting and material realism, while preserving geometry via depth guidance.

## What is included

- `frontend` Next.js app with a simple UI: upload, select lighting preset, strength, preserve toggle, size, compare slider.
- `backend` Node/Express TypeScript server calling Replicate:
  - Depth Anything V2 for depth
  - SDXL ControlNet Depth for faithful regeneration

## Local run

1. Backend
   ```bash
   cd backend
   cp .env.example .env
   # set REPLICATE_API_TOKEN
   npm install
   npm run dev
   ```

2. Frontend
   ```bash
   cd frontend
   cp .env.example .env.local
   npm install
   npm run dev
   ```

3. Open http://localhost:3000 and try an image.

## Deploy

- Backend on Railway. Set env vars from `.env.example`.
- Frontend on Vercel. Set `NEXT_PUBLIC_API_BASE_URL` to the Railway service URL.

## Notes

- Model versions are pinned in `.env.example` for reproducibility.
- Logs include a request id and timing for debugging.
