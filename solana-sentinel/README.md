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

Alternative:

```bash
python -m http.server 4173
```

Then open <http://localhost:4173>.

## Use the app

1. Paste a valid **public Solana wallet address**.
2. Keep the default RPC endpoint or paste an RPC URL you control.
3. Select how many recent signatures to inspect (10, 20, 30 or 50).
4. Select **Analyze wallet**. Sentinel calls `getBalance`, `getTokenAccountsByOwner`, `getSignaturesForAddress` and then `getTransaction` for the returned signatures.
5. Inspect token holdings, transaction details and the review signals. Open any signature in Solana Explorer to verify it.
6. Optional: paste your own Gemini API key, choose an available model (the default is Gemini 3.8 Flash; API access depends on your Google AI project), and select **Generate briefing**.
7. Select **Export report** to download the result as JSON.

### Gemini key handling

The key is entered into a password field, kept only in page memory and sent directly from the browser to Google's Gemini API in the request header. The application does not persist it in local storage, cookies or source files. **This client-side approach is intended for a hackathon demo only.** Anyone who can inspect their own browser session can see their own key, and a public production app should call Gemini through a server-side proxy with rate limits, authentication and secret management. Never commit API keys.

## Architecture

```text
Browser UI
  ├── Solana JSON-RPC (mainnet)
  │     ├── getBalance
  │     ├── getTokenAccountsByOwner (SPL Token + Token-2022)
  │     ├── getSignaturesForAddress
  │     └── getTransaction (jsonParsed)
  ├── Local evidence aggregation / review heuristics
  ├── Optional Gemini generateContent request
  └── JSON report export
```

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for details and known limitations.

## Important limitations

- The public Solana RPC may rate-limit requests or return incomplete history. A dedicated RPC endpoint is recommended for demos with many transactions.
- `getSignaturesForAddress` returns a bounded recent history. This is not a complete wallet history or accounting statement.
- Transaction detail can be missing for older transactions or versions not supported by an RPC provider. Sentinel preserves the signature and marks the parsed detail as unavailable.
- Token holdings are quantities, not USD valuations. No token price feed is queried.
- Program labels are a small local lookup table. An unlabelled program is not automatically suspicious; a labelled program is not automatically safe.
- Net SOL deltas can include rent, account creation/closure, fees and other lamport movements; they are not necessarily a payment amount.
- Token deltas rely on pre/post token balance metadata returned by the RPC.
- Gemini output is probabilistic and may be incorrect. Always verify material claims with Solana Explorer or another trusted source.
- This is not a security audit, fraud detector, investment recommendation or financial/legal advice.

## Hackathon submission details

**Project name:** Solana Sentinel  
**Tagline:** Understand every move in your Solana wallet.  
**Track:** AI Track  
**Short description:** A read-only wallet intelligence tool that combines Solana mainnet transaction data with Gemini AI to explain wallet activity, token movements, fees and review signals in plain language. It grounds every briefing in observed on-chain evidence and clearly labels unknowns.

See [`SUBMISSION_CHECKLIST.md`](SUBMISSION_CHECKLIST.md) and [`docs/DEMO_SCRIPT.md`](docs/DEMO_SCRIPT.md) before submitting.

## Tech stack

- HTML5, CSS3, vanilla JavaScript (ES modules)
- Solana JSON-RPC HTTP API
- Google Gemini REST `generateContent` API (optional)
- Node.js built-in HTTP server for local static hosting

## References

- [MLH Solana Hackathon](https://events.mlh.com/events/15200-solana-hackathon)
- [Solana JSON-RPC HTTP methods](https://solana.com/docs/rpc/http)
- [getTokenAccountsByOwner](https://solana.com/docs/rpc/http/gettokenaccountsbyowner)
- [getSignaturesForAddress](https://solana.com/docs/rpc/http/getsignaturesforaddress)
- [Gemini API generateContent](https://ai.google.dev/api/generate-content)

## License

MIT — see [`LICENSE`](LICENSE).
