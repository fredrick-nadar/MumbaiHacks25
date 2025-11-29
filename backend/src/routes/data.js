const express = require('express');
const multer = require('multer');
const { parse } = require('csv-parse');
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const pdfParse = require('pdf-parse');
const { Transaction } = require('../models');
const { enhanceTransactionsWithGemini, parsePdfStatementWithGemini } = require('../services/ai/gemini');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${req.user._id}-${uniqueSuffix}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/pdf',
    ];
    const allowedExtensions = ['.csv', '.xls', '.xlsx', '.pdf'];
    const fileExtension = path.extname(file.originalname).toLowerCase();

    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV, XLS, XLSX, or PDF statement files are allowed'), false);
    }
  },
});

const fsPromises = fs.promises;

const parseNumber = (value) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return 0;
    }

    const startsWithParen = trimmed.startsWith('(');
    const startsWithHyphen = trimmed.startsWith('-');
    const sanitized = trimmed
      .replace(/[₹,\s]/g, '')
      .replace(/[()]/g, '')
      .replace(/^-/, '');

    if (!sanitized) {
      return 0;
    }

    const numeric = parseFloat(sanitized);
    if (Number.isNaN(numeric)) {
      return 0;
    }

    if (startsWithParen || startsWithHyphen) {
      return -Math.abs(numeric);
    }

    return numeric;
  }

  return 0;
};

const readCsvRecords = async (filePath) => {
  const content = await fsPromises.readFile(filePath, 'utf8');

  return new Promise((resolve, reject) => {
    parse(
      content,
      {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      },
      (error, records) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(records || []);
      }
    );
  });
};

const readSpreadsheetRecords = (filePath) => {
  const workbook = XLSX.readFile(filePath, {
    cellDates: true,
    raw: false,
  });

  const firstSheetName = workbook.SheetNames?.[0];
  if (!firstSheetName) {
    return [];
  }

  const sheet = workbook.Sheets[firstSheetName];
  return XLSX.utils.sheet_to_json(sheet, {
    defval: '',
    blankrows: false,
    raw: false,
  });
};

const readPdfRecords = async (filePath) => {
  try {
    const buffer = await fsPromises.readFile(filePath)
    const parsed = await pdfParse(buffer)
    const text = parsed?.text?.trim()
    if (!text) {
      return []
    }

    const geminiRecords = await parsePdfStatementWithGemini(text)
    if (!Array.isArray(geminiRecords)) {
      return []
    }

    return geminiRecords
      .map((entry) => ({
        date: entry.date || entry.Date || null,
        description: entry.description || entry.Description || '',
        amount: entry.amount ?? entry.Amount ?? null,
        type: entry.type || entry.Type || null,
        balance: entry.balance ?? entry.Balance ?? null,
        Date: entry.date || entry.Date || null,
        Description: entry.description || entry.Description || '',
        Amount: entry.amount ?? entry.Amount ?? null,
        Type: entry.type || entry.Type || null,
        Balance: entry.balance ?? entry.Balance ?? null,
      }))
      .filter((entry) => entry.description && entry.date && (entry.amount !== null && entry.amount !== undefined))
  } catch (error) {
    console.warn('PDF parsing failed, skipping:', error.message)
    return []
  }
}

const readRecordsFromFile = async (filePath) => {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.csv') {
    return readCsvRecords(filePath);
  }

  if (ext === '.xls' || ext === '.xlsx') {
    return readSpreadsheetRecords(filePath);
  }

  if (ext === '.pdf') {
    return readPdfRecords(filePath);
  }

  throw new Error('Unsupported file type');
};

