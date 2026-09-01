# Murphy Pilot

Local desk for the Agentic book. Private trading rules live in the job prompts; this repo is the board you host on your PC.

## Run on your machine

```bash
git clone https://github.com/justintmurphy/MurphyPilot.git
cd MurphyPilot
./serve.sh          # Windows: serve.bat
```

Open http://127.0.0.1:8765/

Later updates:

```bash
git pull
```

Then refresh the browser. Do not open the HTML as `file://` if you want `pilot-snapshot.json` to load.

## What is in here

| File | Role |
| --- | --- |
| `index.html` | Board — loads `pilot-snapshot.json` |
| `Murphy_Pilot_Desk.html` | Full desk (when present) |
| `Murphy_Pilot_Manual.html` | Operating Manual v7 |
| `Murphy_Pilot_Setup.html` | Setup Guide v5 |
| `pilot-snapshot.json` | Latest Agentic book print |
| `serve.sh` / `serve.bat` | Local server on port 8765 |

Repo is public. Do not commit account numbers.
