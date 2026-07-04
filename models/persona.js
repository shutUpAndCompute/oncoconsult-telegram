const { normalizePhone } = require('../utils/phone');

const PersonaTypes = {
  PATIENT: 'patient',
  DOCTOR: 'doctor',
  ADMIN: 'admin',
  SUPPORT: 'support',
  SUPER_ADMIN: 'super_admin',
  UNKNOWN: 'unknown'
};

const SUPER_ADMIN_CHAT_IDS = (process.env.SUPER_ADMIN_CHAT_IDS || '').split(',').map(p => p.trim()).filter(p => p);
const SUPER_ADMIN_PHONES = (process.env.SUPER_ADMIN_PHONES || '').split(',').map(p => p.trim().replace('+', '')).filter(p => p);
const SUPPORT_PHONES = (process.env.SUPPORT_PHONES || '').split(',').map(p => p.trim().replace('+', '')).filter(p => p);

let userRegistryCache = null;
let adminRegistryCache = null;
let doctorPersistenceCache = null;

function getUserRegistry() {
  if (!userRegistryCache) {
    try {
      const UserRegistry = require('../services/userRegistry');
      userRegistryCache = new UserRegistry();
    } catch (e) {
      userRegistryCache = { getUser: () => null, getUserByPhone: () => null };
    }
  }
  return userRegistryCache;
}

function getAdminRegistry() {
  if (!adminRegistryCache) {
    try {
      adminRegistryCache = require('../services/adminRegistry');
    } catch (e) {
      adminRegistryCache = { getAdmins: () => [] };
    }
  }
  return adminRegistryCache;
}

function getDoctorPersistence() {
  if (!doctorPersistenceCache) {
    try {
      const DoctorPersistence = require('../services/doctorPersistence');
      doctorPersistenceCache = new DoctorPersistence();
    } catch (e) {
      doctorPersistenceCache = { getDoctors: () => [] };
    }
  }
  return doctorPersistenceCache;
}

class UserPersona {
  constructor(phoneNumber) {
    this.phoneNumber = phoneNumber;
    this.type = this.identifyPersona(phoneNumber);
    this.permissions = this.getPermissions(this.type);
  }

  identifyPersona(phoneNumber) {
    const normalized = normalizePhone(phoneNumber);

    if (SUPER_ADMIN_CHAT_IDS.includes(phoneNumber) || SUPER_ADMIN_CHAT_IDS.includes(normalized)) {
      return PersonaTypes.SUPER_ADMIN;
    }
    if (SUPER_ADMIN_PHONES.includes(phoneNumber) || SUPER_ADMIN_PHONES.includes(normalized)) {
      return PersonaTypes.SUPER_ADMIN;
    }

    if (SUPPORT_PHONES.includes(phoneNumber) || SUPPORT_PHONES.includes(normalized)) {
      return PersonaTypes.SUPPORT;
    }

    const userRegistry = getUserRegistry();
    const user = userRegistry.getUser(phoneNumber) || userRegistry.getUserByPhone(phoneNumber);
    if (user) {
      if (user.approvedRoles.includes('doctor')) return PersonaTypes.DOCTOR;
      if (user.approvedRoles.includes('admin')) return PersonaTypes.ADMIN;
      if (user.approvedRoles.includes('support')) return PersonaTypes.SUPPORT;
      if (user.approvedRoles.includes('caregiver')) return PersonaTypes.CAREGIVER;
    }

    const adminRegistry = getAdminRegistry();
    const registryAdmin = adminRegistry.getAdmins().find(
      a => normalizePhone(a.phoneNumber) === normalized ||
           normalizePhone(a.telegramId) === normalized ||
           a.phoneNumber === phoneNumber ||
           a.telegramId === phoneNumber
    );
    if (registryAdmin) {
      return registryAdmin.role === 'super_admin'
        ? PersonaTypes.SUPER_ADMIN
        : PersonaTypes.ADMIN;
    }

    const doctorPersistence = getDoctorPersistence();
    const doctor = doctorPersistence.getDoctors().find(
      d => normalizePhone(d.phoneNumber) === normalized ||
           d.telegramId === phoneNumber ||
           d.telegramId === normalized
    );
    if (doctor) return PersonaTypes.DOCTOR;

    return PersonaTypes.PATIENT;
  }

  getPermissions(type) {
    const perms = {
      [PersonaTypes.SUPER_ADMIN]: ['all', 'doctor_assign', 'system_config'],
      [PersonaTypes.SUPPORT]: ['view_all', 'patient_chat', 'doctor_chat'],
      [PersonaTypes.DOCTOR]: ['my_patients', 'reply'],
      [PersonaTypes.CAREGIVER]: ['my_consultations', 'patient_on_behalf'],
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

  isCaregiver() {
    return this.type === PersonaTypes.CAREGIVER;
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
  SUPER_ADMIN_CHAT_IDS,
  SUPER_ADMIN_PHONES,
  SUPPORT_PHONES,
  QueryRouter 
};