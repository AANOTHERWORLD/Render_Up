# Architectural Photo Regenerator

Turn architectural renderings into photoreal images with improved lighting and material realism, while preserving geometry via depth guidance.

## What is included

- `frontend` Next.js app with a simple UI: upload, select lighting preset, strength, preserve toggle, size, compare slider.
- `backend` TypeScript Express server calling Replicate:
  - Depth Anything V2 for depth
  - SDXL ControlNet Depth for faithful regeneration

## Environment variables


**Backend**

- `REPLICATE_API_TOKEN` – required API token for Replicate
- `REPLICATE_DEPTH_MODEL` – optional depth model override (defaults to `nateraw/depth-anything-v2`)

- `REPLICATE_CONTROLNET_DEPTH_MODEL` – optional ControlNet model override
  (normalized to lowercase)
- `PORT` – optional port (defaults to `8787`)
- `ALLOWED_ORIGIN` – optional CORS origin; when unset all origins are allowed


**Frontend**

- `NEXT_PUBLIC_API_BASE_URL` – URL for the backend server

## Local run

1. Backend
   ```bash
   cd backend

   npm run build
   npm start
   ```

2. Frontend
   ```bash
   cd frontend

   npm install
   # create .env.local with NEXT_PUBLIC_API_BASE_URL
   npm run dev
   ```

3. Open http://localhost:3000 and try an image.

## Deploy

