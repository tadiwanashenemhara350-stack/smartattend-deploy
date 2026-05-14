#!/bin/bash
set -e

echo "Starting SmartAttend Backend Services..."

# Run migrations/seeding if needed
# If we have a DATABASE_URL, seed_system.py will use it automatically.
# We run it here at runtime instead of build time for persistence support.
export PYTHONPATH=$PYTHONPATH:$(pwd)
python ml/seed_system.py

echo "Launching Uvicorn on port ${PORT:-10000}..."
exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-10000}
