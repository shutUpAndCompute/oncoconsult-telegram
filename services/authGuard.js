const { UserPersona, PersonaTypes } = require('../models/persona');

function getAdminWelcome(role) {
  const roleLabel = role === PersonaTypes.SUPER_ADMIN ? 'Super Admin' : 'Admin';
  return `${roleLabel} Mode Activated\n\nCommands:\n1. List doctors\n2. List specialties\n3. List cancer types\n4. PAY Patient <phone> <amount> <research%> <commercial%>\n5. REGISTER Doctor <name> <phone> <specialty> <cancers>\n6. REMOVE_DOCTOR <id>\n7. LIST_PENDING_DOCTORS\n8. APPROVE_DOCTOR <id>\n9. Status\n\n0. Switch Role`;
}

const AUTH_MESSAGES = {
  ADMIN_WELCOME: getAdminWelcome(PersonaTypes.SUPER_ADMIN),
  PATIENT_WELCOME: `Patient Mode\n\nCommands:\n• Type menu for options\n• Ask questions any time\n• Upload reports and connect`,
    
  CAREGIVER_WELCOME: `Caregiver Mode\n\n• Ask questions on behalf of your patient\n• Contact admin with: Talk to Admin`
};

function createAuthGuard(bot) {
  const adminSessions = new Set();

  async function checkAuth(chatId) {
    const persona = new UserPersona(String(chatId));
    
    if (persona.isAdmin() || persona.isSupport()) {
      adminSessions.add(String(chatId));
      return { 
        isAuthenticated: true, 
        isAdmin: true, 
        personaType: persona.type,
        isCaregiver: false
      };
    }
    
    if (persona.isCaregiver()) {
      return { 
        isAuthenticated: true, 
        isAdmin: false, 
        personaType: persona.type,
        isCaregiver: true
      };
    }
    
    return { 
      isAuthenticated: true, 
      isAdmin: false, 
      personaType: persona.type,
      isCaregiver: false
    };
  }

  async function sendAuthStatus(chatId, isAdmin, isCaregiver = false, personaType = 'patient') {
    if (isAdmin) {
      const welcome = getAdminWelcome(personaType);
      await bot.sendMessage(chatId, welcome, { parse_mode: 'Markdown' });
    } else if (isCaregiver) {
      await bot.sendMessage(chatId, AUTH_MESSAGES.CAREGIVER_WELCOME, { parse_mode: 'Markdown' });
    } else {
      await bot.sendMessage(chatId, AUTH_MESSAGES.PATIENT_WELCOME, { parse_mode: 'Markdown' });
    }
  }

  function isAdmin(chatId) {
    return adminSessions.has(String(chatId));
  }

  return { checkAuth, sendAuthStatus, isAdmin };
}

module.exports = {
  createAuthGuard,
  ADMIN_WELCOME: AUTH_MESSAGES.ADMIN_WELCOME,
  getAdminWelcome,
  PATIENT_WELCOME: AUTH_MESSAGES.PATIENT_WELCOME,
  CAREGIVER_WELCOME: AUTH_MESSAGES.CAREGIVER_WELCOME
};