const pool = require('../config/db');

exports.createAppointment = async (req, res) => {
  const { user_id, problem_type, appointment_date, time_slot, notes } = req.body;

  if (!user_id || !problem_type || !appointment_date || !time_slot) {
    return res.status(400).json({ success: false, message: 'Missing required booking fields.' });
  }

  try {
    // 1. Fetch user details from the database for richer audit logging
    const [userRows] = await pool.query('SELECT name, email FROM users WHERE id = ?', [user_id]);
    const userName = userRows.length > 0 ? userRows[0].name : 'Unknown';
    const userEmail = userRows.length > 0 ? userRows[0].email : 'Unknown';

    // 2. Check for slot conflicts
    const [conflict] = await pool.query(
      'SELECT id FROM appointments WHERE appointment_date = ? AND time_slot = ? AND status = "Confirmed"',
      [appointment_date, time_slot]
    );

    if (conflict.length > 0) {
      // AUDIT LOG: Booking Conflict (now with user details)
      console.log(JSON.stringify({
        level: 'warn',
        event: 'booking_conflict',
        userId: user_id,
        userName: userName,
        userEmail: userEmail,
        date: appointment_date,
        slot: time_slot,
        timestamp: new Date().toISOString()
      }));
      return res.status(409).json({ success: false, message: 'This slot is already reserved. Please select another slot.' });
    }

    // 3. Insert the new appointment
    const [result] = await pool.query(
      'INSERT INTO appointments (user_id, problem_type, appointment_date, time_slot, notes) VALUES (?, ?, ?, ?, ?)',
      [user_id, problem_type, appointment_date, time_slot, notes || '']
    );

    // AUDIT LOG: Successful Booking (now with user details)
    console.log(JSON.stringify({
      level: 'info',
      event: 'appointment_booked',
      userId: user_id,
      userName: userName,
      userEmail: userEmail,
      appointmentId: result.insertId,
      problem: problem_type,
      timestamp: new Date().toISOString()
    }));

    return res.status(201).json({
      success: true,
      message: 'Appointment booked successfully.',
      appointmentId: result.insertId
    });
  } catch (error) {
    console.log(JSON.stringify({
      level: 'error',
      event: 'database_error',
      action: 'create_appointment',
      error: error.message,
      timestamp: new Date().toISOString()
    }));
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
    console.log(JSON.stringify({
      level: 'error',
      event: 'database_error',
      action: 'get_all_appointments',
      error: error.message,
      timestamp: new Date().toISOString()
    }));
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
    // 1. Fetch appointment and user details before updating so we know who is affected
    const [apptRows] = await pool.query(`
      SELECT a.user_id, u.name, u.email 
      FROM appointments a 
      JOIN users u ON a.user_id = u.id 
      WHERE a.id = ?
    `, [id]);
    
    const userId = apptRows.length > 0 ? apptRows[0].user_id : 'Unknown';
    const userName = apptRows.length > 0 ? apptRows[0].name : 'Unknown';
    const userEmail = apptRows.length > 0 ? apptRows[0].email : 'Unknown';

    // 2. Update the status
    await pool.query('UPDATE appointments SET status = ? WHERE id = ?', [status, id]);
    
    // AUDIT LOG: Status Changed (now with user details)
    console.log(JSON.stringify({
      level: 'info',
      event: 'appointment_status_updated',
      appointmentId: id,
      userId: userId,
      userName: userName,
      userEmail: userEmail,
      newStatus: status,
      timestamp: new Date().toISOString()
    }));

    return res.status(200).json({ success: true, message: `Status updated to ${status}.` });
  } catch (error) {
    console.log(JSON.stringify({
      level: 'error',
      event: 'database_error',
      action: 'update_status',
      error: error.message,
      timestamp: new Date().toISOString()
    }));
    return res.status(500).json({ success: false, message: 'Status update failed.' });
  }
};
