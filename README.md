# Murphy Pilot + House

Private local boards hosted from this repo. **Do not use Google Apps Script /exec.**

## Run

```bash
git clone https://github.com/justintmurphy/MurphyPilot.git
cd MurphyPilot
./serve.sh          # Windows: serve.bat
```

- Pilot: http://127.0.0.1:8765/
- House: http://127.0.0.1:8765/house/

Then `git pull` and refresh when a snapshot lands.

Do not open as `file://` if you want the JSON files to load.

## Layout

| Path | Role |
| --- | --- |
| `index.html` | Pilot desk (Agentic) |
| `desk.js` / `site.css` | Pilot board |
| `pilot-snapshot.json` | Latest Agentic print |
| `Murphy_Pilot_Manual.html` | Operating Manual v7 |
| `Murphy_Pilot_Setup.html` | Setup Guide v5 |
| `house/index.html` | House desk |
| `house/house.js` | House board |
| `house/house-snapshot.json` | Latest House print |

House is data only. Repo is private. GitHub Pages is off on purpose.
