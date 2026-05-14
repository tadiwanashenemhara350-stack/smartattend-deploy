#!/bin/bash
set -e

echo "Starting SmartAttend Backend Services..."

export PYTHONPATH=$PYTHONPATH:$(pwd)

# Simple check to see if we can connect to the database
echo "Checking database connection..."
python -c "from database import engine; conn = engine.connect(); conn.close(); print('Database connection successful.')" || { echo 'Database connection failed! Check DATABASE_URL env var.'; exit 1; }

echo "Launching Uvicorn on port ${PORT:-10000}..."
exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-10000}
