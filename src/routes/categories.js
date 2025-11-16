const express = require('express');
const router = express.Router();
const { categories } = require('../config/claude');
const { getDatabase } = require('./../services/transactionService');

// router.get('/', (req, res) => {
//   res.json(categories);
// });

// module.exports = router;

router.get('/', async (req, res) => {
  try {
    const db = getDatabase();
    
    const query = `
      SELECT 
        code,
        name_en,
        name_el,
        type,
        description
      FROM categories
      ORDER BY type DESC, name_en ASC
    `;
    
    const categories = db.prepare(query).all();
    
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
