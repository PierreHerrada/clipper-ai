#!/bin/bash
set -e

mkdir -p /app/logs

echo "Running database migrations..."
cd /app/backend
python -c "import asyncio; from migrate import run_migrations; import os; asyncio.run(run_migrations(os.environ['DATABASE_URL']))"

echo "Starting services..."
exec supervisord -n -c /etc/supervisor/conf.d/corsair.conf
