# Notes for coding agents

## Data sources (as of 2026-10-13)
- **Banking**: pulled from the Grok Bot **Finance** connector (Plaid), not Truthifi. Pulls run at 8:02 AM, 12:02 PM, 4:07 PM and 8:02 PM ET. The print is POSTed to the Worker (`/admin/banking`, KV key `banking:snapshot`) and served at `/data/banking.json` behind login. The page must render `budget.pay_periods[].moves[]` from the print and fetch fresh data (no-cache).
- **Investments**: Fidelity balances come from Finance, which has no per-holding rows, so holdings can be frozen; show an as-of date. Robinhood comes from its own connector. Voya is the only account still on Truthifi, with one pull a day at 4:07 PM ET.
- Truthifi is otherwise retired, so don't add new Truthifi dependencies.

## Rules
- Never commit the banking snapshot or real figures.
- No bank brand strings or real figures in public JS.
- Bump the `?v=` cache tag on every UI change.
