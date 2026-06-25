const express = require('express');
const router = express.Router();
const ConsultationManager = require('../services/consultationManager');
const DoctorRouter = require('../services/doctorRouter');
const DoctorPersistence = require('../services/doctorPersistence');
const { DoctorProfile, DoctorSpecialties } = require('../models/doctor');

const consultationManager = new ConsultationManager();
const doctorRouter = new DoctorRouter();
const doctorPersistence = new DoctorPersistence();

router.get('/list', (req, res) => {
  const doctors = doctorPersistence.getDoctors();
  res.json(doctors);
});

router.post('/register', (req, res) => {
  const doctor = doctorPersistence.addDoctor(req.body);
  res.json({ success: true, doctor: doctor.id });
});

router.put('/:doctorId', (req, res) => {
  const { doctorId } = req.params;
  const updated = doctorPersistence.updateDoctor(doctorId, req.body);
  if (updated) {
    res.json({ success: true, doctor: updated });
  } else {
    res.status(404).json({ error: 'Doctor not found' });
  }
});

router.delete('/:doctorId', (req, res) => {
  const { doctorId } = req.params;
  const removed = doctorPersistence.removeDoctor(doctorId);
  res.json({ success: removed });
});

router.get('/consultations/:doctorId', (req, res) => {
  const { doctorId } = req.params;
  const consultations = Array.from(consultationManager.consultations.values())
    .filter(c => c.doctorId === doctorId && c.status === 'active');
  res.json(consultations);
});

router.post('/assign', async (req, res) => {
  const { patientChatId, doctorId, adminPhone } = req.body;
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

router.post('/complete', (req, res) => {
  const { doctorId, patientPhone } = req.body;
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