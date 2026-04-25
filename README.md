# Broker CSV Trade Import Service

A TypeScript + Express service that converts broker trade CSV files into a standardized format.

## Features

- Upload CSV files from different brokers
- Auto-detects broker format (Zerodha or Interactive Brokers)
- Validates and normalizes trade data
- Returns parsed trades + error details for invalid rows
- Comprehensive test coverage (58 tests)

## Supported Brokers

- **Zerodha** - Indian equity broker
- **Interactive Brokers (IBKR)** - International broker

## Installation

```
bash
npm install
```

## Running the Server

```
bash
npm run dev
```

Server will start on http://localhost:3000

## Running Tests
```
bash

npm test
API Documentation
Upload CSV File
Endpoint: POST /api/import
```

## Request:

```
bash

curl.exe -X POST http://localhost:3000/api/import -F "file=@trades.csv"
```

Response (Success):


```
JSON

{
  "broker": "zerodha",
  "summary": {
    "total": 7,
    "valid": 5,
    "skipped": 2
  },
  "trades": [
    {
      "symbol": "RELIANCE",
      "side": "BUY",
      "quantity": 10,
      "price": 2450.50,
      "totalAmount": 24505,
      "currency": "INR",
      "executedAt": "2026-04-01T00:00:00Z",
      "broker": "zerodha",
      "rawData": {...}
    }
  ],
  "errors": [
    {
      "row": 6,
      "reason": "Invalid date format: 'invalid_date' (expected DD-MM-YYYY)"
    },
    {
      "row": 7,
      "reason": "Validation failed: quantity: Number must be greater than 0"
    }
  ]
}
```

Response (Error):

```
JSON

{
  "error": "No file uploaded",
  "message": "Please provide a CSV file in the 'file' field"
}
```

## Zerodha CSV Format

```
csv

symbol,isin,trade_date,trade_type,quantity,price,trade_id,order_id,exchange,segment
RELIANCE,INE002A01018,01-04-2026,buy,10,2450.50,TRD001,ORD001,NSE,EQ
INFY,INE009A01021,01-04-2026,sell,25,1520.75,TRD002,ORD002,NSE,EQ
```

Key points:

- Date format: DD-MM-YYYY
- Trade type: buy or sell (case-insensitive)
- Currency: Always INR (inferred from exchange)

  
## Interactive Brokers CSV Format

```
csv

TradeID,AccountID,Symbol,DateTime,Buy/Sell,Quantity,TradePrice,Currency,Commission,NetAmount,AssetClass
U1234-001,U1234567,AAPL,2026-04-01T14:30:00Z,BOT,100,185.50,USD,-1.00,18549.00,STK
U1234-002,U1234567,MSFT,2026-04-01T15:45:00Z,SLD,50,420.25,USD,-1.00,-21011.50,STK
```

### Key points:

- Date format: ISO 8601 or MM/DD/YYYY
- Buy/Sell: BOT (buy) or SLD (sell)
- Currency: Specified in CSV (USD, EUR, INR, etc.)
- Symbols like EUR.USD are normalized to EUR/USD

 
 ### Project Structure

```
src/
├── parsers/
│   ├── zerodha.ts        # Zerodha CSV parser
│   └── ibkr.ts           # IBKR CSV parser
├── routes/
│   └── import.ts         # API endpoint
├── types/
│   └── trade.ts          # Trade schema (Zod)
├── utils/
│   ├── detector.ts       # Broker detection
│   └── dateUtils.ts      # Date conversion utilities
└── server.ts             # Express server

tests/
├── parsers/
│   ├── zerodha.test.ts   # 22 tests
│   └── ibkr.test.ts      # 23 tests
├── detector.test.ts      # 9 tests
└── api.test.ts           # 4 tests
```

### How It Works

1. Upload CSV - User sends CSV file via POST request
2. Detect Broker - System reads headers and identifies broker format
3. Parse Data - Correct parser converts CSV to standard format
4. Validate - Zod schema validates each trade
5. Respond - Returns valid trades + error details for invalid rows

   
### Test Coverage

- 58 total tests
- Zerodha parser: 22 tests
- IBKR parser: 23 tests
- Broker detection: 9 tests
- API endpoint: 4 tests

### Technologies Used

- TypeScript - Type safety
- Express - HTTP server
- Zod - Runtime validation
- Multer - File upload handling
- csv-parse - CSV parsing
- Jest - Testing framework
- Supertest - HTTP testing

 
## Scripts
```
Bash

npm run dev        # Start server with hot reload
npm run build      # Compile TypeScript
npm run start      # Run compiled code
npm test           # Run all tests
npm run test:watch # Run tests in watch mode
```

## Adding a New Broker

To add support for a new broker:

1. Create parser in src/parsers/newbroker.ts
2. Update detector in src/utils/detector.ts
3. Update API route in src/routes/import.ts
4. Write tests in tests/parsers/newbroker.test.ts

   
### Example Usage

## Test with Zerodha CSV

Create zerodha-test.csv:

```
csv

symbol,isin,trade_date,trade_type,quantity,price,trade_id,order_id,exchange,segment
RELIANCE,INE002A01018,01-04-2026,buy,10,2450.50,TRD001,ORD001,NSE,EQ
INFY,INE009A01021,01-04-2026,sell,25,1520.75,TRD002,ORD002,NSE,EQ
```

## Upload:

```
Bash

curl.exe -X POST http://localhost:3000/api/import -F "file=@zerodha-test.csv"
```

## Test with IBKR CSV

Create ibkr-test.csv:

```
csv

TradeID,AccountID,Symbol,DateTime,Buy/Sell,Quantity,TradePrice,Currency,Commission,NetAmount,AssetClass
U1234-001,U1234567,AAPL,2026-04-01T14:30:00Z,BOT,100,185.50,USD,-1.00,18549.00,STK
U1234-002,U1234567,MSFT,2026-04-01T15:45:00Z,SLD,50,420.25,USD,-1.00,-21011.50,STK
```

## Upload:

```
Bash

curl.exe -X POST http://localhost:3000/api/import -F "file=@ibkr-test.csv"
```

### Notes
- Original CSV data is preserved in rawData field
- Invalid rows are skipped, not rejected entirely
- Each error includes row number for easy debugging
- All dates normalized to ISO 8601 format
- Service maintains data integrity throughout processing
