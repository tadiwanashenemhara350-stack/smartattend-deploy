FROM node:22-bookworm-slim AS frontend-build

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --legacy-peer-deps
COPY frontend/ ./
RUN npm run build

FROM python:3.10-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
        PORT=10000

        WORKDIR /app

        COPY backend/requirements.txt ./backend/requirements.txt
        RUN pip install --no-cache-dir -r ./backend/requirements.txt

        COPY backend/ ./backend/
        RUN chmod +x /app/backend/start.sh
        RUN python backend/ml/train_model.py

        COPY --from=frontend-build /app/frontend/dist ./frontend/dist
        COPY --from=frontend-build /app/frontend/public ./frontend/public

        EXPOSE 10000

        CMD ["/bin/sh", "/app/backend/start.sh"]
        
