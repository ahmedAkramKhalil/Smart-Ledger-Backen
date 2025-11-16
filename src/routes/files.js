const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { parseFile } = require('../services/fileParser');
const { analyzeRawData } = require('../config/claude');
const { insertTransactions } = require('../services/transactionService');

const { getDatabase } = require('./../services/transactionService');


const uploadDir = process.env.UPLOAD_DIR || './uploads';
// const storage = multer.diskStorage({
//   destination: uploadDir,
//   filename: (req, file, cb) => {
//     cb(null, uuidv4() + path.extname(file.originalname));
//   }
// });

const storage = multer.memoryStorage(); // Use memory storage instead of disk

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    console.log('📁 Checking file:', file.originalname);
    
    // Allowed file types
    const allowedTypes = ['.csv', '.txt', '.xlsx', '.xls'];
    const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));
    
    if (allowedTypes.includes(ext)) {
      console.log('✅ File type allowed:', ext);
      cb(null, true);
    } else {
      console.log('❌ File type rejected:', ext);
      cb(new Error(`File type not allowed. Allowed types: ${allowedTypes.join(', ')}`));
    }
  }
});



// ========================================
// UPLOAD ENDPOINT
// ========================================

router.post('/upload', upload.single('file'), async (req, res) => {
  let uploadId = null;
  
  try {
    console.log('📨 POST /api/files/upload');
    console.log('📤 File upload started');

    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'No file uploaded' 
      });
    }

    const { originalname, mimetype, size, buffer } = req.file;
    
    // CRITICAL: Check if buffer exists (memory storage)
    if (!buffer) {
      console.error('❌ No buffer - multer may be using disk storage');
      return res.status(500).json({
        success: false,
        error: 'Server configuration error: file buffer not available'
      });
    }
    
    console.log(`📄 File: ${originalname} (${size} bytes)`);
    console.log(`📄 MIME type: ${mimetype}`);
    console.log(`📄 Buffer size: ${buffer.length} bytes`);

    // Generate upload ID
    uploadId = 'upl_' + Date.now();
    const db = getDatabase();

    // Step 1: Create upload record with 'processing' status
    const insertUpload = db.prepare(`
      INSERT INTO uploads (id, file_name, file_type, file_size, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'processing', datetime('now'), datetime('now'))
    `);
    
    insertUpload.run(uploadId, originalname, mimetype, size);
    console.log('✅ Upload record created with status: processing');

    // Step 2: Read file data
    let rawFileData;
    
    if (mimetype.includes('csv') || mimetype.includes('text') || originalname.endsWith('.csv') || originalname.endsWith('.txt')) {
      // CSV/Text file
      rawFileData = buffer.toString('utf-8');
      console.log(`✅ Decoded as text: ${rawFileData.length} chars`);
      
    } else if (mimetype.includes('spreadsheet') || originalname.endsWith('.xlsx') || originalname.endsWith('.xls')) {
      // Excel file
      const xlsx = require('xlsx');
      const workbook = xlsx.read(buffer, { type: 'buffer' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      rawFileData = xlsx.utils.sheet_to_csv(firstSheet);
      console.log(`✅ Converted Excel to CSV: ${rawFileData.length} chars`);
      
    } else {
      throw new Error(`Unsupported file type: ${mimetype}`);
    }

    if (!rawFileData || rawFileData.trim().length === 0) {
      throw new Error('File is empty or could not be read');
    }

    console.log(`📊 Extracted ${rawFileData.length} bytes of data`);

    // Step 3: Analyze with Claude AI
    console.log('🤖 Calling Claude AI...');
    const analysis = await analyzeRawData(rawFileData);

    if (!analysis || !analysis.isFinancialData) {
      // Update upload status to failed
      db.prepare(`
        UPDATE uploads 
        SET status = 'failed', 
            error_message = 'Not financial data',
            updated_at = datetime('now')
        WHERE id = ?
      `).run(uploadId);
      
      return res.json({
        success: false,
        error: 'File does not contain financial data'
      });
    }

    // Step 4: Store transactions
    const transactions = analysis.transactions || [];
    console.log(`💾 Storing ${transactions.length} transactions...`);

    const insertTxn = db.prepare(`
      INSERT INTO transactions 
      (id, uploadId, account_id, date, description, amount, type, categoryCode, confidence, reasoning, counterparty, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `);

    transactions.forEach((txn) => {
      insertTxn.run(
        txn.id || 'txn_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        uploadId,
        'acc_default_001',
        txn.date,
        txn.description,
        txn.amount,
        txn.type,
        txn.categoryCode,
        txn.confidence || 0.5,
        txn.reasoning || '',
        txn.counterparty || ''
      );
    });

    console.log('✅ Transactions stored');

    // Step 5: Store predictions
    if (analysis.predictions) {
      console.log('💾 Storing predictions...');
      
      try {
        // Store recurring predictions
        if (analysis.predictions.recurring && analysis.predictions.recurring.length > 0) {
          const insertRecurring = db.prepare(`
            INSERT OR REPLACE INTO recurring_predictions 
            (id, description, categoryCode, type, avg_amount, frequency, confidence, next_expected_date, occurrence_count, last_occurrence, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
          `);
          
          analysis.predictions.recurring.forEach((pred, idx) => {
            insertRecurring.run(
              `rec_${uploadId}_${idx}`,
              pred.description || 'Unknown',
              pred.categoryCode,
              pred.type,
              pred.avgAmount || 0,
              pred.frequency || 'unknown',
              pred.confidence || 0.5,
              pred.nextExpectedDate || null,
              pred.occurrenceCount || 0,
              pred.lastOccurrence || null
            );
          });
          
          console.log(`✅ Stored ${analysis.predictions.recurring.length} recurring predictions`);
        }
        
        // Store cash flow forecasts
        if (analysis.predictions.forecast && analysis.predictions.forecast.length > 0) {
          const insertForecast = db.prepare(`
            INSERT OR REPLACE INTO cash_flow_forecasts 
            (id, month, predicted_income, predicted_expenses, net_flow, confidence)
            VALUES (?, ?, ?, ?, ?, ?)
          `);
          
          analysis.predictions.forecast.forEach((forecast) => {
            insertForecast.run(
              `fcst_${forecast.month}_${Date.now()}`,
              forecast.month,
              forecast.predictedIncome || 0,
              forecast.predictedExpenses || 0,
              forecast.netFlow || 0,
              forecast.confidence || 0.5
            );
          });
          
          console.log(`✅ Stored ${analysis.predictions.forecast.length} forecast predictions`);
        }
      } catch (predError) {
        console.error('⚠️ Error storing predictions:', predError);
        // Don't fail the whole upload
      }
    }

    // Step 6: Update upload record to 'completed'
    const updateUpload = db.prepare(`
      UPDATE uploads 
      SET status = 'completed',
          transaction_count = ?,
          analysis = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `);
    
    updateUpload.run(
      transactions.length,
      analysis.analysis || 'Analysis completed',
      uploadId
    );

    console.log('✅ Upload status updated to: completed');

    // Step 7: Return success response
    res.json({
      success: true,
      uploadId: uploadId,
      transactionCount: transactions.length,
      transactions: transactions,
      predictions: analysis.predictions,
      summary: analysis.summary,
      analysis: analysis.analysis
    });

  } catch (error) {
    console.error('❌ Upload failed:', error);

    // Update upload status to failed
    if (uploadId) {
      try {
        const db = getDatabase();
        db.prepare(`
          UPDATE uploads 
          SET status = 'failed',
              error_message = ?,
              updated_at = datetime('now')
          WHERE id = ?
        `).run(error.message, uploadId);
      } catch (dbError) {
        console.error('❌ Failed to update upload status:', dbError);
      }
    }

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ========================================
// GET UPLOADS LIST
// ========================================

router.get('/', async (req, res) => {
  try {
    const db = getDatabase();
    
    const query = `
      SELECT *
      FROM uploads
      ORDER BY created_at DESC
      LIMIT 50
    `;
    
    const uploads = db.prepare(query).all();
    
    res.json(uploads);
  } catch (error) {
    console.error('Error fetching uploads:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
// Get all uploads
// router.get('/', async (req, res) => {
//   try {
//     const db = getDatabase();
    
//     const query = `
//       SELECT *
//       FROM uploads
//       ORDER BY created_at DESC
//       LIMIT 50
//     `;
    
//     const uploads = db.prepare(query).all();
    
//     res.json(uploads);
//   } catch (error) {
//     console.error('Error fetching uploads:', error);
//     res.status(500).json({ error: error.message });
//   }
// });

// router.get('/uploads', async (req, res) => {
//   try {
//     const { getUploadHistory } = require('../services/transactionService');
//     const uploads = await getUploadHistory();
//     res.json(uploads);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

module.exports = router;
