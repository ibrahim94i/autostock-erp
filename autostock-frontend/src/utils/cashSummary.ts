import type { CashRegisterSummary, CashTransaction } from '../types';

const INFLOW_TYPES = new Set(['sale', 'payment_in']);
const OUTFLOW_TYPES = new Set(['payment_out', 'expense']);

function parseMoney(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return typeof value === 'string' ? parseFloat(value) || 0 : value;
}

export function isCashInflowTransaction(type: string): boolean {
  return INFLOW_TYPES.has(type);
}

export function isCashOutflowTransaction(type: string): boolean {
  return OUTFLOW_TYPES.has(type);
}

export function computeCashRegisterSummary(
  openingBalance: string | number,
  transactions: Array<Pick<CashTransaction, 'type' | 'amount'>>,
): CashRegisterSummary {
  let totalIn = 0;
  let totalOut = 0;

  for (const tx of transactions) {
    const amount = parseMoney(tx.amount);
    if (isCashInflowTransaction(tx.type)) {
      totalIn += amount;
    } else if (isCashOutflowTransaction(tx.type)) {
      totalOut += amount;
    }
  }

  const opening = parseMoney(openingBalance);
  return {
    totalIn,
    totalOut,
    expectedBalance: opening + totalIn - totalOut,
  };
}
