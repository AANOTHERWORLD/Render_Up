# Railway-friendly Dockerfile
FROM node:20-slim

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

EXPOSE 8787
CMD ["npm", "start"]
