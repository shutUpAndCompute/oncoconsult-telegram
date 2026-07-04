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
    return [];
  }
}

function saveAdmins(admins) {
  try {
    fs.writeFileSync(adminsFile, JSON.stringify(admins, null, 2));
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

function addAdmin(phoneNumber, addedBy, telegramId = null, role = 'admin') {
   const normalized = normalizePhone(phoneNumber);
   const existing = getAdmin(phoneNumber);
   if (existing) return existing;
  
   const admin = {
     id: `admin_${Date.now()}`,
     phoneNumber: normalized,
     telegramId: telegramId || null,
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

function promoteToSuper(phoneNumber) {
  const admin = getAdmin(phoneNumber);
  if (admin) {
    admin.role = 'super_admin';
    saveAdmins(admins);
    return admin;
  }
  return null;
}

module.exports = {
  getAdmin,
  getAdmins,
  addAdmin,
  removeAdmin,
  promoteToSuper
};