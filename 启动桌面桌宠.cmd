@echo off
chcp 65001 >nul
cd /d "%~dp0"
if exist "%~dp0本地桌宠\PayBeat.exe" (
  start "" "%~dp0本地桌宠\PayBeat.exe"
) else (
  echo Please build the local desktop app first. See the desktop README.
  pause
)
