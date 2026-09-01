@echo off
cd /d "%~dp0"
echo Murphy Pilot local site  http://127.0.0.1:8765/
echo Ctrl+C to stop.
py -3 -m http.server 8765 --bind 127.0.0.1 2>nul || python -m http.server 8765 --bind 127.0.0.1
