// This file detects which broker the CSV is from
// by looking at the column headers

/**
 * Detect which broker the CSV is from based on column headers
 * Returns the broker name or null if unknown
 */
export function detectBroker(headers: string[]): string | null {
  // Convert headers to lowercase for easier comparison
  const headersLower = headers.map(h => h.toLowerCase());

  // Check for Zerodha indicators
  // Zerodha always has: symbol, trade_date, trade_type
  if (
    headersLower.includes('symbol') &&
    headersLower.includes('trade_date') &&
    headersLower.includes('trade_type')
  ) {
    return 'zerodha';
  }

  // Check for Interactive Brokers (IBKR) indicators
  // IBKR always has: TradeID, Symbol, Buy/Sell (or similar)
  if (
    headersLower.includes('tradeid') &&
    headersLower.includes('symbol') &&
    (headersLower.includes('buy/sell') || headersLower.includes('buy/') || headersLower.includes('sell'))
  ) {
    return 'ibkr';
  }

  // Unknown broker
  return null;
}