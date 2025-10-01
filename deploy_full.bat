@echo off
setlocal enabledelayedexpansion

REM ======================================
REM  SvAPLY - Windows launcher for deploy_full.sh
REM  Requires Git Bash installed (bash, ssh, scp in PATH)
REM  Optional: set PA_SSH_KEY to your private key path
REM ======================================

REM Change to script directory
cd /d "%~dp0"

REM Try to find Git Bash
set "GIT_BASH=%ProgramFiles%\Git\bin\bash.exe"
if not exist "%GIT_BASH%" set "GIT_BASH=%ProgramFiles(x86)%\Git\bin\bash.exe"
if not exist "%GIT_BASH%" (
  for /f "delims=" %%I in ('where bash 2^>nul') do set "GIT_BASH=%%I"
)

if not exist "%GIT_BASH%" (
  echo [ERROR] Git Bash not found. Please install Git for Windows from https://git-scm.com/download/win
  exit /b 1
)

echo Using Git Bash: "%GIT_BASH%"
"%GIT_BASH%" -lc "./deploy_full.sh"
set ERR=%ERRORLEVEL%
if not %ERR%==0 (
  echo [ERROR] Deployment failed with code %ERR%
  exit /b %ERR%
)

echo.
echo ======================================
echo  Deployment finished successfully
echo  If not auto-reloaded, reload on PythonAnywhere Dashboard
echo ======================================
exit /b 0


