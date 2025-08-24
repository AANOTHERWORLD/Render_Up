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
- `REPLICATE_DEPTH_MODEL` – optional depth model override. If the value omits a
  version, the backend resolves the latest model version automatically. The
  default is `chenxwh/depth-anything-v2:b239ea33cff32bb7abb5db39ffe9a09c14cbc2894331d1ef66fe096eed88ebd4`.

- `REPLICATE_CONTROLNET_DEPTH_MODEL` – optional ControlNet model override. A
  fully qualified `owner/model:version` reference avoids Replicate API 404s.
  Defaults to
  `lucataco/sdxl-controlnet-depth:465fb41789dc2203a9d7158be11d1d2570606a039c65e0e236fd329b5eecb10c`.
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

