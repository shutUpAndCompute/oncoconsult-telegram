const fs = require('fs');
const path = require('path');

class PersistenceManager {
  constructor(dataDir = process.env.DATA_DIR || './data') {
    this.dataDir = dataDir;
    this.sessionsFile = path.join(dataDir, 'sessions.json');
    this.consultationsFile = path.join(dataDir, 'consultations.json');
    this.paymentsFile = path.join(dataDir, 'payments.json');
    
    this.ensureDataDir();
    this.sessions = this.load('sessions');
    this.consultations = this.load('consultations');
  }

  ensureDataDir() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  load(type) {
    try {
      const file = type === 'sessions' ? this.sessionsFile : this.consultationsFile;
      const data = fs.readFileSync(file, 'utf8');
      return new Map(JSON.parse(data, (key, value) => {
        if (value && typeof value === 'object' && value.__date) {
          return new Date(value.__date);
        }
        return value;
      }));
    } catch (e) {
      return new Map();
    }
  }

  save(type, data) {
    try {
      const file = type === 'sessions' ? this.sessionsFile : this.consultationsFile;
      const serialized = JSON.stringify(Array.from(data.entries()), (key, value) => {
        if (value instanceof Date) {
          return { __date: value.toISOString() };
        }
        return value;
      });
      fs.writeFileSync(file, serialized);
    } catch (e) {
      console.error('Persistence save error:', e);
    }
  }

  saveSessions() { this.save('sessions', this.sessions); }
  saveConsultations() { this.save('consultations', this.consultations); }
}

class ConsultationManager {
  constructor() {
    this.persistence = new PersistenceManager();
    this.sessions = this.persistence.sessions;
    this.consultations = this.persistence.consultations;
  }

  getSession(phoneNumber) {
    if (!this.sessions.has(phoneNumber)) {
      this.sessions.set(phoneNumber, {
        phoneNumber,
        createdAt: new Date(),
        lastActivityAt: new Date(),
        paymentVerified: false,
        cancerType: null,
        specialization: null,
        query: null,
        doctorId: null,
        consultationId: null,
        flowState: 'welcome',
        media: [],
        invalidSelections: 0,
        patientProfile: null,
        profileStep: null,
        pendingPayment: null,
        isCaregiver: false,
        caregiverConsentGiven: false,
        caregiverName: null,
        patientName: null,
        caregiverRelationship: null,
        caregiverReason: null
      });
      this.persistence.saveSessions();
    }
    return this.sessions.get(phoneNumber);
  }

  updateSession(phoneNumber, updates) {
    const session = this.getSession(phoneNumber);
    Object.assign(session, updates, { lastActivityAt: new Date() });
    this.persistence.saveSessions();
    return session;
  }

  addMediaToSession(phoneNumber, media) {
    const session = this.getSession(phoneNumber);
    session.media.push(media);
    session.lastActivityAt = new Date();
    this.persistence.saveSessions();
  }

  getDoctorIdForPatient(phoneNumber) {
    const session = this.sessions.get(phoneNumber);
    return session?.doctorId || null;
  }

  releaseDoctorIfAssigned(phoneNumber) {
    const doctorId = this.getDoctorIdForPatient(phoneNumber);
    if (doctorId) {
      this.releaseDoctor(doctorId);
    }
  }

  resetSession(phoneNumber) {
    const session = this.getSession(phoneNumber);
    const doctorId = session.doctorId;
    const hadConsultation = session.consultationId ? true : false;
    
    this.releaseDoctorIfAssigned(phoneNumber);
    
    this.sessions.set(phoneNumber, {
      phoneNumber,
      createdAt: session.createdAt,
      lastActivityAt: new Date(),
      paymentVerified: false,
      cancerType: null,
      specialization: null,
      query: null,
      doctorId: null,
      consultationId: null,
      flowState: 'welcome',
      media: [],
      invalidSelections: 0,
      patientProfile: session.patientProfile,
      profileStep: null,
      isCaregiver: session.isCaregiver,
      caregiverConsentGiven: session.caregiverConsentGiven,
      caregiverName: session.caregiverName,
      patientName: session.patientName,
      caregiverRelationship: session.caregiverRelationship,
      caregiverReason: session.caregiverReason
    });
    this.persistence.saveSessions();
    
    return { doctorId, hadConsultation };
  }

  isIdle(phoneNumber, idleMinutes = 30) {
    const session = this.sessions.get(phoneNumber);
    if (!session || !session.lastActivityAt) return false;
    const idleMs = Date.now() - new Date(session.lastActivityAt).getTime();
    return idleMs > idleMinutes * 60 * 1000;
  }

  createConsultation(phoneNumber, doctorId, sessionData) {
    if (!sessionData || !sessionData.paymentVerified) {
      console.error("Cannot initiate consultation: Payment has not been verified.");
      this.releaseDoctor(doctorId);
      return null;
    }

    const consultationId = `cons_${Date.now()}`;
    const consultation = {
      id: consultationId,
      patientPhone: phoneNumber,
      doctorId,
      ...sessionData,
      status: 'active',
      startedAt: new Date(),
      messages: []
    };
    this.consultations.set(consultationId, consultation);
    this.persistence.saveConsultations();
    
    const session = this.sessions.get(phoneNumber);
    if (session) {
      session.doctorId = doctorId;
      session.consultationId = consultationId;
      this.persistence.saveSessions();
    }
    return consultation;
  }

  addMessage(consultationId, sender, message) {
    const consultation = this.consultations.get(consultationId);
    if (consultation) {
      consultation.messages.push({ sender, message, timestamp: new Date() });
      this.persistence.saveConsultations();
    }
  }

  endConsultation(consultationId) {
    const consultation = this.consultations.get(consultationId);
    if (consultation) {
      consultation.status = 'completed';
      consultation.endedAt = new Date();
      this.persistence.saveConsultations();
    }
  }

  getPendingForAdmin() {
    return Array.from(this.consultations.values()).filter(
      c => c.status === 'active' && !c.doctorId
    );
  }

  assignDoctor(consultationId, doctorId, adminPhone) {
    const consultation = this.consultations.get(consultationId);
    if (consultation) {
      consultation.doctorId = doctorId;
      consultation.adminAssigned = adminPhone;
      consultation.assignedAt = new Date();
      this.persistence.saveConsultations();
    }
  }

  getConsultationByPatient(patientPhone) {
    return Array.from(this.consultations.values()).find(
      c => c.patientPhone === patientPhone && c.status === 'active'
    );
  }

  storeRawQueryData(consultationId, rawMediaArray) {
    const consultation = this.consultations.get(consultationId);
    if (consultation) {
      consultation.rawQueryMedia = rawMediaArray;
      this.persistence.saveConsultations();
      console.log(`Raw query data stored for consultation ${consultationId}`);
    } else {
      console.warn(`Cannot store raw query data: Consultation ID ${consultationId} not found.`);
    }
  }
}

module.exports = ConsultationManager;