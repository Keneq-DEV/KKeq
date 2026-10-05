@echo off
title KKeq - Descargador Multimedia
cd /d "%~dp0"
setlocal

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%CD%\setup.ps1"
if errorlevel 1 (
    echo.
    echo [KKeq] Setup did not complete. Check the message above.
    pause
    exit /b 1
)

if exist "%CD%\lib\node\node.exe" set "PATH=%CD%\lib\node;%PATH%"
call npm start
if errorlevel 1 (
    echo.
    echo [KKeq] An error occurred while starting the application.
    pause
    exit /b 1
)
