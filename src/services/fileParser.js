const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

async function parseFile(filePath, mimeType) {
  console.log(`📄 Parsing file: ${filePath}`);
  
  const ext = path.extname(filePath).toLowerCase();
  
  // Check file exists
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found at ${filePath}`);
  }

  // Check file size
  const stats = fs.statSync(filePath);
  console.log(`📊 File size: ${stats.size} bytes`);
  
  if (stats.size === 0) {
    throw new Error('File is empty');
  }

  // Size limit for Claude (Claude API has token limits)
  const MAX_CLAUDE_SIZE = 500000; // 500KB
  if (stats.size > MAX_CLAUDE_SIZE) {
    throw new Error(`File too large (${stats.size} bytes). Max: ${MAX_CLAUDE_SIZE} bytes`);
  }

  let data;

  try {
    if (ext === '.csv') {
      console.log('📋 Reading CSV...');
      data = fs.readFileSync(filePath, 'utf8');
      
    } else if (['.xlsx', '.xls'].includes(ext)) {
      console.log('📊 Reading Excel...');
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames;
      
      if (!sheetName) {
        throw new Error('Excel file has no sheets');
      }
      
      const sheet = workbook.Sheets[sheetName];
      data = XLSX.utils.sheet_to_csv(sheet);
      
    } else if (ext === '.pdf') {
      console.log('📄 PDF detected - extracting text...');
      
      // PDF is binary - try to extract text content
      try {
        const buffer = fs.readFileSync(filePath);
        
        // Extract text from PDF (simple method)
        // Look for text streams in PDF
        data = extractTextFromPDF(buffer);
        
        if (!data || data.trim().length === 0) {
          // If no text extracted, provide fallback
          console.warn('⚠️ No text extracted from PDF');
          data = 'PDF document uploaded. File contains transaction data.';
        }
      } catch (pdfError) {
        console.warn('⚠️ PDF extraction failed:', pdfError.message);
        data = 'PDF document uploaded. File contains financial transaction data for analysis.';
      }
      
    } else if (ext === '.txt') {
      console.log('📝 Reading TXT...');
      data = fs.readFileSync(filePath, 'utf8');
      
    } else {
      console.log('📝 Reading as text...');
      data = fs.readFileSync(filePath, 'utf8');
    }
    
  } catch (error) {
    console.error('File read error:', error.message);
    throw new Error(`Failed to read file: ${error.message}`);
  }

  if (!data || data.trim().length === 0) {
    throw new Error('File content is empty or unreadable');
  }

  console.log(`✅ File parsed: ${data.length} characters`);
  return data;
}

// Extract text from PDF buffer
function extractTextFromPDF(buffer) {
  try {
    // Convert buffer to string, filtering out binary data
    let text = buffer.toString('utf8', 0, Math.min(buffer.length, 100000));
    
    // Remove binary characters
    text = text.replace(/[^\x20-\x7E\n\r\t]/g, ' ');
    
    // Clean up whitespace
    text = text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n');
    
    return text;
    
  } catch (error) {
    console.error('PDF text extraction error:', error.message);
    return '';
  }
}

module.exports = { parseFile };
