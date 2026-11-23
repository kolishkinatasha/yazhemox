@echo off
setlocal
if not exist "%~dp0runtime\python\python.exe" (
    echo Extract the entire ZIP before running this file.
    pause
    exit /b 1
)
if "%~1"=="" (
    "%~dp0runtime\python\python.exe" "%~dp0backend\serve.py" --port 0 --open
) else (
    "%~dp0runtime\python\python.exe" "%~dp0backend\serve.py" %*
)
if errorlevel 1 (
    pause
    exit /b 1
)
