import { z } from "zod";

// This is the shape of a valid trade
// Zod will check every trade against these rules
export const TradeSchema = z.object({
  
  // Stock/currency symbol e.g "AAPL", "EUR/USD"
  symbol: z.string().min(1),

  // Must be exactly "BUY" or "SELL" - nothing else
  side: z.enum(["BUY", "SELL"]),

  // Must be a number AND greater than 0
  quantity: z.number().positive(),

  // Must be a number AND greater than 0
  price: z.number().positive(),

  // quantity * price (can be negative for sells)
  totalAmount: z.number(),

  // Must be exactly 3 characters e.g "USD", "INR"
  currency: z.string().length(3),

  // Must be a valid ISO 8601 date e.g "2026-04-01T14:30:00Z"
  executedAt: z.string().datetime(),

  // Which broker this came from e.g "zerodha", "ibkr"
  broker: z.string().min(1),

  // The original CSV row stored as key-value pairs
  // We keep this so we never lose the original data
  rawData: z.record(z.string(), z.unknown()),
});

// This creates a TypeScript TYPE from the Zod schema
// So we can use "Trade" as a type in our code
export type Trade = z.infer<typeof TradeSchema>;

// This is the shape of a skipped/failed row
export interface TradeError {
  row: number;
  reason: string;
}

// This is the shape of the final result we return
export interface ParseResult {
  broker: string;
  summary: {
    total: number;
    valid: number;
    skipped: number;
  };
  trades: Trade[];
  errors: TradeError[];
}