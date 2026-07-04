const fs = require('fs');
const path = require('path');

const dataDir = process.env.DATA_DIR || './data';
const caregiversFile = path.join(dataDir, 'caregivers.json');

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

function loadCaregivers() {
  try {
    const data = fs.readFileSync(caregiversFile, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}

function saveCaregivers(caregivers) {
  try {
    fs.writeFileSync(caregiversFile, JSON.stringify(caregivers, null, 2));
  } catch (e) {
    console.error('Failed to save caregivers:', e);
  }
}

let caregivers = loadCaregivers();
ensureDataDir();

function getCaregiver(telegramId) {
  return caregivers.find(c => c.telegramId === telegramId || c.phoneNumber === telegramId);
}

function getCaregivers() {
  return [...caregivers];
}

function addCaregiverRequest(data) {
  const request = {
    id: `caregiver_${Date.now()}`,
    telegramId: String(data.telegramId),
    patientPhone: data.patientPhone,
    caregiverName: data.caregiverName,
    relationship: data.relationship,
    reason: data.reason,
    approved: false,
    requestedAt: new Date(),
    approvedAt: null
  };
  
  caregivers.push(request);
  saveCaregivers(caregivers);
  return request;
}

function approveCaregiver(caregiverId, adminPhone) {
  const caregiver = caregivers.find(c => c.id === caregiverId);
  if (caregiver) {
    caregiver.approved = true;
    caregiver.approvedAt = new Date();
    caregiver.approvedBy = adminPhone;
    saveCaregivers(caregivers);
    return caregiver;
  }
  return null;
}

function rejectCaregiver(caregiverId) {
  const index = caregivers.findIndex(c => c.id === caregiverId);
  if (index !== -1 && !caregivers[index].approved) {
    caregivers.splice(index, 1);
    saveCaregivers(caregivers);
    return true;
  }
  return false;
}

function getPendingRequests() {
  return caregivers.filter(c => !c.approved);
}

module.exports = {
  getCaregiver,
  getCaregivers,
  addCaregiverRequest,
  approveCaregiver,
  rejectCaregiver,
  getPendingRequests,
  _loadCaregivers: loadCaregivers,
  _saveCaregivers: saveCaregivers
};