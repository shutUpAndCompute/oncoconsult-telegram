const PersonaTypes = {
  PATIENT: 'patient',
  DOCTOR: 'doctor',
  ADMIN: 'admin',
  SUPPORT: 'support',
  SUPER_ADMIN: 'super_admin',
  UNKNOWN: 'unknown'
};

const ADMIN_PHONES = (process.env.ADMIN_PHONES || '+919999999999').split(',');
const SUPPORT_PHONES = (process.env.SUPPORT_PHONES || '').split(',').filter(p => p);

class UserPersona {
  constructor(phoneNumber) {
    this.phoneNumber = phoneNumber;
    this.type = this.identifyPersona(phoneNumber);
    this.permissions = this.getPermissions(this.type);
  }

  identifyPersona(phoneNumber) {
    const normalized = String(phoneNumber).replace('+', '');
    
    if (ADMIN_PHONES.includes(phoneNumber) || ADMIN_PHONES.includes(normalized)) {
      return PersonaTypes.SUPER_ADMIN;
    }
    
    if (SUPPORT_PHONES.includes(phoneNumber) || SUPPORT_PHONES.includes(normalized)) {
      return PersonaTypes.SUPPORT;
    }
    
    const doctor = require('./doctor').doctorRegistry.doctors.find(
      d => d.phoneNumber === phoneNumber || 
         d.phoneNumber === '+'+normalized || 
         d.telegramId === phoneNumber || 
         d.telegramId === normalized
    );
    if (doctor) {
      return PersonaTypes.DOCTOR;
    }
    
    return PersonaTypes.PATIENT;
  }

  getPermissions(type) {
    const perms = {
      [PersonaTypes.SUPER_ADMIN]: ['all', 'doctor_assign', 'system_config'],
      [PersonaTypes.SUPPORT]: ['view_all', 'patient_chat', 'doctor_chat'],
      [PersonaTypes.DOCTOR]: ['my_patients', 'reply'],
      [PersonaTypes.PATIENT]: ['my_consultations']
    };
    return perms[type] || [];
  }

  isAdmin() {
    return [PersonaTypes.ADMIN, PersonaTypes.SUPER_ADMIN].includes(this.type);
  }

  isSupport() {
    return this.type === PersonaTypes.SUPPORT;
  }

  isDoctor() {
    return this.type === PersonaTypes.DOCTOR;
  }

  isPatient() {
    return this.type === PersonaTypes.PATIENT;
  }
}

class QueryRouter {
  static routeQuery(message, persona, session) {
    if (persona.isSupport()) {
      return { route: 'support', priority: 'high' };
    }
    
    if (session.flowState === 'admin_fallback') {
      return { route: 'admin', priority: 'high' };
    }
    
    const urgentPatterns = [/emergency|urgent|now|immediately/i];
    if (urgentPatterns.some(p => p.test(message))) {
      return { route: 'admin', priority: 'high', reason: 'urgent' };
    }
    
    return { route: 'automated', priority: 'normal' };
  }
}

module.exports = { 
  UserPersona, 
  PersonaTypes, 
  ADMIN_PHONES, 
  SUPPORT_PHONES,
  QueryRouter 
};