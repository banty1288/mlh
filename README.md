# Solana Sentinel

**Evidence-first AI explanations for public Solana wallet activity.** Built as a read-only MVP for the Major League Hacking (MLH) × Solana Hackathon — AI Track.

> Paste a public wallet address. Sentinel reads its SOL balance, SPL / Token-2022 holdings and recent transaction history from Solana mainnet. It parses transaction details where the RPC provides them, surfaces transparent review signals, and can ask Gemini to explain the evidence in plain language.

## What is implemented

- **Live Solana data:** balance, recent signatures, token accounts from both the classic SPL Token Program and Token-2022 program.
- **Transaction parsing:** per-transaction net SOL balance delta, fee, slot, timestamp, status, program IDs, parsed instruction events, and pre/post token balance changes when provided by RPC.
- **Evidence-based review signals:** failed transactions, unlabelled program IDs, average observed fee, token balance changes and net SOL change over the scanned sample. These are explicitly heuristics, not a fraud score.
- **Gemini AI briefing:** optional natural-language summary grounded in the fetched dataset, with instructions to distinguish facts from interpretation and disclose missing data.
- **Export:** download the fetched evidence and AI briefing as JSON.
- **Safety by design:** read-only RPC calls. No wallet connection, signing, transaction broadcast, seed phrase or private key is requested.
- **No build dependencies:** vanilla HTML, CSS and JavaScript; a tiny Node static server is included.

## Run locally

Requirements: Node.js 18+ (or Python 3.9+ if you prefer Python's built-in server).

```bash
npm start
```

Open <http://localhost:4173>.

Alternative: `python -m http.server 4173` then open http://localhost:4173.

## Use the app

1. Paste a valid public Solana wallet address.
2. Keep the default RPC endpoint or paste an RPC URL you control.
3. Select how many recent signatures to inspect (10, 20, 30 or 50).
4. Select **Analyze wallet** and inspect holdings, transactions and review signals.
5. Optional: provide a Gemini API key in the password field and generate an AI briefing.
6. Export the evidence and briefing as JSON.

### Gemini key handling

The key is kept only in page memory and sent directly from the browser to Google's Gemini API. It is not persisted in local storage, cookies or source files. This client-side approach is for a hackathon demo only; a production deployment should use a server-side proxy, rate limits, authentication and secret management. Never commit API keys.

## Architecture

Browser UI → Solana JSON-RPC (balance, token accounts, signatures, transaction details) → local evidence aggregation and review heuristics → optional Gemini briefing → JSON export.

See `docs/ARCHITECTURE.md` for details and known limitations.

## Important limitations

Public RPC providers may rate-limit requests or return incomplete history. `getSignaturesForAddress` is bounded recent history, not a complete accounting statement. Transaction detail and token metadata may be missing. Token holdings are quantities, not USD valuations. Unlabelled programs are not automatically suspicious. Net SOL deltas can include rent and fees. Gemini output is probabilistic and must be verified. This is not a security audit, fraud detector or investment recommendation.

## Hackathon submission details

- **Project:** Solana Sentinel
- **Tagline:** Understand every move in your Solana wallet.
- **Track:** AI Track
- **Description:** A read-only wallet intelligence tool combining Solana mainnet transaction data with Gemini AI to explain wallet activity, token movements, fees and review signals in plain language, grounded in observed evidence.

## Tech stack

HTML5, CSS3, vanilla JavaScript ES modules, Solana JSON-RPC, optional Google Gemini REST API, Node.js built-in HTTP server.

## References

- https://events.mlh.com/events/15200-solana-hackathon
- https://solana.com/docs/rpc/http
- https://ai.google.dev/api/generate-content

## License

MIT — see `LICENSE`.
