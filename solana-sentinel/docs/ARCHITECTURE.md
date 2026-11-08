# Architecture and data methodology

## Application flow

1. The user supplies a wallet public key. The UI performs a base58 alphabet and decoded 32-byte length check before making network calls.
2. The app requests SOL balance, classic SPL Token account balances, Token-2022 account balances, and the requested number of recent signatures in parallel.
3. Up to four `getTransaction` detail requests run concurrently. Parsed transactions are used to calculate the wallet's pre/post SOL balance delta, fee, participating program IDs, parsed transfer-like instruction events and token balance changes.
4. Local deterministic logic aggregates counts and produces transparent review signals.
5. If the user supplies a Gemini API key, a compact evidence object is sent to Gemini with instructions not to invent facts or issue unsupported risk verdicts.
6. The report can be exported as JSON.

## Solana RPC methods

| Method | Use |
|---|---|
| `getBalance` | Current native SOL balance in lamports |
| `getTokenAccountsByOwner` | Current SPL Token account holdings |
| `getSignaturesForAddress` | Recent transaction signatures |
| `getTransaction` | Parsed transaction metadata, balances, fees and instructions |

The app queries both the classic Token Program and Token-2022 program for holdings. Token balances are aggregated by mint. The transaction summary uses `accountKeys` to locate the wallet index for SOL balance deltas and the RPC's pre/post token balance metadata for token deltas only when the owner field explicitly matches the inspected wallet.

## Interpretation boundaries

- A successful transaction only means the RPC marks it successful; it does not mean the action was wise or safe.
- An unknown program ID is only a lookup gap. It is not proof of maliciousness.
- A net SOL delta includes every lamport movement affecting the wallet account in that transaction, including fees and rent. It must not be misrepresented as a transfer amount.
- A token balance delta is only shown when the RPC exposes enough metadata to associate the token account with the wallet.
- The AI receives the evidence subset. It has no ability to query the chain itself in this implementation, so it should not claim to have independently verified anything beyond the provided data.

## Security and privacy

- No seed phrase, private key, signing adapter or wallet connection exists in the code.
- Gemini key is not written to storage. It is used in a direct API request with the `x-goog-api-key` header.
- Do not publish a shared Gemini key in a frontend. A production deployment should place model calls behind a backend, enforce request limits and store secrets in server environment variables or a managed secret store.
- Reports contain public wallet data. Treat exported reports as potentially sensitive user data even though the source chain is public.

## Deliberate scope exclusions

No price oracle, USD valuation, full-history indexing, identity attribution, automatic risk score, transaction simulation, transaction signing or smart-contract deployment is included in this MVP.
