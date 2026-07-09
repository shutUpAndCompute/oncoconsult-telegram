const fs = require('fs');
const path = require('path');

// Matches FlowStates.WELCOME in conversationFlow.js. Kept as a local
// constant instead of requiring conversationFlow.js here to avoid coupling
// the persistence layer to the flow layer (and the circular-require risk
// that would come with it, since conversationFlow.js is constructed with
// a ConsultationManager instance).
const WELCOME_STATE = 'welcome';

let singletonInstance = null;

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
      console.error(`Failed to parse ${type}, starting empty:`, e.message);
      return new Map();
    }
  }

  save(type, data) {
    try {
      const file = type === 'sessions' ? this.sessionsFile : this.consultationsFile;
      const tempFile = file + '.tmp';
      const serialized = JSON.stringify(Array.from(data.entries()), (key, value) => {
        if (value instanceof Date) {
          return { __date: value.toISOString() };
        }
        return value;
      });
      fs.writeFileSync(tempFile, serialized);
      fs.renameSync(tempFile, file);
    } catch (e) {
      console.error('Persistence save error:', e);
    }
  }

  saveSessions() { this.save('sessions', this.sessions); }
  saveConsultations() { this.save('consultations', this.consultations); }
}

class ConsultationManager {
  constructor(doctorRouter = null) {
    if (singletonInstance) {
      return singletonInstance;
    }
    this.persistence = new PersistenceManager();
    this.sessions = this.persistence.sessions;
    this.consultations = this.persistence.consultations;
    this.doctorRouter = doctorRouter;
    singletonInstance = this;
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
        flowState: WELCOME_STATE,
        media: [],
        invalidSelections: 0,
        patientProfile: null,
        profileStep: null,
        pendingPayment: null,
        selectedPersona: null,
        isCaregiver: false,
        caregiverConsentGiven: false,
        caregiverName: null,
        patientName: null,
        caregiverRelationship: null,
        caregiverReason: null,
        consentsGiven: false
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

  addMediaToConsultation(phoneNumber, media) {
    const consultation = this.getConsultationByPatient(phoneNumber);
    const session = this.sessions.get(phoneNumber);
    
    if (consultation) {
      consultation.messages.push({
        type: 'media',
        media,
        sender: 'patient',
        timestamp: new Date()
      });
      this.persistence.saveConsultations();
    }
    
    if (session) {
      session.media.push(media);
      if (session.patientProfile) {
        session.patientProfile.medicalReports = session.patientProfile.medicalReports || [];
        session.patientProfile.medicalReports.push({
          id: media.id || `rep_${Date.now()}`,
          fileId: media.fileId,
          type: media.type,
          reportType: media.reportType || 'general',
          uploadedAt: new Date()
        });
      }
      session.lastActivityAt = new Date();
      this.persistence.saveSessions();
    }
  }

  getDoctorIdForPatient(phoneNumber) {
    const session = this.sessions.get(phoneNumber);
    return session?.doctorId || null;
  }

  releaseDoctorIfAssigned(phoneNumber) {
    const session = this.sessions.get(phoneNumber);
    const doctorId = session?.doctorId;
    if (doctorId && this.doctorRouter) {
      this.doctorRouter.releaseDoctor(doctorId);
    }
  }

  resetSession(phoneNumber) {
    const session = this.getSession(phoneNumber);
    const doctorId = session.doctorId;
    const hadConsultation = session.consultationId ? true : false;
    const preservedProfile = session.patientProfile;
    const preservedMedia = session.media || [];
    const preservedPersona = session.selectedPersona;
    const preservedCaregiverData = {
      isCaregiver: session.isCaregiver,
      caregiverConsentGiven: session.caregiverConsentGiven,
      caregiverName: session.caregiverName,
      patientName: session.patientName,
      caregiverRelationship: session.caregiverRelationship,
      caregiverReason: session.caregiverReason
    };
    
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
      flowState: WELCOME_STATE,
      media: preservedMedia,
      invalidSelections: 0,
      patientProfile: preservedProfile,
      profileStep: null,
      ...preservedCaregiverData,
      selectedPersona: preservedPersona || null
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
      if (this.doctorRouter) this.doctorRouter.releaseDoctor(doctorId);
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

  reassignDoctor(consultationId, newDoctorId) {
    const consultation = this.consultations.get(consultationId);
    if (consultation && consultation.status === 'active') {
      consultation.doctorId = newDoctorId;
      consultation.reassignedAt = new Date();
      this.persistence.saveConsultations();
      
      const session = this.sessions.get(consultation.patientPhone);
      if (session) {
        session.doctorId = newDoctorId;
        this.persistence.saveSessions();
      }
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

  hasActiveOrPendingConsultation(patientPhone) {
    return Array.from(this.consultations.values()).some(
      c => c.patientPhone === patientPhone && ['active', 'pending'].includes(c.status)
    );
  }

  createPendingConsultation(phoneNumber, session) {
    const consultationId = `pending_${Date.now()}`;
    const consultation = {
      id: consultationId,
      patientPhone: phoneNumber,
      status: 'pending',
      startedAt: new Date(),
      cancerType: session?.cancerType || null,
      media: session?.media || [],
      medicalReports: session?.patientProfile?.medicalReports || [],
      patientProfile: session?.patientProfile || null,
      isCaregiver: session?.isCaregiver || false,
      caregiverName: session?.caregiverName || null,
      patientName: session?.patientName || null,
      caregiverRelationship: session?.caregiverRelationship || null,
      caregiverReason: session?.caregiverReason || null,
      paymentTransaction: session?.paymentTransaction || null
    };
    this.consultations.set(consultationId, consultation);
    this.persistence.saveConsultations();
    return consultation;
  }

  getPendingConsultationByPatient(patientPhone) {
    return Array.from(this.consultations.values()).find(
      c => c.patientPhone === patientPhone && c.status === 'pending'
    );
  }

  cleanupStalePendingConsultations(maxAgeHours = 24) {
    const cutoff = Date.now() - maxAgeHours * 60 * 60 * 1000;
    let cleaned = 0;
    for (const [id, c] of this.consultations) {
      if (c.status === 'pending' && new Date(c.startedAt).getTime() < cutoff) {
        this.consultations.delete(id);
        cleaned++;
      }
    }
    if (cleaned > 0) this.persistence.saveConsultations();
    return cleaned;
  }

  cleanupStaleSessions(idleMinutes = 1440) {
    const cutoff = Date.now() - idleMinutes * 60 * 1000;
    let cleaned = 0;
    for (const [phone, s] of this.sessions) {
      if (new Date(s.lastActivityAt).getTime() < cutoff) {
        this.sessions.delete(phone);
        cleaned++;
      }
    }
    if (cleaned > 0) this.persistence.saveSessions();
    return cleaned;
  }

cleanupAllStale(pendingAgeHours = 24, idleMinutes = 1440) {
    return {
      pendingConsultations: this.cleanupStalePendingConsultations(pendingAgeHours),
      staleSessions: this.cleanupStaleSessions(idleMinutes)
    };
  }

  closeConsultation(consultationId, closedBy = 'admin') {
    const consultation = this.consultations.get(consultationId);
    if (!consultation) return false;
    
    if (consultation.status === 'active' || consultation.status === 'pending') {
      consultation.status = 'closed';
      consultation.closedAt = new Date();
      consultation.closedBy = closedBy;
      this.persistence.saveConsultations();
      
      const session = this.sessions.get(consultation.patientPhone);
      if (session) {
        session.consultationId = null;
        session.flowState = 'welcome';
        this.persistence.saveSessions();
      }
      return true;
    }
    return false;
  }

  getConsultationById(consultationId) {
    return this.consultations.get(consultationId) || null;
  }
}

module.exports = ConsultationManager;
