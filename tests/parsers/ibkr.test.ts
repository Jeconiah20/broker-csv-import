import { parseIBKR } from '../../src/parsers/ibkr';

describe('IBKR Parser', () => {
  // ========== HAPPY PATH TESTS ==========

  it('should parse a single valid IBKR trade', () => {
    const csv = `TradeID,AccountID,Symbol,DateTime,Buy/Sell,Quantity,TradePrice,Currency,Commission,NetAmount,AssetClass
U1234-001,U1234567,AAPL,2026-04-01T14:30:00Z,BOT,100,185.50,USD,-1.00,18549.00,STK`;

    const result = parseIBKR(csv);

    expect(result.trades.length).toBe(1);
    expect(result.errors.length).toBe(0);
    expect(result.trades[0].symbol).toBe('AAPL');
    expect(result.trades[0].side).toBe('BUY');
    expect(result.trades[0].quantity).toBe(100);
    expect(result.trades[0].price).toBe(185.5);
    expect(result.trades[0].currency).toBe('USD');
    expect(result.trades[0].broker).toBe('ibkr');
  });

  it('should parse multiple valid IBKR trades', () => {
    const csv = `TradeID,AccountID,Symbol,DateTime,Buy/Sell,Quantity,TradePrice,Currency,Commission,NetAmount,AssetClass
U1234-001,U1234567,AAPL,2026-04-01T14:30:00Z,BOT,100,185.50,USD,-1.00,18549.00,STK
U1234-002,U1234567,MSFT,2026-04-01T15:45:00Z,SLD,50,420.25,USD,-1.00,-21011.50,STK
U1234-003,U1234567,GOOGL,2026-04-02T09:00:00Z,BOT,30,175.50,USD,-2.00,5265.00,STK`;

    const result = parseIBKR(csv);

    expect(result.trades.length).toBe(3);
    expect(result.errors.length).toBe(0);
  });

  it('should convert BOT to BUY', () => {
    const csv = `TradeID,AccountID,Symbol,DateTime,Buy/Sell,Quantity,TradePrice,Currency,Commission,NetAmount,AssetClass
U1234-001,U1234567,AAPL,2026-04-01T14:30:00Z,BOT,100,185.50,USD,-1.00,18549.00,STK`;

    const result = parseIBKR(csv);

    expect(result.trades[0].side).toBe('BUY');
  });

  it('should convert SLD to SELL', () => {
    const csv = `TradeID,AccountID,Symbol,DateTime,Buy/Sell,Quantity,TradePrice,Currency,Commission,NetAmount,AssetClass
U1234-002,U1234567,MSFT,2026-04-01T15:45:00Z,SLD,50,420.25,USD,-1.00,-21011.50,STK`;

    const result = parseIBKR(csv);

    expect(result.trades[0].side).toBe('SELL');
  });

  it('should convert EUR.USD to EUR/USD', () => {
    const csv = `TradeID,AccountID,Symbol,DateTime,Buy/Sell,Quantity,TradePrice,Currency,Commission,NetAmount,AssetClass
U1234-003,U1234567,EUR.USD,2026-04-02T09:00:00Z,BOT,10000,1.0850,USD,-2.00,10848.00,CASH`;

    const result = parseIBKR(csv);

    expect(result.trades[0].symbol).toBe('EUR/USD');
  });

  it('should handle ISO 8601 datetime format', () => {
    const csv = `TradeID,AccountID,Symbol,DateTime,Buy/Sell,Quantity,TradePrice,Currency,Commission,NetAmount,AssetClass
U1234-001,U1234567,AAPL,2026-04-01T14:30:00Z,BOT,100,185.50,USD,-1.00,18549.00,STK`;

    const result = parseIBKR(csv);

    expect(result.trades[0].executedAt).toBe('2026-04-01T14:30:00Z');
  });

  it('should handle MM/DD/YYYY date format', () => {
    const csv = `TradeID,AccountID,Symbol,DateTime,Buy/Sell,Quantity,TradePrice,Currency,Commission,NetAmount,AssetClass
U1234-004,U1234567,TSLA,04/03/2026,BOT,25,245.00,USD,-1.00,6124.00,STK`;

    const result = parseIBKR(csv);

    expect(result.trades[0].executedAt).toBe('2026-04-03T00:00:00Z');
  });

  it('should calculate totalAmount correctly', () => {
    const csv = `TradeID,AccountID,Symbol,DateTime,Buy/Sell,Quantity,TradePrice,Currency,Commission,NetAmount,AssetClass
U1234-001,U1234567,AAPL,2026-04-01T14:30:00Z,BOT,100,185.50,USD,-1.00,18549.00,STK`;

    const result = parseIBKR(csv);

    expect(result.trades[0].totalAmount).toBe(18550); // 100 * 185.50
  });

  it('should handle empty Commission field', () => {
    const csv = `TradeID,AccountID,Symbol,DateTime,Buy/Sell,Quantity,TradePrice,Currency,Commission,NetAmount,AssetClass
U1234-006,U1234567,GOOGL,2026-04-04T10:15:00Z,BOT,30,175.50,USD,,5265.00,STK`;

    const result = parseIBKR(csv);

    expect(result.trades.length).toBe(1);
    expect(result.trades[0].symbol).toBe('GOOGL');
  });

  it('should preserve all rawData fields from original row', () => {
    const csv = `TradeID,AccountID,Symbol,DateTime,Buy/Sell,Quantity,TradePrice,Currency,Commission,NetAmount,AssetClass
U1234-001,U1234567,AAPL,2026-04-01T14:30:00Z,BOT,100,185.50,USD,-1.00,18549.00,STK`;

    const result = parseIBKR(csv);

    expect(result.trades[0].rawData).toBeDefined();
    expect(result.trades[0].rawData.TradeID).toBe('U1234-001');
    expect(result.trades[0].rawData.AccountID).toBe('U1234567');
    expect(result.trades[0].rawData.Commission).toBe('-1.00');
    expect(result.trades[0].rawData.NetAmount).toBe('18549.00');
    expect(result.trades[0].rawData.AssetClass).toBe('STK');
  });

  // ========== ERROR HANDLING TESTS ==========

  it('should skip row with zero quantity', () => {
    const csv = `TradeID,AccountID,Symbol,DateTime,Buy/Sell,Quantity,TradePrice,Currency,Commission,NetAmount,AssetClass
U1234-005,U1234567,AMZN,2026-04-03T16:20:00Z,SLD,0,190.75,USD,-1.00,0.00,STK`;

    const result = parseIBKR(csv);

    expect(result.trades.length).toBe(0);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0].reason).toContain('quantity');
  });

  it('should skip row with negative quantity', () => {
    const csv = `TradeID,AccountID,Symbol,DateTime,Buy/Sell,Quantity,TradePrice,Currency,Commission,NetAmount,AssetClass
U1234-001,U1234567,AAPL,2026-04-01T14:30:00Z,BOT,-100,185.50,USD,-1.00,18549.00,STK`;

    const result = parseIBKR(csv);

    expect(result.trades.length).toBe(0);
    expect(result.errors.length).toBe(1);
  });

  it('should skip row with missing Symbol', () => {
    const csv = `TradeID,AccountID,Symbol,DateTime,Buy/Sell,Quantity,TradePrice,Currency,Commission,NetAmount,AssetClass
U1234-001,U1234567,,2026-04-01T14:30:00Z,BOT,100,185.50,USD,-1.00,18549.00,STK`;

    const result = parseIBKR(csv);

    expect(result.trades.length).toBe(0);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0].reason).toContain('Symbol');
  });

  it('should skip row with missing Quantity', () => {
    const csv = `TradeID,AccountID,Symbol,DateTime,Buy/Sell,Quantity,TradePrice,Currency,Commission,NetAmount,AssetClass
U1234-001,U1234567,AAPL,2026-04-01T14:30:00Z,BOT,,185.50,USD,-1.00,18549.00,STK`;

    const result = parseIBKR(csv);

    expect(result.trades.length).toBe(0);
    expect(result.errors.length).toBe(1);
  });

  it('should skip row with missing TradePrice', () => {
    const csv = `TradeID,AccountID,Symbol,DateTime,Buy/Sell,Quantity,TradePrice,Currency,Commission,NetAmount,AssetClass
U1234-001,U1234567,AAPL,2026-04-01T14:30:00Z,BOT,100,,USD,-1.00,18549.00,STK`;

    const result = parseIBKR(csv);

    expect(result.trades.length).toBe(0);
    expect(result.errors.length).toBe(1);
  });

  it('should skip row with missing DateTime', () => {
    const csv = `TradeID,AccountID,Symbol,DateTime,Buy/Sell,Quantity,TradePrice,Currency,Commission,NetAmount,AssetClass
U1234-001,U1234567,AAPL,,BOT,100,185.50,USD,-1.00,18549.00,STK`;

    const result = parseIBKR(csv);

    expect(result.trades.length).toBe(0);
    expect(result.errors.length).toBe(1);
  });

  it('should skip row with invalid Buy/Sell value', () => {
    const csv = `TradeID,AccountID,Symbol,DateTime,Buy/Sell,Quantity,TradePrice,Currency,Commission,NetAmount,AssetClass
U1234-001,U1234567,AAPL,2026-04-01T14:30:00Z,INVALID,100,185.50,USD,-1.00,18549.00,STK`;

    const result = parseIBKR(csv);

    expect(result.trades.length).toBe(0);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0].reason).toContain('Buy/Sell');
  });

  it('should skip row with invalid Currency length', () => {
    const csv = `TradeID,AccountID,Symbol,DateTime,Buy/Sell,Quantity,TradePrice,Currency,Commission,NetAmount,AssetClass
U1234-001,U1234567,AAPL,2026-04-01T14:30:00Z,BOT,100,185.50,US,-1.00,18549.00,STK`;

    const result = parseIBKR(csv);

    expect(result.trades.length).toBe(0);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0].reason).toContain('currency');
  });

  it('should skip row with invalid DateTime format', () => {
    const csv = `TradeID,AccountID,Symbol,DateTime,Buy/Sell,Quantity,TradePrice,Currency,Commission,NetAmount,AssetClass
U1234-001,U1234567,AAPL,invalid-date,BOT,100,185.50,USD,-1.00,18549.00,STK`;

    const result = parseIBKR(csv);

    expect(result.trades.length).toBe(0);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0].reason.toLowerCase()).toContain('datetime');
  });

  it('should handle mixed valid and invalid rows', () => {
    const csv = `TradeID,AccountID,Symbol,DateTime,Buy/Sell,Quantity,TradePrice,Currency,Commission,NetAmount,AssetClass
U1234-001,U1234567,AAPL,2026-04-01T14:30:00Z,BOT,100,185.50,USD,-1.00,18549.00,STK
U1234-002,U1234567,MSFT,2026-04-01T15:45:00Z,SLD,0,420.25,USD,-1.00,-21011.50,STK
U1234-003,U1234567,GOOGL,2026-04-02T09:00:00Z,BOT,30,175.50,USD,-2.00,5265.00,STK`;

    const result = parseIBKR(csv);

    expect(result.trades.length).toBe(2); // AAPL and GOOGL
    expect(result.errors.length).toBe(1); // MSFT (zero quantity)
  });

  // ========== EDGE CASE TESTS ==========

  it('should handle empty CSV (only headers)', () => {
    const csv = `TradeID,AccountID,Symbol,DateTime,Buy/Sell,Quantity,TradePrice,Currency,Commission,NetAmount,AssetClass`;

    const result = parseIBKR(csv);

    expect(result.trades.length).toBe(0);
    expect(result.errors.length).toBe(0);
  });

  it('should handle decimal quantities', () => {
    const csv = `TradeID,AccountID,Symbol,DateTime,Buy/Sell,Quantity,TradePrice,Currency,Commission,NetAmount,AssetClass
U1234-001,U1234567,AAPL,2026-04-01T14:30:00Z,BOT,100.5,185.50,USD,-1.00,18629.75,STK`;

    const result = parseIBKR(csv);

    expect(result.trades.length).toBe(1);
    expect(result.trades[0].quantity).toBe(100.5);
  });

  it('should handle very large numbers', () => {
    const csv = `TradeID,AccountID,Symbol,DateTime,Buy/Sell,Quantity,TradePrice,Currency,Commission,NetAmount,AssetClass
U1234-001,U1234567,BTC,2026-04-01T14:30:00Z,BOT,1000000,50000.00,USD,-100.00,50000000000.00,CRYP`;

    const result = parseIBKR(csv);

    expect(result.trades.length).toBe(1);
    expect(result.trades[0].quantity).toBe(1000000);
    expect(result.trades[0].totalAmount).toBe(50000000000);
  });

  it('should handle different currency codes', () => {
    const csv = `TradeID,AccountID,Symbol,DateTime,Buy/Sell,Quantity,TradePrice,Currency,Commission,NetAmount,AssetClass
U1234-001,U1234567,AAPL,2026-04-01T14:30:00Z,BOT,100,185.50,USD,-1.00,18549.00,STK
U1234-002,U1234567,SAP,2026-04-01T15:45:00Z,BOT,50,100.00,EUR,-1.00,4999.00,STK
U1234-003,U1234567,RELIANCE,2026-04-02T09:00:00Z,BOT,100,2500.00,INR,-10.00,249990.00,STK`;

    const result = parseIBKR(csv);

    expect(result.trades.length).toBe(3);
    expect(result.trades[0].currency).toBe('USD');
    expect(result.trades[1].currency).toBe('EUR');
    expect(result.trades[2].currency).toBe('INR');
  });

  it('should handle different forex pair formats', () => {
    const csv = `TradeID,AccountID,Symbol,DateTime,Buy/Sell,Quantity,TradePrice,Currency,Commission,NetAmount,AssetClass
U1234-001,U1234567,EUR.USD,2026-04-01T14:30:00Z,BOT,10000,1.0850,USD,-2.00,10848.00,CASH
U1234-002,U1234567,GBP.USD,2026-04-01T15:45:00Z,BOT,5000,1.2750,USD,-1.50,6374.25,CASH`;

    const result = parseIBKR(csv);

    expect(result.trades[0].symbol).toBe('EUR/USD');
    expect(result.trades[1].symbol).toBe('GBP/USD');
  });
});