// Simple transaction categorization function
const categorizeTransaction = (description, amount) => {
  const desc = description.toLowerCase();
  
  // Income categories
  if (desc.includes('salary') || desc.includes('sal cr') || desc.includes('payroll')) {
    return { category: 'salary', type: 'credit' };
  }
  if (desc.includes('interest') || desc.includes('int cr')) {
    return { category: 'interest', type: 'credit' };
  }
  if (desc.includes('refund') || desc.includes('cashback')) {
    return { category: 'refund', type: 'credit' };
  }
  
  // Expense categories (when amount is negative or debit)
  if (desc.includes('atm') || desc.includes('cash withdrawal')) {
    return { category: 'cash_withdrawal', type: 'debit' };
  }
  if (desc.includes('fuel') || desc.includes('petrol') || desc.includes('hp petrol') || desc.includes('bharat petroleum')) {
    return { category: 'fuel', type: 'debit' };
  }
  if (desc.includes('food') || desc.includes('restaurant') || desc.includes('zomato') || desc.includes('swiggy')) {
    return { category: 'food', type: 'debit' };
  }
  if (desc.includes('grocery') || desc.includes('supermarket') || desc.includes('bigbasket') || desc.includes('dmart')) {
    return { category: 'grocery', type: 'debit' };
  }
  if (desc.includes('uber') || desc.includes('ola') || desc.includes('transport') || desc.includes('metro')) {
    return { category: 'transport', type: 'debit' };
  }
  if (desc.includes('medical') || desc.includes('hospital') || desc.includes('pharmacy') || desc.includes('apollo')) {
    return { category: 'healthcare', type: 'debit' };
  }
  if (desc.includes('electric') || desc.includes('electricity') || desc.includes('water') || desc.includes('gas')) {
    return { category: 'utilities', type: 'debit' };
  }
  if (desc.includes('amazon') || desc.includes('flipkart') || desc.includes('shopping') || desc.includes('myntra')) {
    return { category: 'shopping', type: 'debit' };
  }
  if (desc.includes('emi') || desc.includes('loan') || desc.includes('credit card')) {
    return { category: 'loan_emi', type: 'debit' };
  }
  if (desc.includes('insurance') || desc.includes('premium')) {
    return { category: 'insurance', type: 'debit' };
  }
  if (desc.includes('sip') || desc.includes('mutual fund') || desc.includes('investment')) {
    return { category: 'investment', type: 'debit' };
  }
  
  // Default categorization based on amount
  if (amount > 0) {
    return { category: 'other_income', type: 'credit' };
  } else {
    return { category: 'other_expense', type: 'debit' };
  }
};

