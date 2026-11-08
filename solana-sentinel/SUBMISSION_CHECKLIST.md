# MLH Solana Hackathon — final submission checklist

## Project details

- **Project:** Solana Sentinel
- **Track:** AI Track
- **Tagline:** Understand every move in your Solana wallet.
- **Repository:** https://github.com/banty1288/mlh

### Submission description

Solana Sentinel is an evidence-first wallet intelligence tool that reads public Solana mainnet data and turns it into human-readable insights. It fetches native SOL balance, SPL and Token-2022 holdings, recent transaction history, fees, parsed instructions and token balance changes. It then uses Gemini to explain the observed evidence, highlight items worth reviewing and clearly state data limitations. Sentinel is read-only: it never requests private keys, signs transactions or broadcasts on behalf of a user.

## Required before submit

- [ ] Run the app locally and confirm it loads.
- [ ] Test with a real public wallet address that has recent activity.
- [ ] Confirm balance, token holdings and recent signatures load.
- [ ] Open at least one transaction in Solana Explorer and verify that displayed details are consistent.
- [ ] Test AI briefing with your own Gemini key; do not expose the key in screenshots or recordings.
- [ ] Export the JSON report and confirm it downloads.
- [ ] Push all project files to the repository.
- [ ] Add a short README, track and project description on the MLH submission form.
- [ ] Record and upload the demo (see `docs/DEMO_SCRIPT.md`).
- [ ] Add a deployed demo URL if you have successfully hosted the app; do not submit a broken link.
- [ ] Submit on the official MLH Challenges submission page and verify the confirmation/entry status.

## Suggested technology disclosure

HTML, CSS, vanilla JavaScript, Solana JSON-RPC HTTP API, Gemini REST API, Node.js built-in HTTP server.

## Scope honesty

Do not claim transaction signing, autonomous agents, fraud prediction, audit-grade risk scoring, complete wallet history, token USD price valuation or smart-contract deployment. Those features are not part of this implementation.

## Event page

https://events.mlh.com/events/15200-solana-hackathon

Use the event portal's currently displayed submission instructions and deadline as authoritative. Do not assume that pushing code to GitHub alone completes the MLH submission.
