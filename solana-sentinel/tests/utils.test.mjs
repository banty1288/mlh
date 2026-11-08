import assert from 'node:assert/strict';
import { validateSolanaAddress, sumLamportDelta } from '../src/utils.js';

assert.equal(validateSolanaAddress('11111111111111111111111111111111'), true);
assert.equal(validateSolanaAddress('So11111111111111111111111111111111111111112'), true);
assert.equal(validateSolanaAddress('not-a-wallet'), false);
assert.equal(validateSolanaAddress('1111111111111111111111111111111'), false);
assert.equal(sumLamportDelta([10,20],[15,17],1), -3);
assert.equal(sumLamportDelta([10],[11],3), null);
console.log('Utility tests passed.');
