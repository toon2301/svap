backend: cd backend && gunicorn swaply.wsgi:application --bind 0.0.0.0:$PORT --workers=3
frontend: cd frontend && npm run start -p $PORT

