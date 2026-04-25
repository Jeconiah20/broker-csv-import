import { parse } from 'csv-parse/sync';
import { TradeSchema, Trade, TradeError } from '../types/trade';
import { convertDDMMYYYYToISO } from '../utils/dateUtils';

/**
 * Parse Zerodha CSV format and convert to standardized trades
 * 
 * Expected columns:
 * symbol, isin, trade_date, trade_type, quantity, price, trade_id, order_id, exchange, segment
 */
export interface ZerodhaParseResult {
  trades: Trade[];
  errors: TradeError[];
}

export function parseZerodha(csvText: string): ZerodhaParseResult {
  const trades: Trade[] = [];
  const errors: TradeError[] = [];

  try {
    // Parse the CSV text into rows (objects)
    const rows = parse(csvText, {
      columns: true, // Treat first row as column headers
      skip_empty_lines: true, // Skip empty rows
      trim: true, // Remove whitespace
    }) as Record<string, string>[];

    // Process each row
    rows.forEach((row, index) => {
      const rowNumber = index + 2; // Row number in CSV (1-indexed, +1 for header)

      try {
        // ========== EXTRACT AND CONVERT DATA ==========

        // 1. Symbol - use as is
        const symbol = row.symbol?.trim();
        if (!symbol) {
          errors.push({ row: rowNumber, reason: 'Missing symbol' });
          return;
        }

        // 2. Convert side: "buy"/"sell" → "BUY"/"SELL"
        const sideRaw = row.trade_type?.trim().toUpperCase();
        if (sideRaw !== 'BUY' && sideRaw !== 'SELL') {
          errors.push({ row: rowNumber, reason: `Invalid trade_type: '${row.trade_type}'` });
          return;
        }
        const side = sideRaw as 'BUY' | 'SELL';

        // 3. Quantity - convert to number
        const quantityStr = row.quantity?.trim();
        if (!quantityStr) {
          errors.push({ row: rowNumber, reason: 'Missing quantity' });
          return;
        }
        const quantity = parseFloat(quantityStr);

        // 4. Price - convert to number
        const priceStr = row.price?.trim();
        if (!priceStr) {
          errors.push({ row: rowNumber, reason: 'Missing price' });
          return;
        }
        const price = parseFloat(priceStr);

        // 5. Total Amount - quantity * price
        const totalAmount = quantity * price;

        // 6. Currency - Zerodha doesn't include currency, but it's always INR for Indian exchanges
        const currency = 'INR';

        // 7. Date - convert DD-MM-YYYY to ISO 8601
        const dateStr = row.trade_date?.trim();
        if (!dateStr) {
          errors.push({ row: rowNumber, reason: 'Missing trade_date' });
          return;
        }
        const executedAt = convertDDMMYYYYToISO(dateStr);
        if (!executedAt) {
          errors.push({ row: rowNumber, reason: `Invalid date format: '${dateStr}' (expected DD-MM-YYYY)` });
          return;
        }

        // 8. Broker name
        const broker = 'zerodha';

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
          rawData: row, // Keep original CSV row
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