const fs = require('fs');
const path = require('path');
const { DoctorProfile, DoctorSpecialties, CancerSpecializations } = require('../models/doctor');

let singletonInstance = null;

class DoctorPersistence {
  constructor(dataDir = process.env.DATA_DIR || './data') {
    if (singletonInstance) {
      return singletonInstance;
    }
    this.dataDir = dataDir;
    this.doctorsFile = path.join(dataDir, 'doctors.json');
    this.pendingDoctorsFile = path.join(dataDir, 'pending_doctors.json');
    this.ensureDataDir();
    this.doctors = this.loadDoctors();
    this.pendingDoctors = this.loadPendingDoctors();
    singletonInstance = this;
  }

  ensureDataDir() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  loadDoctors() {
    try {
      const data = fs.readFileSync(this.doctorsFile, 'utf8');
      return JSON.parse(data);
    } catch (e) {
      console.error('Failed to parse doctors.json, starting empty:', e.message);
      return [];
    }
  }

  loadPendingDoctors() {
    try {
      const data = fs.readFileSync(this.pendingDoctorsFile, 'utf8');
      const parsed = JSON.parse(data);
      return parsed.map(d => ({ ...d, createdAt: d.createdAt ? new Date(d.createdAt) : new Date() }));
    } catch (e) {
      console.error('Failed to parse pending_doctors.json, starting empty:', e.message);
      return [];
    }
  }

  saveDoctors() {
    try {
      this.ensureDataDir();
      const tempFile = this.doctorsFile + '.tmp';
      fs.writeFileSync(tempFile, JSON.stringify(this.doctors, null, 2));
      fs.renameSync(tempFile, this.doctorsFile);
    } catch (e) {
      console.error('DoctorPersistence save error:', e);
    }
  }

  savePendingDoctors() {
    try {
      this.ensureDataDir();
      const tempFile = this.pendingDoctorsFile + '.tmp';
      fs.writeFileSync(tempFile, JSON.stringify(this.pendingDoctors, null, 2));
      fs.renameSync(tempFile, this.pendingDoctorsFile);
    } catch (e) {
      console.error('DoctorPersistence save error:', e);
    }
  }

  getDoctors() {
    return this.doctors.map(d => ({
      ...d,
      available: d.available ?? true
    }));
  }

  getPendingDoctors() {
    return [...this.pendingDoctors];
  }

  getDoctorById(id) {
    return this.doctors.find(d => d.id === id);
  }

  // Single source of truth for "which registered doctor is this Telegram
  // chat". Previously reimplemented independently at ~16 call sites across
  // telegramBot.js and conversationFlow.js, in three different (and
  // inconsistent) shapes: some checked telegramId OR a '+'-stripped phone
  // match (the correct/complete form), some checked telegramId OR the raw
  // phoneNumber with no '+' stripping (silently never matches a doctor
  // stored with a '+' prefix), and several checked telegramId only -
  // meaning a doctor who registered by phone but hasn't yet sent /start
  // (so has no telegramId set) would be found by some code paths and not
  // others, depending on which copy happened to run.
  findByChatId(chatId) {
    const id = String(chatId);
    return this.getDoctors().find(d => d.telegramId === id || String(d.phoneNumber).replace('+', '') === id);
  }

  // Same idea for a pending (not-yet-accepted) invitation - was duplicated
  // twice with a narrower match (raw phoneNumber, no '+' stripping) than
  // findByChatId's, so an invitation sent to a '+'-prefixed number would
  // silently never be found by chat ID.
  findPendingByChatId(chatId) {
    const id = String(chatId);
    return this.pendingDoctors.find(d => d.status === 'invited' &&
      (d.telegramId === id || String(d.phoneNumber).replace('+', '') === id));
  }

  // The inverse operation: given a doctor record, which Telegram chat id
  // to actually message. Was duplicated as an inline `||` fallback at each
  // notification call site.
  static chatIdFor(doctor) {
    return doctor?.telegramId || String(doctor?.phoneNumber || '').replace('+', '') || null;
  }

  addDoctor(doctorData) {
    const doctor = new DoctorProfile(doctorData);
    this.doctors.push(doctor);
    this.saveDoctors();
    return doctor;
  }

  createDoctorRequest(doctorData, adminPhone) {
    const request = {
      id: `inv_doc_${Date.now()}`,
      ...doctorData,
      createdAt: new Date(),
      status: 'invited',
      approvedBy: adminPhone,
      invitedBy: adminPhone
    };
    this.pendingDoctors.push(request);
    this.savePendingDoctors();
    return request;
  }

