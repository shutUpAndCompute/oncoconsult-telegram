const fs = require('fs');
const path = require('path');
const { normalizePhone } = require('../utils/phone');

let singletonInstance = null;

class UserRegistry {
  constructor(dataDir = process.env.DATA_DIR || './data') {
    if (singletonInstance) {
      return singletonInstance;
    }
    this.dataDir = dataDir;
    this.usersFile = path.join(dataDir, 'users.json');
    this.ensureDataDir();
    this.users = this.loadUsers();
    singletonInstance = this;
  }

  ensureDataDir() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  loadUsers() {
    try {
      const data = fs.readFileSync(this.usersFile, 'utf8');
      const parsed = JSON.parse(data);
      return parsed;
    } catch (e) {
      console.error('Failed to parse users.json, starting empty:', e.message);
      return {};
    }
  }

  saveUsers() {
    try {
      const tempFile = this.usersFile + '.tmp';
      fs.writeFileSync(tempFile, JSON.stringify(this.users, null, 2));
      fs.renameSync(tempFile, this.usersFile);
    } catch (e) {
      console.error('UserRegistry save error:', e);
    }
  }

  getUser(chatId) {
    return this.users[chatId] || null;
  }

  getUserByPhone(phoneNumber) {
    const normalized = normalizePhone(phoneNumber);
    for (const [chatId, user] of Object.entries(this.users)) {
      if (normalizePhone(user.phoneNumber) === normalized) {
        return { chatId, ...user };
      }
    }
    return null;
  }

  createUser(chatId, phoneNumber) {
    if (this.users[chatId]) {
      // Update phone if needed
      if (phoneNumber && !this.users[chatId].phoneNumber) {
        this.users[chatId].phoneNumber = phoneNumber;
        this.saveUsers();
      }
      return this.users[chatId];
    }

    this.users[chatId] = {
      chatId,
      phoneNumber: phoneNumber || null,
      appliedRoles: [],
      approvedRoles: [],
      profile: {},
      createdAt: new Date().toISOString(),
      mobileVerified: !!phoneNumber
    };
    this.saveUsers();
    return this.users[chatId];
  }

  updateUserProfile(chatId, profile) {
    if (!this.users[chatId]) {
      this.createUser(chatId);
    }
    this.users[chatId].profile = { ...this.users[chatId].profile, ...profile };
    this.saveUsers();
    return this.users[chatId].profile;
  }

  requestRole(chatId, role) {
    if (!this.users[chatId]) {
      this.createUser(chatId);
    }
    
    if (!this.users[chatId].appliedRoles.includes(role)) {
      this.users[chatId].appliedRoles.push(role);
    }
    
    // Initialize status if not exists
    if (!this.users[chatId].roleStatus) {
      this.users[chatId].roleStatus = {};
    }
    
    // Set status to pending if not already approved
    if (!this.users[chatId].approvedRoles.includes(role)) {
      this.users[chatId].roleStatus[role] = 'pending';
    }
    
    this.saveUsers();
    return this.users[chatId].roleStatus[role];
  }

  approveRole(chatId, role, approverChatId) {
    if (!this.users[chatId]) return false;
    
    if (!this.users[chatId].approvedRoles.includes(role)) {
      this.users[chatId].approvedRoles.push(role);
    }
    
    if (!this.users[chatId].roleStatus) {
      this.users[chatId].roleStatus = {};
    }
    
    this.users[chatId].roleStatus[role] = 'approved';
    this.users[chatId].approvedBy = approverChatId;
    this.saveUsers();
    return true;
  }

  revokeRole(chatId, role) {
    if (!this.users[chatId]) return false;
    
    this.users[chatId].approvedRoles = this.users[chatId].approvedRoles.filter(r => r !== role);
    
    if (this.users[chatId].roleStatus) {
      this.users[chatId].roleStatus[role] = 'revoked';
    }
    
    this.saveUsers();
    return true;
  }

  hasRole(chatId, role) {
    const user = this.users[chatId];
    if (!user) return false;
    return user.approvedRoles.includes(role);
  }

  getRoleStatus(chatId, role) {
    const user = this.users[chatId];
    if (!user) return null;
    return user.roleStatus?.[role] || null;
  }

  getPendingRequests(role = null) {
    const requests = [];
    for (const [chatId, user] of Object.entries(this.users)) {
      if (user.roleStatus && user.appliedRoles?.length > 0) {
        const pendingRoles = user.appliedRoles.filter(r => {
          if (user.approvedRoles?.includes(r)) return false;
          if (role && r !== role) return false;
          return true;
        });
        if (pendingRoles.length > 0) {
          requests.push({ chatId, phoneNumber: user.phoneNumber, appliedRoles: pendingRoles, profile: user.profile });
        }
      }
    }
    return requests;
  }

  getAllAdmins() {
    const admins = [];
    for (const [chatId, user] of Object.entries(this.users)) {
      if (user.approvedRoles.includes('admin') || user.approvedRoles.includes('super_admin')) {
        admins.push({ chatId, phoneNumber: user.phoneNumber, ...user });
      }
    }
    return admins;
  }

  getAllDoctors() {
    const doctors = [];
    for (const [chatId, user] of Object.entries(this.users)) {
      if (user.approvedRoles.includes('doctor')) {
        doctors.push({ chatId, phoneNumber: user.phoneNumber, ...user });
      }
    }
    return doctors;
  }
}

module.exports = UserRegistry;