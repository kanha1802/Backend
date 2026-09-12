const pool = require('../config/db');

exports.createAppointment = async (req, res) => {
  const { user_id, problem_type, appointment_date, time_slot, notes } = req.body;

  if (!user_id || !problem_type || !appointment_date || !time_slot) {
    return res.status(400).json({ success: false, message: 'Missing required booking fields.' });
  }

  try {
    const [conflict] = await pool.query(
      'SELECT id FROM appointments WHERE appointment_date = ? AND time_slot = ? AND status = "Confirmed"',
      [appointment_date, time_slot]
    );

    if (conflict.length > 0) {
      return res.status(409).json({ success: false, message: 'This slot is already reserved. Please select another slot.' });
    }

    const [result] = await pool.query(
      'INSERT INTO appointments (user_id, problem_type, appointment_date, time_slot, notes) VALUES (?, ?, ?, ?, ?)',
      [user_id, problem_type, appointment_date, time_slot, notes || '']
    );

    return res.status(201).json({
      success: true,
      message: 'Appointment booked successfully.',
      appointmentId: result.insertId
    });
  } catch (error) {
    console.error('Error creating appointment:', error);
    return res.status(500).json({ success: false, message: 'Database error while booking.' });
  }
};

exports.getAllAppointments = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        a.id, 
        u.name AS patient_name, 
        u.mobile AS patient_mobile, 
        a.problem_type, 
        DATE_FORMAT(a.appointment_date, '%Y-%m-%d') AS appointment_date, 
        a.time_slot, 
        a.notes, 
        a.status,
        a.created_at
      FROM appointments a
      JOIN users u ON a.user_id = u.id
      ORDER BY a.appointment_date DESC, a.time_slot ASC
    `);

    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching appointments:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve appointments.' });
  }
};

exports.updateStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['Confirmed', 'Completed', 'Cancelled'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status provided.' });
  }

  try {
    await pool.query('UPDATE appointments SET status = ? WHERE id = ?', [status, id]);
    return res.status(200).json({ success: true, message: `Status updated to ${status}.` });
  } catch (error) {
    console.error('Error updating status:', error);
    return res.status(500).json({ success: false, message: 'Status update failed.' });
  }
};
