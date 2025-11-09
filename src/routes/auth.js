const express = require('express');
const router = express.Router();

const DEMO_USER = {
  email: 'demo@smartledger.gr',
  password: 'demo123',
  id: 'usr_001',
  fullName: 'Dimitris Papadopoulos',
  company: 'Demo Company LLC'
};

router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    if (email === DEMO_USER.email && password === DEMO_USER.password) {
      return res.json({
        success: true,
        user: {
          id: DEMO_USER.id,
          email: DEMO_USER.email,
          fullName: DEMO_USER.fullName,
          company: DEMO_USER.company
        },
        token: 'demo_token_' + Date.now()
      });
    }

    res.status(401).json({ error: 'Invalid credentials' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/logout', (req, res) => {
  res.json({ success: true });
});

module.exports = router;

