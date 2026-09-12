const pool = require('../config/db');

exports.registerOrGetUser = async (req, res) => {
  const { name, mobile } = req.body;

  if (!name || !mobile) {
    return res.status(400).json({ success: false, message: 'Name and mobile number are required.' });
  }

  const cleanMobile = mobile.trim();
  const cleanName = name.trim();

  try {
    const [existing] = await pool.query('SELECT * FROM users WHERE mobile = ?', [cleanMobile]);
    
    if (existing.length > 0) {
      return res.status(200).json({
        success: true,
        message: 'Patient profile loaded.',
        user: existing[0]
      });
    }

    const [result] = await pool.query('INSERT INTO users (name, mobile) VALUES (?, ?)', [cleanName, cleanMobile]);
    return res.status(201).json({
      success: true,
      message: 'Registration successful.',
      user: { id: result.insertId, name: cleanName, mobile: cleanMobile }
    });
  } catch (error) {
    console.error('Error in user registration:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
