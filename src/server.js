require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5001;

// ========================================
// CORS - MUST BE FIRST
// ========================================
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin']
}));

app.options('*', cors());

// ========================================
// REQUEST LOGGING
// ========================================
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.url}`);
  next();
});

// ========================================
// BODY PARSERS
// ========================================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// ========================================
// CREATE DIRECTORIES
// ========================================
const uploadDir = process.env.UPLOAD_DIR || './uploads';
const dataDir = './data';
[uploadDir, dataDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`✅ Created directory: ${dir}`);
  }
});

// ========================================
// ROUTES
// ========================================
const authRoutes = require('./routes/auth');
const transactionRoutes = require('./routes/transactions');
const fileRoutes = require('./routes/files');
const categoryRoutes = require('./routes/categories');
const reportRoutes = require('./routes/reports');
const exportRoutes = require('./routes/export');
const accountsRouter = require('./routes/accounts');
const categoriesRouter = require('./routes/categories'); // NEW


app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/accounts', accountsRouter);
app.use('/api/categories', categoriesRouter); // NEW
app.use('/api/uploads', fileRoutes); // ADD THIS LINE

// ========================================
// HEALTH CHECK
// ========================================
app.get('/api/health', (req, res) => {
  console.log('✅ Health check');
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// ========================================
// ERROR HANDLING
// ========================================
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    status: err.status || 500
  });
});

// ========================================
// 404 HANDLER
// ========================================
app.use((req, res) => {
  console.log('❌ 404:', req.url);
  res.status(404).json({ error: 'Endpoint not found' });
});

// ========================================
// START SERVER
// ========================================
app.listen(PORT, '0.0.0.0', () => {
  console.log('\n🚀 Smart Ledger AI Backend');
  console.log('================================');
  console.log(`✓ Port: ${PORT}`);
  console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`✓ Local: http://localhost:${PORT}/api`);
  console.log(`✓ Network: http://127.0.0.1:${PORT}/api`);
  console.log(`✓ CORS: Enabled for all origins`);
  console.log('================================\n');
});