#!/bin/sh
cd "$(dirname "$0")"
echo "Murphy Pilot local site  http://127.0.0.1:8765/"
echo "Ctrl+C to stop."
if command -v python3 >/dev/null 2>&1; then
  exec python3 -m http.server 8765 --bind 127.0.0.1
fi
if command -v python >/dev/null 2>&1; then
  exec python -m http.server 8765 --bind 127.0.0.1
fi
echo "Install Python 3, then run this again."
exit 1
