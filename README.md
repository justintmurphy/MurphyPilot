# Murphy Pilot + House

Private boards for Agentic Pilot and House. Prefer the hosted desk at **https://www.murphysbn.com/** (CNAME) or serve locally. **Do not use Google Apps Script /exec.**

## Run locally

```bash
git clone https://github.com/justintmurphy/MurphyPilot.git
cd MurphyPilot
./serve.sh          # Windows: serve.bat
```

- Pilot: http://127.0.0.1:8765/
- House: http://127.0.0.1:8765/house/

Then `git pull` and refresh when a snapshot lands.

Do not open as `file://` if you want the JSON files to load.

## How to read the desk

Standing how-to-read (Truthifi KEEP / HARD NOs, Fid 2× + Voya Tue/Thu cadence, Proof asof + holdings, House Live Equity sleeves, Where it sits, Justin theme, books page order): **Setup Guide §7** in `Murphy_Pilot_Setup.html`. Operating rules: `Murphy_Pilot_Manual.html` (v7.2). Account masks on desk are **···last-4 only** — never full account numbers.

## Layout

| Path | Role |
| --- | --- |
| `index.html` | Pilot desk (Agentic) |
| `desk.js` / `site.css` | Pilot board |
| `pilot-snapshot.json` | Latest Agentic print |
| `Murphy_Pilot_Manual.html` | Operating Manual v7.2 |
| `Murphy_Pilot_Setup.html` | Setup Guide v5.2 |
| `Murphy_Pilot_Desk.html` | Desk chrome / docs entry |
| `house/index.html` | House desk |
| `house/house.js` | House board |
| `house/house-snapshot.json` | Latest House print |
| `house/truthifi-snapshot.json` | Truthifi custodial SOV (Fid + Voya) |

House is data only. Repo is private. Snapshot jobs write JSON here; Gmail is backup.
