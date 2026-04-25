import { parse } from 'csv-parse/sync';
import { TradeSchema, Trade, TradeError } from '../types/trade';
import { convertMMDDYYYYToISO, isValidISO8601 } from '../utils/dateUtils';

/**
 * Parse Interactive Brokers (IBKR) CSV format and convert to standardized trades
 * 
 * Expected columns:
 * TradeID, AccountID, Symbol, DateTime, Buy/Sell, Quantity, TradePrice, Currency, Commission, NetAmount, AssetClass
 */
export interface IBKRParseResult {
  trades: Trade[];
  errors: TradeError[];
}

export function parseIBKR(csvText: string): IBKRParseResult {
  const trades: Trade[] = [];
  const errors: TradeError[] = [];

  try {
    // Parse the CSV text into rows
    const rows = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as Record<string, string>[];

    // Process each row
    rows.forEach((row, index) => {
      const rowNumber = index + 2; // Row number in CSV (1-indexed, +1 for header)

      try {
        // ========== EXTRACT AND CONVERT DATA ==========

        // 1. Symbol - IBKR uses "EUR.USD" but we need "EUR/USD"
        let symbol = row.Symbol?.trim();
        if (!symbol) {
          errors.push({ row: rowNumber, reason: 'Missing Symbol' });
          return;
        }
        // Convert "EUR.USD" to "EUR/USD"
        symbol = symbol.replace('.', '/');

        // 2. Convert side: "BOT"/"SLD" → "BUY"/"SELL"
        const sideRaw = row['Buy/Sell']?.trim().toUpperCase();
        let side: 'BUY' | 'SELL';

        if (sideRaw === 'BOT') {
          side = 'BUY';
        } else if (sideRaw === 'SLD') {
          side = 'SELL';
        } else {
          errors.push({ row: rowNumber, reason: `Invalid Buy/Sell value: '${row['Buy/Sell']}'` });
          return;
        }

        // 3. Quantity - convert to number
        const quantityStr = row.Quantity?.trim();
        if (!quantityStr) {
          errors.push({ row: rowNumber, reason: 'Missing Quantity' });
          return;
        }
        const quantity = parseFloat(quantityStr);

        // 4. Price - convert to number
        const priceStr = row.TradePrice?.trim();
        if (!priceStr) {
          errors.push({ row: rowNumber, reason: 'Missing TradePrice' });
          return;
        }
        const price = parseFloat(priceStr);

        // 5. Total Amount - quantity * price
        const totalAmount = quantity * price;

        // 6. Currency - get from CSV
        const currency = row.Currency?.trim();
        if (!currency || currency.length !== 3) {
          errors.push({ row: rowNumber, reason: `Invalid currency: '${currency}'` });
          return;
        }

       // 7. Date - handle both ISO 8601 and MM/DD/YYYY formats
const dateStr = row.DateTime?.trim();

if (!dateStr) {
  errors.push({ row: rowNumber, reason: 'Missing DateTime' });
  return;
}

let executedAt: string | null = null;

// Try ISO 8601 format first (has 'T')
if (dateStr.includes('T')) {
  if (isValidISO8601(dateStr)) {
    executedAt = dateStr;
  }
}
// Try MM/DD/YYYY format (has '/')
else if (dateStr.includes('/')) {
  executedAt = convertMMDDYYYYToISO(dateStr);
}
// Try ISO without T as fallback
else if (isValidISO8601(dateStr)) {
  executedAt = dateStr;
}

// If date conversion failed, return error BEFORE validation
if (!executedAt) {
  errors.push({
    row: rowNumber,
    reason: `Invalid DateTime format: '${dateStr}' (expected ISO 8601 or MM/DD/YYYY)`,
  });
  return;
}
        // 8. Broker name
        const broker = 'ibkr';

        // ========== BUILD THE TRADE OBJECT ==========
        const trade = {
          symbol,
          side,
          quantity,
          price,
          totalAmount,
          currency,
          executedAt,
          broker,
          rawData: row, // Keep original CSV row with all extra fields
        };

        // ========== VALIDATE WITH ZOD ==========
        const validationResult = TradeSchema.safeParse(trade);

        if (validationResult.success) {
          // ✅ Trade is valid, add it
          trades.push(validationResult.data);
        } else {
          // ❌ Trade failed validation
          const errorMessage = validationResult.error.issues
            .map(issue => `${issue.path.join('.')}: ${issue.message}`)
            .join('; ');
          errors.push({ row: rowNumber, reason: `Validation failed: ${errorMessage}` });
        }
      } catch (error) {
        // Catch any unexpected errors
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        errors.push({ row: rowNumber, reason: `Error processing row: ${errorMsg}` });
      }
    });
  } catch (error) {
    // Error parsing the CSV itself
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to parse CSV: ${errorMsg}`);
  }

  return { trades, errors };
}