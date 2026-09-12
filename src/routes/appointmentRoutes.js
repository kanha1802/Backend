const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');

router.post('/book', appointmentController.createAppointment);
router.get('/', appointmentController.getAllAppointments);
router.patch('/:id/status', appointmentController.updateStatus);

module.exports = router;
