#!/bin/bash
echo "========================================"
echo "   SWAPLY - PYTHONANYWHERE DEPLOY"
echo "========================================"
echo

echo "[1/4] Pulling latest changes from GitHub..."
cd /home/AntonChudjak/svap
git pull origin main
if [ $? -ne 0 ]; then
    echo "ERROR: Git pull failed!"
    exit 1
fi
echo "✓ Changes pulled successfully!"

echo
echo "[2/4] Activating virtual environment..."
cd backend
source venv/bin/activate
if [ $? -ne 0 ]; then
    echo "ERROR: Virtual environment activation failed!"
    exit 1
fi
echo "✓ Virtual environment activated!"

echo
echo "[3/4] Running Django migrations..."
python manage.py migrate --settings=swaply.settings_production
if [ $? -ne 0 ]; then
    echo "ERROR: Migrations failed!"
    exit 1
fi
echo "✓ Migrations completed!"

echo
echo "[4/4] Collecting static files..."
python manage.py collectstatic --noinput --settings=swaply.settings_production
if [ $? -ne 0 ]; then
    echo "ERROR: Static files collection failed!"
    exit 1
fi
echo "✓ Static files collected!"

echo
echo "========================================"
echo "   DEPLOY COMPLETED SUCCESSFULLY!"
echo "========================================"
echo
echo "Don't forget to reload your web app!"
echo
