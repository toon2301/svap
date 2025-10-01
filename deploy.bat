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
echo [1b] Preparing out/ for commit (copy frontend\out -> out)...
if exist out (
    rmdir /S /Q out
)
mkdir out
xcopy /E /I /Y frontend\out out >nul
if %errorlevel% neq 0 (
    echo ERROR: Copying frontend\\out to out failed!
    pause
    exit /b 1
)
echo ✓ out/ prepared

echo.
echo [2/4] Adding changes to Git...
git add .
if %errorlevel% neq 0 (
    echo ERROR: Git add failed!
    pause
    exit /b 1
)

REM Force add out/ despite .gitignore
git add -f out

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
echo [5/6] Creating frontend zip for PythonAnywhere...
powershell Compress-Archive -Path "out\*" -DestinationPath "frontend-build.zip" -Force
if %errorlevel% neq 0 (
    echo ERROR: Failed to create frontend zip!
    pause
    exit /b 1
)
echo ✓ Frontend zip created!

echo.
echo [6/6] Instructions for PythonAnywhere:
echo ========================================
echo 1. Go to PythonAnywhere Files tab
echo 2. Upload frontend-build.zip to /home/AntonChudjak/svap/
echo 3. Extract it (it will create 'out' folder)
echo 4. Run: bash deploy_pythonanywhere.sh
echo 5. Reload your web app
echo ========================================
echo.
echo Frontend zip is ready: frontend-build.zip

echo.
echo ========================================
echo    DEPLOY COMPLETED SUCCESSFULLY!
echo ========================================
echo.
echo Don't forget to reload your web app on PythonAnywhere!
echo.
pause
