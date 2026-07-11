const fs = require('fs');
const path = require('path');
const { normalizePhone } = require('../utils/phone');

const dataDir = process.env.DATA_DIR || './data';
const adminsFile = path.join(dataDir, 'admins.json');

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

function loadAdmins() {
  try {
    const data = fs.readFileSync(adminsFile, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    console.error('Failed to parse admins.json, starting empty:', e.message);
    return [];
  }
}

function saveAdmins(admins) {
  try {
    const tempFile = adminsFile + '.tmp';
    fs.writeFileSync(tempFile, JSON.stringify(admins, null, 2));
    fs.renameSync(tempFile, adminsFile);
  } catch (e) {
    console.error('Failed to save admins:', e);
  }
}

let admins = loadAdmins();
ensureDataDir();

function getAdmin(phoneNumber) {
   const normalized = normalizePhone(phoneNumber);
   return admins.find(a => 
     normalizePhone(a.phoneNumber) === normalized || 
     normalizePhone(a.telegramId) === normalized ||
     a.phoneNumber === phoneNumber || 
     a.telegramId === phoneNumber
   );
}

function getAdmins() {
  return [...admins];
}

function addAdmin(phoneNumber, addedBy, telegramId = null, role = 'admin', name = null) {
   const normalized = normalizePhone(phoneNumber);
   const existing = getAdmin(phoneNumber);
   if (existing) return existing;
   
   const admin = {
     id: `admin_${Date.now()}`,
     phoneNumber: normalized,
     telegramId: telegramId || null,
     name: name || null,
     role: role,
     addedBy,
     addedAt: new Date(),
     active: true
   };
   
   admins.push(admin);
   saveAdmins(admins);
   return admin;
 }

function removeAdmin(phoneNumber) {
   const normalized = normalizePhone(phoneNumber);
   const index = admins.findIndex(a => 
     normalizePhone(a.phoneNumber) === normalized || 
     normalizePhone(a.telegramId) === normalized ||
     a.phoneNumber === phoneNumber || 
     a.telegramId === phoneNumber
   );
   if (index !== -1) {
     admins.splice(index, 1);
     saveAdmins(admins);
     return true;
   }
   return false;
 }

 function updateAdmin(phoneNumber, updates) {
   const admin = getAdmin(phoneNumber);
   if (!admin) return null;
   Object.assign(admin, updates);
   saveAdmins(admins);
   return admin;
 }

 function promoteToSuper(phoneNumber) {
  const admin = getAdmin(phoneNumber);
  if (admin) {
    admin.role = 'super_admin';
    saveAdmins(admins);
    return admin;
  }
  return null;
}


function isAdmin(phoneNumber) {
   const { SUPER_ADMIN_CHAT_IDS, SUPER_ADMIN_PHONES } = require('../models/persona');
   const normalized = normalizePhone(phoneNumber);
   if (SUPER_ADMIN_CHAT_IDS.includes(phoneNumber) || SUPER_ADMIN_PHONES.includes(phoneNumber) ||
       SUPER_ADMIN_PHONES.includes(normalized)) {
     return true;
   }
   const admin = getAdmin(phoneNumber);
   return admin && admin.active;
 }

 function isSuperAdmin(phoneNumber) {
   const { SUPER_ADMIN_CHAT_IDS, SUPER_ADMIN_PHONES } = require('../models/persona');
   const normalized = normalizePhone(phoneNumber);
   if (SUPER_ADMIN_CHAT_IDS.includes(phoneNumber) || SUPER_ADMIN_PHONES.includes(phoneNumber) ||
       SUPER_ADMIN_PHONES.includes(normalized)) {
     return true;
   }
   const admin = getAdmin(phoneNumber);
   return admin && admin.active && admin.role === 'super_admin';
 }

 function isAdminProfileComplete(phoneNumber) {
   const { SUPER_ADMIN_CHAT_IDS, SUPER_ADMIN_PHONES } = require('../models/persona');
   const normalized = normalizePhone(phoneNumber);
   if (SUPER_ADMIN_CHAT_IDS.includes(phoneNumber) || SUPER_ADMIN_PHONES.includes(phoneNumber) ||
       SUPER_ADMIN_PHONES.includes(normalized)) {
     return true;
   }
   
   const admin = getAdmin(phoneNumber);
   if (!admin) return false;
   return !!(admin.name && admin.phoneNumber);
 }

 module.exports = {
    getAdmin,
    getAdmins,
    addAdmin,
    removeAdmin,
    updateAdmin,
    promoteToSuper,
    isAdmin,
    isSuperAdmin,
    isAdminProfileComplete
 };
