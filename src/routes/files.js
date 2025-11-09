const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { parseFile } = require('../services/fileParser');
const { analyzeRawData } = require('../config/claude');
const { insertTransactions } = require('../services/transactionService');

const uploadDir = process.env.UPLOAD_DIR || './uploads';
const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    cb(null, uuidv4() + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    // Only allow text-based formats
    const allowed = ['.csv', '.xlsx', '.xls', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowed.includes(ext)) {
      console.log(`✅ File type allowed: ${ext}`);
      cb(null, true);
    } else {
      console.log(`❌ File type not allowed: ${ext}`);
      cb(new Error(`File type not supported: ${ext}. Allowed: CSV, Excel, TXT`));
    }
  },
  limits: { fileSize: 10485760 } // 10MB
});

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    console.log('\n📤 Upload started...');
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Accept-Charset', 'utf-8');
  

    console.log(`📁 File: ${req.file.originalname}`);
    console.log(`💾 Saved to: ${req.file.path}`);
    console.log(`📊 Size: ${req.file.size} bytes`);

    const uploadId = uuidv4();

    // Parse file
    console.log('📖 Reading file...');
    let rawData;
    
    try {
      rawData = await parseFile(req.file.path, req.file.mimetype);
    } catch (parseError) {
      console.error('❌ Parse error:', parseError.message);
      return res.status(400).json({ 
        error: `Failed to read file: ${parseError.message}`
      });
    }
    
    if (!rawData || rawData.trim().length === 0) {
      return res.status(400).json({ 
        error: 'File is empty or unreadable' 
      });
    }

    console.log(`✅ File parsed: ${rawData.length} characters`);

    // Send to Claude
    console.log('🤖 Sending to Claude AI for analysis...');
    let analysisResult;
    
    try {
      analysisResult = await analyzeRawData(rawData);
    } catch (claudeError) {
      console.error('❌ Claude error:', claudeError.message);
      
      // Better error handling
      if (claudeError.message.includes('timeout')) {
        return res.status(504).json({
          error: 'Claude AI timed out - file too large',
          details: 'Try a smaller file'
        });
      }
      
      return res.status(500).json({ 
        error: `Claude AI analysis failed: ${claudeError.message}`
      });
    }
    
    if (!analysisResult.isFinancialData) {
      console.log('⚠️ Not financial data');
      return res.status(400).json({
        error: 'File does not contain financial transaction data',
        analysis: analysisResult.analysis
      });
    }

    if (!analysisResult.transactions || analysisResult.transactions.length === 0) {
      console.log('⚠️ No transactions found');
      return res.status(400).json({
        error: 'No transactions could be extracted from file',
        analysis: analysisResult.analysis
      });
    }

    console.log(`✅ Found ${analysisResult.transactions.length} transactions`);

    // Store in database
    await insertTransactions(analysisResult.transactions, uploadId);

    console.log('💾 Stored in database');

    res.json({
      success: true,
      uploadId,
      transactionCount: analysisResult.transactions.length,
      analysis: analysisResult.analysis,
      summary: analysisResult.summary,
      transactions: analysisResult.transactions
    });

    console.log('✨ Upload complete!\n');

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    res.status(500).json({ 
      error: error.message || 'Upload failed'
    });
  }
});


router.get('/uploads', async (req, res) => {
  try {
    const { getUploadHistory } = require('../services/transactionService');
    const uploads = await getUploadHistory();
    res.json(uploads);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
