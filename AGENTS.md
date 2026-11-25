# Notes for coding agents

## Data sources (as of 2026-10-13)
- **Banking**: pulled from the Grok Bot **Finance** connector (Plaid), not Truthifi. Pulls run at 8:02 AM, 12:02 PM, 4:07 PM and 8:02 PM ET. The print is POSTed to the Worker (`/admin/banking`, KV key `banking:snapshot`) and served at `/data/banking.json` behind login. The page must render `budget.pay_periods[].moves[]` from the print and fetch fresh data (no-cache).
- **Historical records**: the Historical tab reads `GET /data/banking/records/index.json`, `GET /data/banking/months/YYYY-MM.json`, and `GET /data/banking/years/YYYY.json`, login-gated like the banking print. `POST /admin/banking/records` with the publish Bearer writes KV keys `banking:record:index`, `banking:month:YYYY-MM`, and `banking:year:YYYY` (`workers/murphysbn-gate/records.js`). Do not deploy that wrapper from this repo, and do not commit record documents or real figures.
- **Investments**: Fidelity balances come from Finance, which has no per-holding rows, so holdings can be frozen; show an as-of date. Robinhood comes from its own connector. Voya is the only account still on Truthifi, with one pull a day at 4:07 PM ET. The custodial print is not committed. The investments page fetches `GET /data/house/truthifi-snapshot.json` with the banking cookie (`credentials: "include"`, no-cache). The gate worker must serve KV key `house:truthifi-snapshot` on that route.
- Truthifi is otherwise retired, so don't add new Truthifi dependencies.
- **Tiers writes**: Owner seat cookies still write `/data/banking/tiers.json`. The box publish Bearer stays GET/HEAD only and answers `bearer_read_only` on PUT/POST. A separate Worker secret, `ASSISTANT_TIERS_WRITE`, may `PUT` that doc only (`workers/murphysbn-gate/tiers-write.js`). The live gate worker is not in this repo. Set the secret with `wrangler secret put` on that worker, then deploy. Do not commit the secret.

## Rules
- Never commit the banking snapshot, the custodial investments snapshot (`house/truthifi-snapshot.json`), or real figures.
- No bank brand strings or real figures in public JS.
- Bump the `?v=` cache tag on every UI change.

## Checks
- Pull requests must be green on the tests workflow (`.github/workflows/tests.yml`) before merge.
- Agents must not call a change done without that check passing.
