import express, { Router, Request, Response } from 'express';
import multer from 'multer';
import { detectBroker } from '../utils/detector';
import { parseZerodha } from '../parsers/zerodha';
import { parseIBKR } from '../parsers/ibkr';
import { ParseResult } from '../types/trade';

// Configure multer to store files in memory (not on disk)
const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

/**
 * POST /import
 * 
 * Accepts a CSV file upload and returns parsed trades
 * 
 * Request: multipart/form-data with file named "file"
 * Response: ParseResult with trades, errors, and summary
 */
router.post('/import', upload.single('file'), async (req: Request, res: Response) => {
  try {
    // ========== 1. CHECK IF FILE WAS UPLOADED ==========
    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded',
        message: 'Please provide a CSV file in the "file" field',
      });
    }

    // ========== 2. GET CSV TEXT FROM FILE ==========
    const csvText = req.file.buffer.toString('utf-8');

    if (!csvText.trim()) {
      return res.status(400).json({
        error: 'Empty file',
        message: 'The uploaded file is empty',
      });
    }

    // ========== 3. PARSE HEADERS TO DETECT BROKER ==========
    const lines = csvText.split('\n');
    if (lines.length < 1) {
      return res.status(400).json({
        error: 'Invalid CSV',
        message: 'CSV file must have at least a header row',
      });
    }

    const headers = lines[0].split(',').map(h => h.trim());
    const detectedBroker = detectBroker(headers);

    if (!detectedBroker) {
      return res.status(400).json({
        error: 'Unknown broker format',
        message: `Could not detect broker from headers: ${headers.join(', ')}`,
        headers,
      });
    }

    // ========== 4. PARSE CSV WITH APPROPRIATE PARSER ==========
    let parseResult;

    if (detectedBroker === 'zerodha') {
      parseResult = parseZerodha(csvText);
    } else if (detectedBroker === 'ibkr') {
      parseResult = parseIBKR(csvText);
    } else {
      return res.status(500).json({
        error: 'Parser not implemented',
        message: `Parser for ${detectedBroker} is not yet implemented`,
      });
    }

    // ========== 5. BUILD RESPONSE ==========
    const response: ParseResult = {
      broker: detectedBroker,
      summary: {
        total: parseResult.trades.length + parseResult.errors.length,
        valid: parseResult.trades.length,
        skipped: parseResult.errors.length,
      },
      trades: parseResult.trades,
      errors: parseResult.errors,
    };

    // ========== 6. RETURN RESPONSE ==========
    return res.status(200).json(response);
  } catch (error) {
    // Catch any unexpected errors
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({
      error: 'Server error',
      message: errorMsg,
    });
  }
});

export default router;