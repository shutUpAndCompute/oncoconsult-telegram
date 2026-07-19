const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const ConsultationManager = require('../services/consultationManager');
const DoctorRouter = require('../services/doctorRouter');
const PaymentService = require('../services/paymentService');
const adminRegistry = require('../services/adminRegistry');
const UserRegistry = require('../services/userRegistry');

const DATA_DIR = process.env.DATA_DIR || './data';
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');
const ADMINS_FILE = path.join(DATA_DIR, 'admins.json');

function readJsonFile(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    return null;
  }
}

function getSessionFromFile(phone) {
  const data = readJsonFile(SESSIONS_FILE);
  if (!data) return null;
  const entry = data.find(e => e[0] === phone);
  return entry ? entry[1] : null;
}

function getConsultationFromFile(consultationId) {
  const data = readJsonFile(path.join(DATA_DIR, 'consultations.json'));
  if (!data) return null;
  const entry = data.find(e => e[0] === consultationId);
  return entry ? entry[1] : null;
}

test.describe('Data Persistence Audit', () => {
  let consultationManager;
  let doctorRouter;
  let paymentService;
  let userRegistry;

  test.before(() => {
    doctorRouter = new DoctorRouter();
    consultationManager = new ConsultationManager(doctorRouter);
    paymentService = new PaymentService();
    userRegistry = new UserRegistry();
  });

  test.after(() => {
    fs.rmSync(DATA_DIR, { recursive: true, force: true });
  });

  test('Session persistence: updateSession saves to file', () => {
    const testPhone = '1111111111';
    
    consultationManager.updateSession(testPhone, {
      patientProfile: { name: 'Test User', age: 30 },
      cancerType: 'breast'
    });

    const session = consultationManager.getSession(testPhone);
    assert.strictEqual(session.patientProfile?.name, 'Test User', 'Name should be in session');
    assert.strictEqual(session.cancerType, 'breast', 'Cancer type should be in session');

    const fileSession = getSessionFromFile(testPhone);
    assert.ok(fileSession, 'Session should exist in file');
    assert.strictEqual(fileSession.patientProfile?.name, 'Test User', 'Name should persist to file');
  });

  test('Admin profile persistence: addAdmin saves to file', () => {
    const testPhone = '2222229999';
    
    adminRegistry.addAdmin(testPhone, 'system', testPhone, 'admin', 'Admin Test');
    
    const admin = adminRegistry.getAdmin(testPhone);
    assert.ok(admin, 'Admin should be created');
    assert.strictEqual(admin.name, 'Admin Test', 'Name should be set');
    
    const fileData = readJsonFile(ADMINS_FILE);
    const fileAdmin = fileData?.find(a => a.telegramId === testPhone || a.phoneNumber === testPhone);
    assert.ok(fileAdmin, 'Admin should exist in file');
    assert.strictEqual(fileAdmin?.name, 'Admin Test', 'Name should persist to file');
    
    adminRegistry.removeAdmin(testPhone);
  });

  test('Admin profile completion check: requires name AND phoneNumber', () => {
    const testPhone = '3333333333';
    
    adminRegistry.addAdmin(testPhone, 'system', testPhone, 'admin', null);
    
    const isCompleteNoName = adminRegistry.isAdminProfileComplete(testPhone);
    assert.strictEqual(isCompleteNoName, false, 'Profile incomplete without name');
    
    adminRegistry.updateAdmin(testPhone, { name: 'Test Admin' });
    
    const isCompleteWithName = adminRegistry.isAdminProfileComplete(testPhone);
    assert.strictEqual(isCompleteWithName, true, 'Profile complete with name');
    
    adminRegistry.removeAdmin(testPhone);
  });

  test('Session reset preserves profile and media', () => {
    const testPhone = '4444444444';
    
    consultationManager.updateSession(testPhone, {
      patientProfile: { name: 'Preserve Test', age: 25 },
      media: [{ id: 'media1', type: 'photo' }]
    });
    
    const beforeReset = consultationManager.getSession(testPhone);
    assert.strictEqual(beforeReset.patientProfile?.name, 'Preserve Test', 'Profile before reset');
    
    consultationManager.resetSession(testPhone);
    
    const afterReset = consultationManager.getSession(testPhone);
    assert.strictEqual(afterReset.patientProfile?.name, 'Preserve Test', 'Profile preserved after reset');
    assert.deepStrictEqual(afterReset.media, [{ id: 'media1', type: 'photo' }], 'Media preserved after reset');
  });

  test('Payment transaction persistence', () => {
    const testPhone = '5555555555';
    
    consultationManager.updateSession(testPhone, {
      patientProfile: { name: 'Payment Test' },
      paymentTransaction: 'txn_12345'
    });
    
    const session = consultationManager.getSession(testPhone);
    assert.strictEqual(session.paymentTransaction, 'txn_12345', 'Payment transaction in session');
    
    const fileSession = getSessionFromFile(testPhone);
    assert.strictEqual(fileSession?.paymentTransaction, 'txn_12345', 'Payment transaction in file');
  });

  test('Consultation creation persistence', () => {
    const testPhone = '6666666666';
    
    consultationManager.updateSession(testPhone, {
      patientProfile: { name: 'Consultation Test' },
      paymentVerified: true
    });

    const consultation = consultationManager.createConsultation(testPhone, 'doctor_1', {
      patientProfile: { name: 'Consultation Test' },
      paymentVerified: true
    });
    
    assert.ok(consultation, 'Consultation created');
    assert.strictEqual(consultation.status, 'active', 'Status is active');
    
    const fileConsultation = getConsultationFromFile(consultation.id);
    assert.ok(fileConsultation, 'Consultation persisted to file');
    assert.strictEqual(fileConsultation?.status, 'active', 'Status persisted');
  });

  test('Admin lookup by telegramId works after save/load', () => {
    const testPhone = '7777777777';
    
    adminRegistry.addAdmin(testPhone, 'system', testPhone, 'super_admin', 'Super Admin Test');
    
    const admin = adminRegistry.getAdmin(testPhone);
    assert.ok(admin, 'Admin found by telegramId');
    assert.strictEqual(admin.role, 'super_admin', 'Role is super_admin');
    
    adminRegistry.removeAdmin(testPhone);
  });

  test('Session data survives process boundary simulation', () => {
    const testPhone = '8888888888';
    const originalData = {
      patientProfile: { name: 'Boundary Test', age: 40 },
      cancerType: 'lung',
      selectedPersona: 'patient'
    };
    
    consultationManager.updateSession(testPhone, originalData);
    
    const fileSession = getSessionFromFile(testPhone);
    
    assert.deepStrictEqual(
      fileSession?.patientProfile,
      originalData.patientProfile,
      'Profile matches file'
    );
    assert.strictEqual(fileSession?.cancerType, 'lung', 'Cancer type matches file');
  });

  test('Admin record phoneNumber is chat ID initially', () => {
    const testPhone = '9999999999';
    
    adminRegistry.addAdmin(testPhone, 'system', testPhone, 'admin', 'Test');
    
    const admin = adminRegistry.getAdmin(testPhone);
    assert.strictEqual(admin?.phoneNumber, testPhone, 'phoneNumber is set to chat ID');
    assert.strictEqual(admin?.telegramId, testPhone, 'telegramId is set to chat ID');
    
    adminRegistry.removeAdmin(testPhone);
  });

  test('Multiple updates to same session persist correctly', () => {
    const testPhone = '1212121212';
    
    consultationManager.updateSession(testPhone, { patientProfile: { name: 'First' } });
    consultationManager.updateSession(testPhone, { patientProfile: { name: 'Second' } });
    consultationManager.updateSession(testPhone, { cancerType: 'brain' });
    
    const session = consultationManager.getSession(testPhone);
    assert.strictEqual(session.patientProfile?.name, 'Second', 'Latest name persisted');
    assert.strictEqual(session.cancerType, 'brain', 'Cancer type persisted');
    
    const fileSession = getSessionFromFile(testPhone);
    assert.strictEqual(fileSession?.patientProfile?.name, 'Second', 'File has latest name');
    assert.strictEqual(fileSession?.cancerType, 'brain', 'File has cancer type');
  });
});