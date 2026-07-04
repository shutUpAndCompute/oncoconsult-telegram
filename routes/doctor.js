const express = require('express');
const router = express.Router();
const ConsultationManager = require('../services/consultationManager');
const DoctorRouter = require('../services/doctorRouter');
const DoctorPersistence = require('../services/doctorPersistence');
const { DoctorProfile, DoctorSpecialties } = require('../models/doctor');
const { simpleRateLimit } = require('../middleware/validation');

function sanitizePhone(phone) {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length === 0) return null;
  return digits;
}

const consultationManager = new ConsultationManager();
const doctorRouter = new DoctorRouter();
const doctorPersistence = new DoctorPersistence();

router.get('/list', simpleRateLimit, (req, res) => {
  const doctors = doctorPersistence.getDoctors();
  res.json(doctors);
});

router.post('/register', simpleRateLimit, (req, res) => {
  const { name, phoneNumber, specialty, cancerTypes } = req.body;
  
  if (!name || !specialty) {
    return res.status(400).json({ error: 'name and specialty required' });
  }
  
  const doctor = doctorPersistence.addDoctor({
    name,
    phoneNumber: sanitizePhone(phoneNumber),
    specialty,
    cancerTypes: Array.isArray(cancerTypes) ? cancerTypes : []
  });
  
  if (doctor) {
    res.json({ success: true, doctor: doctor.id });
  } else {
    res.status(500).json({ error: 'Failed to register doctor' });
  }
});

router.put('/:doctorId', simpleRateLimit, (req, res) => {
  const doctorId = sanitizePhone(req.params.doctorId);
  
  if (!doctorId) {
    return res.status(400).json({ error: 'Invalid doctorId' });
  }
  
  const updated = doctorPersistence.updateDoctor(doctorId, req.body);
  if (updated) {
    res.json({ success: true, doctor: updated });
  } else {
    res.status(404).json({ error: 'Doctor not found' });
  }
});

router.delete('/:doctorId', simpleRateLimit, (req, res) => {
  const doctorId = sanitizePhone(req.params.doctorId);
  
  if (!doctorId) {
    return res.status(400).json({ error: 'Invalid doctorId' });
  }
  
  const removed = doctorPersistence.removeDoctor(doctorId);
  res.json({ success: removed });
});

router.get('/consultations/:doctorId', simpleRateLimit, (req, res) => {
  const doctorId = sanitizePhone(req.params.doctorId);
  
  if (!doctorId) {
    return res.status(400).json({ error: 'Invalid doctorId' });
  }
  
  const consultations = Array.from(consultationManager.consultations.values())
    .filter(c => c.doctorId === doctorId && c.status === 'active');
  res.json(consultations);
});

router.post('/assign', simpleRateLimit, async (req, res) => {
  const { patientChatId, doctorId, adminPhone } = req.body;
  
  if (!patientChatId || !doctorId) {
    return res.status(400).json({ error: 'patientChatId and doctorId required' });
  }
  
  const consultation = Array.from(consultationManager.consultations.values())
    .find(c => c.patientPhone === patientChatId);
  
  if (!consultation) {
    return res.status(404).json({ error: 'Consultation not found' });
  }
  
  consultationManager.assignDoctor(consultation.id, doctorId, adminPhone);
  
  const session = consultationManager.getSession(patientChatId);
  const tg = global.__telegramAdapter;
  
  if (tg && session?.media?.length > 0) {
    const doctor = doctorPersistence.getDoctorById(doctorId);
    const doctorTelegramId = doctor?.telegramId || String(doctor?.phoneNumber).replace('+', '');
    if (doctorTelegramId) {
      await tg.bot.sendMessage(doctorTelegramId, 
        `📩 Assigned Consultation\nPatient Chat ID: ${patientChatId}\nDocs: ${session.media.length}\nAsk patient to re-send docs.`
      ).catch(() => {});
    }
  }
  
  res.json({ assigned: true });
});

router.post('/complete', simpleRateLimit, (req, res) => {
  const { doctorId, patientPhone } = req.body;
  
  if (!doctorId || !patientPhone) {
    return res.status(400).json({ error: 'doctorId and patientPhone required' });
  }
  
  const session = consultationManager.getSession(patientPhone);
  if (session && session.doctorId === doctorId) {
    consultationManager.endConsultation(session.consultationId);
    doctorRouter.releaseDoctor(doctorId);
    res.json({ completed: true });
  } else {
    res.status(404).json({ error: 'Consultation not found' });
  }
});

module.exports = router;