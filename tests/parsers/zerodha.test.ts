import { parseZerodha } from '../../src/parsers/zerodha';

describe('Zerodha Parser', () => {
  // ========== HAPPY PATH TESTS ==========
  // These test when everything works correctly

  it('should parse a single valid trade', () => {
    const csv = `symbol,isin,trade_date,trade_type,quantity,price,trade_id,order_id,exchange,segment
RELIANCE,INE002A01018,01-04-2026,buy,10,2450.50,TRD001,ORD001,NSE,EQ`;

    const result = parseZerodha(csv);

    expect(result.trades.length).toBe(1);
    expect(result.errors.length).toBe(0);
    expect(result.trades[0].symbol).toBe('RELIANCE');
    expect(result.trades[0].side).toBe('BUY');
    expect(result.trades[0].quantity).toBe(10);
    expect(result.trades[0].price).toBe(2450.5);
    expect(result.trades[0].currency).toBe('INR');
    expect(result.trades[0].broker).toBe('zerodha');
  });

  it('should parse multiple valid trades', () => {
    const csv = `symbol,isin,trade_date,trade_type,quantity,price,trade_id,order_id,exchange,segment
RELIANCE,INE002A01018,01-04-2026,buy,10,2450.50,TRD001,ORD001,NSE,EQ
INFY,INE009A01021,01-04-2026,sell,25,1520.75,TRD002,ORD002,NSE,EQ
TATAMOTORS,INE155A01022,02-04-2026,buy,50,650.00,TRD003,ORD003,BSE,EQ`;

    const result = parseZerodha(csv);

    expect(result.trades.length).toBe(3);
    expect(result.errors.length).toBe(0);
  });

  it('should convert lowercase "buy" to "BUY"', () => {
    const csv = `symbol,isin,trade_date,trade_type,quantity,price,trade_id,order_id,exchange,segment
AAPL,INE002A01018,01-04-2026,buy,10,100.00,TRD001,ORD001,NSE,EQ`;

    const result = parseZerodha(csv);

    expect(result.trades[0].side).toBe('BUY');
  });

  it('should convert lowercase "sell" to "SELL"', () => {
    const csv = `symbol,isin,trade_date,trade_type,quantity,price,trade_id,order_id,exchange,segment
AAPL,INE002A01018,01-04-2026,sell,10,100.00,TRD001,ORD001,NSE,EQ`;

    const result = parseZerodha(csv);

    expect(result.trades[0].side).toBe('SELL');
  });

  it('should convert uppercase "SELL" to "SELL"', () => {
    const csv = `symbol,isin,trade_date,trade_type,quantity,price,trade_id,order_id,exchange,segment
SBIN,INE062A01020,03-04-2026,SELL,30,820.45,TRD005,ORD005,NSE,EQ`;

    const result = parseZerodha(csv);

    expect(result.trades[0].side).toBe('SELL');
  });

  it('should convert DD-MM-YYYY date format to ISO 8601', () => {
    const csv = `symbol,isin,trade_date,trade_type,quantity,price,trade_id,order_id,exchange,segment
RELIANCE,INE002A01018,25-12-2025,buy,10,100.00,TRD001,ORD001,NSE,EQ`;

    const result = parseZerodha(csv);

    expect(result.trades[0].executedAt).toBe('2025-12-25T00:00:00Z');
  });

  it('should calculate totalAmount correctly for BUY', () => {
    const csv = `symbol,isin,trade_date,trade_type,quantity,price,trade_id,order_id,exchange,segment
AAPL,INE002A01018,01-04-2026,buy,10,100.50,TRD001,ORD001,NSE,EQ`;

    const result = parseZerodha(csv);

    expect(result.trades[0].totalAmount).toBe(1005); // 10 * 100.50
  });

  it('should handle missing ISIN (optional field)', () => {
    const csv = `symbol,isin,trade_date,trade_type,quantity,price,trade_id,order_id,exchange,segment
HDFCBANK,,03-04-2026,buy,15,1680.30,TRD004,ORD004,NSE,EQ`;

    const result = parseZerodha(csv);

    expect(result.trades.length).toBe(1);
    expect(result.errors.length).toBe(0);
    expect(result.trades[0].symbol).toBe('HDFCBANK');
  });

  // ========== ERROR HANDLING TESTS ==========
  // These test when data is invalid

  it('should skip row with invalid date', () => {
    const csv = `symbol,isin,trade_date,trade_type,quantity,price,trade_id,order_id,exchange,segment
RELIANCE,INE002A01018,invalid_date,buy,10,2480.00,TRD006,ORD006,NSE,EQ`;

    const result = parseZerodha(csv);

    expect(result.trades.length).toBe(0);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0].reason).toContain('Invalid date format');
  });

  it('should skip row with negative quantity', () => {
    const csv = `symbol,isin,trade_date,trade_type,quantity,price,trade_id,order_id,exchange,segment
WIPRO,INE075A01022,05-04-2026,buy,-5,450.00,TRD007,ORD007,NSE,EQ`;

    const result = parseZerodha(csv);

    expect(result.trades.length).toBe(0);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0].reason).toContain('quantity');
  });

  it('should skip row with zero quantity', () => {
    const csv = `symbol,isin,trade_date,trade_type,quantity,price,trade_id,order_id,exchange,segment
AAPL,INE002A01018,01-04-2026,buy,0,100.00,TRD001,ORD001,NSE,EQ`;

    const result = parseZerodha(csv);

    expect(result.trades.length).toBe(0);
    expect(result.errors.length).toBe(1);
  });

  it('should skip row with missing symbol', () => {
    const csv = `symbol,isin,trade_date,trade_type,quantity,price,trade_id,order_id,exchange,segment
,INE002A01018,01-04-2026,buy,10,2450.50,TRD001,ORD001,NSE,EQ`;

    const result = parseZerodha(csv);

    expect(result.trades.length).toBe(0);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0].reason).toContain('symbol');
  });

  it('should skip row with missing quantity', () => {
    const csv = `symbol,isin,trade_date,trade_type,quantity,price,trade_id,order_id,exchange,segment
RELIANCE,INE002A01018,01-04-2026,buy,,2450.50,TRD001,ORD001,NSE,EQ`;

    const result = parseZerodha(csv);

    expect(result.trades.length).toBe(0);
    expect(result.errors.length).toBe(1);
  });

  it('should skip row with missing price', () => {
    const csv = `symbol,isin,trade_date,trade_type,quantity,price,trade_id,order_id,exchange,segment
RELIANCE,INE002A01018,01-04-2026,buy,10,,TRD001,ORD001,NSE,EQ`;

    const result = parseZerodha(csv);

    expect(result.trades.length).toBe(0);
    expect(result.errors.length).toBe(1);
  });

  it('should skip row with invalid trade_type', () => {
    const csv = `symbol,isin,trade_date,trade_type,quantity,price,trade_id,order_id,exchange,segment
RELIANCE,INE002A01018,01-04-2026,INVALID,10,2450.50,TRD001,ORD001,NSE,EQ`;

    const result = parseZerodha(csv);

    expect(result.trades.length).toBe(0);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0].reason).toContain('trade_type');
  });

  it('should handle mixed valid and invalid rows', () => {
    const csv = `symbol,isin,trade_date,trade_type,quantity,price,trade_id,order_id,exchange,segment
RELIANCE,INE002A01018,01-04-2026,buy,10,2450.50,TRD001,ORD001,NSE,EQ
INFY,INE009A01021,invalid_date,sell,25,1520.75,TRD002,ORD002,NSE,EQ
TATAMOTORS,INE155A01022,02-04-2026,buy,50,650.00,TRD003,ORD003,BSE,EQ`;

    const result = parseZerodha(csv);

    expect(result.trades.length).toBe(2); // RELIANCE and TATAMOTORS
    expect(result.errors.length).toBe(1); // INFY (invalid date)
  });

  it('should preserve rawData from original CSV row', () => {
    const csv = `symbol,isin,trade_date,trade_type,quantity,price,trade_id,order_id,exchange,segment
RELIANCE,INE002A01018,01-04-2026,buy,10,2450.50,TRD001,ORD001,NSE,EQ`;

    const result = parseZerodha(csv);

    expect(result.trades[0].rawData).toBeDefined();
    expect(result.trades[0].rawData.symbol).toBe('RELIANCE');
    expect(result.trades[0].rawData.trade_id).toBe('TRD001');
  });

  // ========== EDGE CASE TESTS ==========
  // These test unusual but valid scenarios

  it('should handle empty CSV (only headers)', () => {
    const csv = `symbol,isin,trade_date,trade_type,quantity,price,trade_id,order_id,exchange,segment`;

    const result = parseZerodha(csv);

    expect(result.trades.length).toBe(0);
    expect(result.errors.length).toBe(0);
  });

  it('should handle decimal quantities', () => {
    const csv = `symbol,isin,trade_date,trade_type,quantity,price,trade_id,order_id,exchange,segment
AAPL,INE002A01018,01-04-2026,buy,10.5,100.00,TRD001,ORD001,NSE,EQ`;

    const result = parseZerodha(csv);

    expect(result.trades.length).toBe(1);
    expect(result.trades[0].quantity).toBe(10.5);
  });

  it('should handle very large numbers', () => {
    const csv = `symbol,isin,trade_date,trade_type,quantity,price,trade_id,order_id,exchange,segment
RELIANCE,INE002A01018,01-04-2026,buy,1000000,9999.99,TRD001,ORD001,NSE,EQ`;

    const result = parseZerodha(csv);

    expect(result.trades.length).toBe(1);
    expect(result.trades[0].quantity).toBe(1000000);
    expect(result.trades[0].totalAmount).toBe(9999990000);
  });

  it('should set currency to INR for all trades', () => {
    const csv = `symbol,isin,trade_date,trade_type,quantity,price,trade_id,order_id,exchange,segment
RELIANCE,INE002A01018,01-04-2026,buy,10,2450.50,TRD001,ORD001,NSE,EQ
INFY,INE009A01021,01-04-2026,sell,25,1520.75,TRD002,ORD002,BSE,EQ`;

    const result = parseZerodha(csv);

    expect(result.trades[0].currency).toBe('INR');
    expect(result.trades[1].currency).toBe('INR');
  });
});