  acceptDoctorInvitation(doctorId, telegramId) {
    const pending = this.pendingDoctors.find(d => d.id === doctorId && d.status === 'invited');
    if (!pending) return null;
    
    const acceptedDoctor = {
      ...pending,
      id: `doc_${Date.now()}`,
      telegramId: telegramId,
      available: true,
      approvedAt: new Date()
    };
    
    this.doctors.push(acceptedDoctor);
    this.pendingDoctors = this.pendingDoctors.filter(d => d.id !== doctorId);
    this.saveDoctors();
    this.savePendingDoctors();
    return acceptedDoctor;
  }

  approveDoctor(doctorId, approvedBy) {
    const pending = this.pendingDoctors.find(d => d.id === doctorId);
    if (!pending) return null;
    
    const approvedDoctor = {
      ...pending,
      telegramId: pending.telegramId || null,
      available: true,
      approvedAt: new Date(),
      approvedBy: approvedBy
    };
    
    this.doctors.push(approvedDoctor);
    this.pendingDoctors = this.pendingDoctors.filter(d => d.id !== doctorId);
    this.saveDoctors();
    this.savePendingDoctors();
    return approvedDoctor;
  }

  getDoctorsByAdmin(adminPhone) {
    return this.doctors.filter(d => d.approvedBy === adminPhone);
  }

  getAdminForDoctor(doctorId) {
    const doctor = this.doctors.find(d => d.id === doctorId);
    return doctor?.approvedBy || null;
  }

  rejectDoctor(doctorId) {
    this.pendingDoctors = this.pendingDoctors.filter(d => d.id !== doctorId);
    this.savePendingDoctors();
    return true;
  }

  updateDoctor(id, updates) {
    const doctor = this.doctors.find(d => d.id === id);
    if (doctor) {
      Object.assign(doctor, updates);
      this.saveDoctors();
      return doctor;
    }
    return null;
  }

  removeDoctor(id) {
    const index = this.doctors.findIndex(d => d.id === id);
    if (index !== -1) {
      this.doctors.splice(index, 1);
      this.saveDoctors();
      return true;
    }
    return false;
  }

  seedDefaultDoctors() {
    if (this.doctors.length > 0) return;
    
    const defaultDoctors = [
      {
        id: 'doc_001',
        name: 'Dr. Rajesh Sharma',
        phoneNumber: '+919876543210',
        specialty: DoctorSpecialties.MEDICAL_ONCOLOGIST,
        cancerTypes: ['lung', 'liver', 'pancreatic'],
        qualifications: ['MBBS', 'MD Oncology', 'DM Medical Oncology'],
        experience: 15,
        consultationFee: 2000,
        languages: ['en', 'hi'],
        hospital: 'Apollo Hospitals, Delhi',
        city: 'Delhi'
      },
      {
        id: 'doc_002',
        name: 'Dr. Priya Patel',
        phoneNumber: '+919876543211',
        specialty: DoctorSpecialties.SURGICAL_ONCOLOGIST,
        cancerTypes: ['breast', 'ovarian', 'uterine', 'cervical'],
        qualifications: ['MBBS', 'MS Surgery', 'DNB Surgical Oncology'],
        experience: 12,
        consultationFee: 2500,
        languages: ['en', 'gu'],
        hospital: 'Tata Memorial, Mumbai',
        city: 'Mumbai'
      },
      {
        id: 'doc_003',
        name: 'Dr. Mohammed Irfan',
        phoneNumber: '+919876543212',
        specialty: DoctorSpecialties.HEMATOLOGIST,
        cancerTypes: ['blood', 'leukemia', 'lymphoma'],
        qualifications: ['MBBS', 'MD Internal Medicine', 'DM Hematology'],
        experience: 14,
        consultationFee: 2000,
        languages: ['en', 'ur'],
        hospital: 'CMC, Vellore',
        city: 'Vellore'
      },
      {
        id: 'doc_004',
        name: 'Dr. Anjali Menon',
        phoneNumber: '+919876543213',
        specialty: DoctorSpecialties.PALLIATIVE_CARE,
        cancerTypes: ['general'],
        qualifications: ['MBBS', 'MD Palliative Medicine'],
        experience: 11,
        consultationFee: 1500,
        languages: ['en', 'ml'],
        hospital: 'Palliative Care Center, Kerala',
        city: 'Kerala'
      }
    ];
    
    this.doctors = defaultDoctors.map(d => ({
      ...d,
      telegramId: null,
      available: d.available ?? true
    }));
    this.saveDoctors();
  }
}

module.exports = DoctorPersistence;