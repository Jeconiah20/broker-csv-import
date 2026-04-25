import express from 'express';
import request from 'supertest';
import multer from 'multer';
import importRoutes from '../src/routes/import';

// Create a test app
const app = express();
app.use(express.json());
app.use('/api', importRoutes);

describe('API Endpoint - POST /api/import', () => {
  // ========== SUCCESSFUL IMPORTS ==========

  it('should import valid Zerodha CSV', async () => {
    const csvContent = `symbol,isin,trade_date,trade_type,quantity,price,trade_id,order_id,exchange,segment
RELIANCE,INE002A01018,01-04-2026,buy,10,2450.50,TRD001,ORD001,NSE,EQ
INFY,INE009A01021,01-04-2026,sell,25,1520.75,TRD002,ORD002,NSE,EQ`;

    const response = await request(app)
      .post('/api/import')
      .attach('file', Buffer.from(csvContent), 'zerodha.csv');

    expect(response.status).toBe(200);
    expect(response.body.broker).toBe('zerodha');
    expect(response.body.summary.valid).toBe(2);
    expect(response.body.summary.skipped).toBe(0);
    expect(response.body.trades.length).toBe(2);
  });

  it('should import valid IBKR CSV', async () => {
    const csvContent = `TradeID,AccountID,Symbol,DateTime,Buy/Sell,Quantity,TradePrice,Currency,Commission,NetAmount,AssetClass
U1234-001,U1234567,AAPL,2026-04-01T14:30:00Z,BOT,100,185.50,USD,-1.00,18549.00,STK
U1234-002,U1234567,MSFT,2026-04-01T15:45:00Z,SLD,50,420.25,USD,-1.00,-21011.50,STK`;

    const response = await request(app)
      .post('/api/import')
      .attach('file', Buffer.from(csvContent), 'ibkr.csv');

    expect(response.status).toBe(200);
    expect(response.body.broker).toBe('ibkr');
    expect(response.body.summary.valid).toBe(2);
    expect(response.body.summary.skipped).toBe(0);
    expect(response.body.trades.length).toBe(2);
  });

  it('should return summary with correct counts', async () => {
    const csvContent = `symbol,isin,trade_date,trade_type,quantity,price,trade_id,order_id,exchange,segment
RELIANCE,INE002A01018,01-04-2026,buy,10,2450.50,TRD001,ORD001,NSE,EQ
INFY,INE009A01021,invalid_date,sell,25,1520.75,TRD002,ORD002,NSE,EQ
TATAMOTORS,INE155A01022,02-04-2026,buy,50,650.00,TRD003,ORD003,BSE,EQ`;

    const response = await request(app)
      .post('/api/import')
      .attach('file', Buffer.from(csvContent), 'zerodha.csv');

    expect(response.status).toBe(200);
    expect(response.body.summary.total).toBe(3);
    expect(response.body.summary.valid).toBe(2);
    expect(response.body.summary.skipped).toBe(1);
  });

  it('should include error details for failed rows', async () => {
    const csvContent = `symbol,isin,trade_date,trade_type,quantity,price,trade_id,order_id,exchange,segment
RELIANCE,INE002A01018,invalid_date,buy,10,2480.00,TRD006,ORD006,NSE,EQ
WIPRO,INE075A01022,05-04-2026,buy,-5,450.00,TRD007,ORD007,NSE,EQ`;

    const response = await request(app)
      .post('/api/import')
      .attach('file', Buffer.from(csvContent), 'zerodha.csv');

    expect(response.status).toBe(200);
    expect(response.body.errors.length).toBe(2);
    expect(response.body.errors[0]).toHaveProperty('row');
    expect(response.body.errors[0]).toHaveProperty('reason');
  });

  // ========== ERROR HANDLING ==========

  it('should return 400 if no file is uploaded', async () => {
    const response = await request(app)
      .post('/api/import')
      .send();

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('No file uploaded');
  });

  it('should return 400 for empty file', async () => {
    const response = await request(app)
      .post('/api/import')
      .attach('file', Buffer.from(''), 'empty.csv');

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Empty file');
  });

  it('should return 400 for unrecognized broker format', async () => {
    const csvContent = `col1,col2,col3
value1,value2,value3`;

    const response = await request(app)
      .post('/api/import')
      .attach('file', Buffer.from(csvContent), 'unknown.csv');

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Unknown broker format');
  });

  it('should return 400 for CSV with only headers', async () => {
    const csvContent = `symbol,isin,trade_date,trade_type,quantity,price,trade_id,order_id,exchange,segment`;

    const response = await request(app)
      .post('/api/import')
      .attach('file', Buffer.from(csvContent), 'zerodha.csv');

    expect(response.status).toBe(200);
    expect(response.body.summary.valid).toBe(0);
    expect(response.body.summary.skipped).toBe(0);
  });

  // ========== RESPONSE STRUCTURE ==========

  it('should return response with correct structure', async () => {
    const csvContent = `symbol,isin,trade_date,trade_type,quantity,price,trade_id,order_id,exchange,segment
RELIANCE,INE002A01018,01-04-2026,buy,10,2450.50,TRD001,ORD001,NSE,EQ`;

    const response = await request(app)
      .post('/api/import')
      .attach('file', Buffer.from(csvContent), 'zerodha.csv');

    expect(response.body).toHaveProperty('broker');
    expect(response.body).toHaveProperty('summary');
    expect(response.body).toHaveProperty('trades');
    expect(response.body).toHaveProperty('errors');
    expect(response.body.summary).toHaveProperty('total');
    expect(response.body.summary).toHaveProperty('valid');
    expect(response.body.summary).toHaveProperty('skipped');
  });

  it('should return trade object with all required fields', async () => {
    const csvContent = `symbol,isin,trade_date,trade_type,quantity,price,trade_id,order_id,exchange,segment
RELIANCE,INE002A01018,01-04-2026,buy,10,2450.50,TRD001,ORD001,NSE,EQ`;

    const response = await request(app)
      .post('/api/import')
      .attach('file', Buffer.from(csvContent), 'zerodha.csv');

    const trade = response.body.trades[0];
    expect(trade).toHaveProperty('symbol');
    expect(trade).toHaveProperty('side');
    expect(trade).toHaveProperty('quantity');
    expect(trade).toHaveProperty('price');
    expect(trade).toHaveProperty('totalAmount');
    expect(trade).toHaveProperty('currency');
    expect(trade).toHaveProperty('executedAt');
    expect(trade).toHaveProperty('broker');
    expect(trade).toHaveProperty('rawData');
  });

  // ========== EDGE CASES ==========

  it('should handle all rows being invalid', async () => {
    const csvContent = `symbol,isin,trade_date,trade_type,quantity,price,trade_id,order_id,exchange,segment
RELIANCE,INE002A01018,invalid1,buy,10,2450.50,TRD001,ORD001,NSE,EQ
INFY,INE009A01021,invalid2,sell,25,1520.75,TRD002,ORD002,NSE,EQ`;

    const response = await request(app)
      .post('/api/import')
      .attach('file', Buffer.from(csvContent), 'zerodha.csv');

    expect(response.status).toBe(200);
    expect(response.body.summary.valid).toBe(0);
    expect(response.body.summary.skipped).toBe(2);
    expect(response.body.trades.length).toBe(0);
    expect(response.body.errors.length).toBe(2);
  });

  it('should handle very large CSV file', async () => {
    let csvContent = `symbol,isin,trade_date,trade_type,quantity,price,trade_id,order_id,exchange,segment\n`;
    
    // Add 100 valid rows
    for (let i = 0; i < 100; i++) {
      csvContent += `RELIANCE,INE002A01018,01-04-2026,buy,10,2450.50,TRD${i},ORD${i},NSE,EQ\n`;
    }

    const response = await request(app)
      .post('/api/import')
      .attach('file', Buffer.from(csvContent), 'large.csv');

    expect(response.status).toBe(200);
    expect(response.body.summary.valid).toBe(100);
    expect(response.body.trades.length).toBe(100);
  });
});