// CSV ingestion endpoint
router.post('/ingest/csv', upload.single('csvFile'), async (req, res) => {
  let filePath;

  try {
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'No statement file uploaded',
      });
    }

    filePath = req.file.path;
    const records = await readRecordsFromFile(filePath);

    if (!records.length) {
      return res.status(400).json({
        status: 'error',
        message: 'No transactions detected in the uploaded file',
      });
    }

    const transactions = [];

    for (const record of records) {
      const dateValue = record.Date || record.date || record['Transaction Date'] || record['Txn Date'] || record['Value Date'] || record.Month || record.month;
      const descriptionValue = record.Description || record.description || record.Narration || record.narration || record.Particulars || record['Transaction Details'] || record.Category || record.category;
      const transactionTypeValue = record.transaction_type || record['Transaction Type'] || record.Type || record.type || null;
      const debitValue = record['Debit Amount'] || record.Debit || record.debit || record['Withdrawal Amt'] || record['Withdrawal'] || record.Outflow || record.outflow;
      const creditValue = record['Credit Amount'] || record.Credit || record.credit || record['Deposit Amt'] || record['Deposit'] || record.Inflow || record.inflow;
      const genericAmount = record.Amount || record.amount || record['Transaction Amount'] || record['Txn Amount'];
      const balanceValue = record['Running Balance'] || record.Balance || record.balance || record['Closing Balance'];

      const creditAmount = parseNumber(creditValue);
      const debitAmount = parseNumber(debitValue);
      let signedAmount = parseNumber(genericAmount);

      if (!signedAmount) {
        if (creditAmount) {
          signedAmount = creditAmount;
        } else if (debitAmount) {
          signedAmount = -Math.abs(debitAmount);
        }
      }

      // Skip if missing critical fields
      if (!dateValue || !descriptionValue) {
        continue;
      }

      // Skip if no amount detected
      if (!signedAmount && signedAmount !== 0) {
        continue;
      }

      let parsedDate = null;
      if (typeof dateValue === 'number') {
        const excelDate = XLSX.SSF?.parse_date_code?.(dateValue);
        if (excelDate) {
          parsedDate = new Date(Date.UTC(excelDate.y, excelDate.m - 1, excelDate.d));
        }
      }

      if (!parsedDate) {
        parsedDate = new Date(dateValue);
      }

      // If date is still invalid and we have a Month string (e.g., "January 2024"), parse it
      if (Number.isNaN(parsedDate.valueOf())) {
        const monthStr = String(dateValue).trim();
        // Try parsing month names like "January 2024", "Jan 2024", "2024-01", etc.
        const monthParsed = new Date(monthStr);
        if (!Number.isNaN(monthParsed.valueOf())) {
          parsedDate = monthParsed;
        } else {
          // Default to first day of current month if we can't parse
          parsedDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        }
      }

      // Use category from file if provided, otherwise do basic categorization
      let finalCategory = 'other';
      if (descriptionValue && typeof descriptionValue === 'string') {
        const lowerDesc = descriptionValue.toLowerCase().trim();
        // Common category names that might be in the Category column
        const validCategories = ['salary', 'freelance', 'investment', 'food', 'travel', 'shopping', 'bills', 'entertainment', 
                                 'grocery', 'fuel', 'utilities', 'healthcare', 'insurance', 'emi', 'rent', 'education'];
        if (validCategories.includes(lowerDesc)) {
          finalCategory = lowerDesc;
        } else {
          // Fallback to basic categorization if not a known category name
          const { category } = categorizeTransaction(descriptionValue, signedAmount);
          finalCategory = category;
        }
      }
      
      // Determine transaction type from CSV column if available, otherwise use amount sign
      let transactionType = signedAmount >= 0 ? 'credit' : 'debit';
      if (transactionTypeValue) {
        const typeStr = String(transactionTypeValue).toLowerCase().trim();
        if (typeStr === 'credit' || typeStr === 'cr' || typeStr === 'inflow') {
          transactionType = 'credit';
        } else if (typeStr === 'debit' || typeStr === 'dr' || typeStr === 'outflow') {
          transactionType = 'debit';
        }
      }

      transactions.push({
        userId: req.user._id,
        date: parsedDate,
        description: descriptionValue.trim(),
        amount: Math.abs(signedAmount),
        type: transactionType,
        category: finalCategory,
        balance: parseNumber(balanceValue) || null,
        rawDescription: descriptionValue,
      });
    }

    if (!transactions.length) {
      return res.status(400).json({
        status: 'error',
        message: 'No valid transactions found after parsing the file',
      });
    }

    let enrichedTransactions = transactions;
    try {
      const preparsed = transactions.map((tx) => ({
        description: tx.description,
        amount: tx.amount,
        transaction_type: tx.type === 'credit' ? 'Credit' : 'Debit',
        date: tx.date.toISOString().split('T')[0],
      }));

      const geminiResult = await enhanceTransactionsWithGemini(preparsed);
      if (Array.isArray(geminiResult) && geminiResult.length) {
        const limit = Math.min(geminiResult.length, transactions.length);
        enrichedTransactions = transactions.map((tx, index) => {
          if (index >= limit) return tx;
          const aiTx = geminiResult[index] || {};
          const updated = { ...tx };

          if (typeof aiTx.amount === 'number' && !Number.isNaN(aiTx.amount)) {
            const absoluteAmount = Math.abs(aiTx.amount);
            updated.amount = absoluteAmount;
          }
          
          // Respect the type field from Gemini if provided
          if (aiTx.type && (aiTx.type === 'credit' || aiTx.type === 'debit')) {
            updated.type = aiTx.type;
          }

          if (aiTx.date) {
            const parsedDate = new Date(aiTx.date);
            if (!Number.isNaN(parsedDate.valueOf())) {
              updated.date = parsedDate;
            }
          }

          if (aiTx.category) {
            updated.category = aiTx.category;
          }

          if (aiTx.subgroup) {
            updated.subcategory = aiTx.subgroup;
          }

          if (typeof aiTx.isRecurring === 'boolean') {
            updated.isRecurring = aiTx.isRecurring;
          }

          if (aiTx.patternType) {
            updated.patternType = aiTx.patternType;
          }

          if (aiTx.notes) {
            updated.notes = aiTx.notes;
          }

          return updated;
        });
      }
    } catch (aiError) {
      console.warn('AI enrichment skipped:', aiError.message);
    }

    const savedTransactions = await Transaction.insertMany(enrichedTransactions);

    res.json({
      status: 'success',
      message: 'Statement file processed successfully',
      data: {
        totalTransactions: savedTransactions.length,
        processed: records.length,
        sample: savedTransactions.slice(0, 5),
      },
    });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({
      status: 'error',
      message: 'File upload failed',
      error: error.message,
    });
  } finally {
    if (filePath) {
      fsPromises.unlink(filePath).catch(() => {});
    }
  }
});

module.exports = router;
