#!/usr/bin/env node
/**
 * Educational invoice contract. Node 20+, no dependencies, network or file writes.
 * This is a small teaching fixture, not the Proctor engine or a live-model run.
 * Run: node invoice-contract.mjs
 * Gate one fixture: node invoice-contract.mjs --check regressed
 */
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';

const baseline = {
  vendor: 'Example Supply',
  currency: 'USD',
  lineItems: [{ amountCents: 10_000 }, { amountCents: 5_000 }],
  totalCents: 15_000,
};

export const fixtures = {
  baseline,
  formatting: { ...baseline, vendor: 'EXAMPLE SUPPLY' },
  regressed: { ...baseline, totalCents: 10_000 },
};

/** A contract for this one invoice fixture; integer minor units avoid rounding. */
export function checkInvoice(output) {
  const errors = [];
  if (!output || typeof output !== 'object' || Array.isArray(output)) {
    return { passed: false, errors: ['output must be an object'] };
  }
  if (typeof output.vendor !== 'string' || output.vendor.trim() === '') {
    errors.push('vendor must be nonempty');
  }
  if (output.currency !== 'USD') errors.push('currency must be USD');
  if (!Number.isSafeInteger(output.totalCents) || output.totalCents < 0) {
    errors.push('totalCents must be a nonnegative safe integer');
  }
  if (!Array.isArray(output.lineItems) || output.lineItems.length === 0 ||
      output.lineItems.some(item => !item || !Number.isSafeInteger(item.amountCents) || item.amountCents < 0)) {
    errors.push('lineItems must contain nonnegative safe integer amounts');
  } else {
    const sum = output.lineItems.reduce((total, item) => total + item.amountCents, 0);
    if (!Number.isSafeInteger(sum)) {
      errors.push('sum of lineItems exceeds safe integer range');
    } else if (sum !== output.totalCents) {
      errors.push(`sum_line_items_eq_total: expected ${sum}, received ${output.totalCents}`);
    }
  }
  return { passed: errors.length === 0, errors };
}

function main(args) {
  if (args.length === 2 && args[0] === '--check' && Object.hasOwn(fixtures, args[1])) {
    const result = checkInvoice(fixtures[args[1]]);
    console.log(JSON.stringify({ fixture: args[1], ...result }, null, 2));
    process.exitCode = result.passed ? 0 : 1;
  } else if (args.length > 0) {
    console.error('Usage: node invoice-contract.mjs [--check baseline|formatting|regressed]');
    process.exitCode = 2;
  } else {
    for (const [name, output] of Object.entries(fixtures)) {
      const result = checkInvoice(output);
      assert.equal(result.passed, name !== 'regressed', `unexpected decision for ${name}`);
      console.log(`${result.passed ? 'PASS' : 'BLOCK'} ${name}${result.errors.length ? ': ' + result.errors.join('; ') : ''}`);
    }
    console.log('3 expected decisions reproduced. No model or production tool was called.');
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main(process.argv.slice(2));
