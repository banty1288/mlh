/** Validate a base58-encoded Solana public key (32 decoded bytes). */
export function validateSolanaAddress(address) {
  if (typeof address !== 'string' || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) return false;
  const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let value = 0n;
  for (const character of address) {
    const digit = alphabet.indexOf(character);
    if (digit < 0) return false;
    value = value * 58n + BigInt(digit);
  }
  let decodedBytes = 0;
  while (value > 0n) { decodedBytes += 1; value >>= 8n; }
  for (const character of address) { if (character !== '1') break; decodedBytes += 1; }
  return decodedBytes === 32;
}

export function sumLamportDelta(preBalances, postBalances, accountIndex) {
  if (!Array.isArray(preBalances) || !Array.isArray(postBalances) || !Number.isInteger(accountIndex)) return null;
  if (accountIndex < 0 || accountIndex >= preBalances.length || accountIndex >= postBalances.length) return null;
  const before = Number(preBalances[accountIndex]);
  const after = Number(postBalances[accountIndex]);
  if (!Number.isFinite(before) || !Number.isFinite(after)) return null;
  return after - before;
}
