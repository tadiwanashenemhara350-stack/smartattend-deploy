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
        RUN python backend/ml/train_model.py
        RUN cd backend && FORCE_RESEED=true python ml/seed_system.py
        RUN cd backend && python -c "from database import SessionLocal; from models import User; from utils import get_password_hash; db=SessionLocal(); not db.query(User).filter_by(email='admin@gmail.com').first() and db.add(User(email='admin@gmail.com', password_hash=get_password_hash('admin1234'), role='super_admin', full_name='System Admin')); db.commit()"
        RUN cd backend && python -c "from database import SessionLocal; from models import User; from utils import get_password_hash; db=SessionLocal(); s=get_password_hash('students1234'); l=get_password_hash('lecturer1234'); db.query(User).filter_by(role='student').update({'password_hash': s}); db.query(User).filter_by(role='lecturer').update({'password_hash': l}); db.commit()"
        COPY --from=frontend-build /app/frontend/dist ./frontend/dist
        COPY --from=frontend-build /app/frontend/public ./frontend/public

        EXPOSE 10000

        CMD ["sh", "-c", "cd /app/backend && uvicorn main:app --host 0.0.0.0 --port ${PORT:-10000}"]
        
