@echo off
echo ========================================
echo    SWAPLY - AUTOMATIC DEPLOY SCRIPT
echo ========================================
echo.

echo [1/4] Building frontend...
cd frontend
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: Frontend build failed!
    pause
    exit /b 1
)
cd ..
echo ✓ Frontend built successfully!

echo.
echo [2/4] Adding changes to Git...
git add .
if %errorlevel% neq 0 (
    echo ERROR: Git add failed!
    pause
    exit /b 1
)

echo.
echo [3/4] Committing changes...
git commit -m "Deploy: %date% %time%" || echo No changes to commit, continuing...

echo.
echo [4/4] Pushing to GitHub...
git push origin main
if %errorlevel% neq 0 (
    echo ERROR: Git push failed!
    pause
    exit /b 1
)

echo.
echo ========================================
echo    DEPLOY TO GITHUB COMPLETED!
echo ========================================
echo.
echo Now run this command on PythonAnywhere:
echo.
echo cd /home/AntonChudjak/svap && git pull origin main && cd backend && python manage.py migrate --settings=swaply.settings_production && python manage.py collectstatic --noinput --settings=swaply.settings_production
echo.
echo Then reload your web app!
echo.
pause
