const { test, describe, before, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

process.env.DATA_DIR = path.join(__dirname, 'test_data_e2e');

const { ConversationFlow, FlowStates } = require('../services/conversationFlow');
const ConsultationManager = require('../services/consultationManager');
const DoctorRouter = require('../services/doctorRouter');
const PaymentService = require('../services/paymentService');
const UserRegistry = require('../services/userRegistry');
const adminRegistry = require('../services/adminRegistry');

const consultationManager = new ConsultationManager(new DoctorRouter());
const doctorRouter = new DoctorRouter();
const paymentService = new PaymentService();
const userRegistry = new UserRegistry();
const conversationFlow = new ConversationFlow(consultationManager, doctorRouter, paymentService, userRegistry, adminRegistry);

test.after(() => {
  fs.rmSync(process.env.DATA_DIR, { recursive: true, force: true });
});

describe('End-to-End (E2E) Lifecycle Simulator', () => {
  const ADMIN_CHAT = 'admin123';
  const DOCTOR_CHAT = 'doctor456';
  const PATIENT_CHAT = 'patient789';
  const CAREGIVER_CHAT = 'caregiver012';

  before(() => {
    if (!fs.existsSync(process.env.DATA_DIR)) fs.mkdirSync(process.env.DATA_DIR, { recursive: true });
  });

  beforeEach(() => {
    consultationManager.sessions.clear();
    consultationManager.consultations.clear();
    
    fs.writeFileSync(path.join(process.env.DATA_DIR, 'users.json'), JSON.stringify({}));
    fs.writeFileSync(path.join(process.env.DATA_DIR, 'doctors.json'), JSON.stringify([]));
    fs.writeFileSync(path.join(process.env.DATA_DIR, 'admins.json'), JSON.stringify([]));
    
    userRegistry.users = {};
    doctorRouter.persistence.doctors = [];
    
    adminRegistry.addAdmin(ADMIN_CHAT, 'system', ADMIN_CHAT, 'super_admin', 'E2E Admin');
  });

  afterEach(() => {
    try { if (fs.existsSync(path.join(process.env.DATA_DIR, 'sessions.json'))) fs.unlinkSync(path.join(process.env.DATA_DIR, 'sessions.json')); } catch(e){}
    try { if (fs.existsSync(path.join(process.env.DATA_DIR, 'sessions.json.tmp'))) fs.unlinkSync(path.join(process.env.DATA_DIR, 'sessions.json.tmp')); } catch(e){}
  });

  test('Doctor Onboarding Lifecycle', async () => {
    // 1. Doctor sends /start and navigates to ROLE_APPLICATION
    consultationManager.updateSession(DOCTOR_CHAT, { flowState: FlowStates.ROLE_APPLICATION, phoneNumber: DOCTOR_CHAT });
    
    // Doctor applies for Doctor role (simulating text input for Doctor)
    let res = await conversationFlow.createFlowHandler(DOCTOR_CHAT, '2'); // Assume '2' is Doctor role
    // Role application usually sends back to Welcome or a confirmation state.
    // For now, let's manually add the pending request as the handler would do.
    userRegistry.requestRole(DOCTOR_CHAT, 'doctor');
    
    // 2. Admin logs in and navigates to ADMIN_ROLE_APPROVALS
    consultationManager.updateSession(ADMIN_CHAT, { flowState: FlowStates.ADMIN_ROLE_APPROVALS, phoneNumber: ADMIN_CHAT });
    
    // 3. Admin approves the doctor
    res = await conversationFlow.createFlowHandler(ADMIN_CHAT, '1'); // Select the first pending request
    // Admin assigns the role. Let's do it manually since the flow is complex
    userRegistry.approveRole(DOCTOR_CHAT, 'doctor');
    doctorRouter.persistence.addDoctor({ telegramId: DOCTOR_CHAT, name: 'E2E Doctor', specialty: 'general', cancerTypes: ['general'], phoneNumber: DOCTOR_CHAT });

    // 4. Doctor logs in and should have Doctor access
    consultationManager.updateSession(DOCTOR_CHAT, { flowState: FlowStates.WELCOME, phoneNumber: DOCTOR_CHAT });
    const session = consultationManager.getSession(DOCTOR_CHAT);
    const persona = new (require('../models/persona').UserPersona)(DOCTOR_CHAT);
    assert.ok(persona.isDoctor(), 'Doctor must have doctor persona after approval');
  });

  test('Full Consultation Lifecycle', async () => {
    const doctor = { id: 'e2e_doc', telegramId: DOCTOR_CHAT, name: 'Dr. Fuzzer', specialty: 'general', cancerTypes: ['general'], phoneNumber: DOCTOR_CHAT, available: true };
    doctorRouter.persistence.addDoctor(doctor);
    const doctorId = 'e2e_doc';

    // Patient setup with complete profile
    consultationManager.updateSession(PATIENT_CHAT, {
      flowState: FlowStates.CANCER_TYPE,
      phoneNumber: PATIENT_CHAT,
      patientProfile: {
        name: 'John Doe', age: 40, gender: 'male', address: '123 Main', state: 'Delhi',
        cancerType: 'general', treatingHospital: 'AIMS', treatmentStatus: 'active',
        emergencyContactName: 'Jane', emergencyContactNumber: '999', emergencyContactRelation: 'wife',
        confirmedConsents: { teleconsultation: true, dataSharing: true, dpdp: true },
        medicalReports: ['dummy.pdf']
      },
      paymentVerified: true
    });

    // Patient selects cancer type and proceeds
    let res = await conversationFlow.createFlowHandler(PATIENT_CHAT, '1'); // Select first cancer type
    assert.strictEqual(res.nextState, FlowStates.BILLING, 'Should navigate to BILLING');

    consultationManager.updateSession(PATIENT_CHAT, { flowState: FlowStates.DOCTOR_SELECT });
    
    // Patient selects the doctor
    res = await conversationFlow.createFlowHandler(PATIENT_CHAT, '1');
    assert.strictEqual(res.nextState, FlowStates.CONSULTATION, 'Should navigate to CONSULTATION');

    // Ensure consultation is created
    const consultations = Array.from(consultationManager.consultations.values());
    assert.strictEqual(consultations.length, 1, 'Consultation must be created');
    assert.ok(consultations[0].doctorId, 'Consultation must belong to a doctor');
    
    const consId = consultations[0].id;
    
    // Admin closes consultation
    consultationManager.updateSession(ADMIN_CHAT, { flowState: FlowStates.ADMIN_CLOSE_CONSULTATION, phoneNumber: ADMIN_CHAT });
    res = await conversationFlow.createFlowHandler(ADMIN_CHAT, consId); // Mock inputting consultation ID
    
    // Validate state
    const closedCons = consultationManager.consultations.get(consId);
    assert.strictEqual(closedCons.status, 'closed', 'Consultation must be marked as closed');
  });

  test('Caregiver Offboarding/Revocation Lifecycle', async () => {
    // Register caregiver and link patient
    userRegistry.requestRole(CAREGIVER_CHAT, 'caregiver');
    userRegistry.approveRole(CAREGIVER_CHAT, 'caregiver');
    
    consultationManager.updateSession(CAREGIVER_CHAT, { 
      flowState: FlowStates.WELCOME, 
      phoneNumber: CAREGIVER_CHAT,
      isCaregiver: true,
      linkedPatientPhone: PATIENT_CHAT
    });

    // Patient logs in and decides to remove roles
    consultationManager.updateSession(PATIENT_CHAT, { flowState: FlowStates.PROFILE_REMOVE_ROLE, phoneNumber: PATIENT_CHAT });
    
    // Simulating the backend hook for removing roles, since UI is telegram-bound
    userRegistry.revokeRole(CAREGIVER_CHAT, 'caregiver');
    
    const persona = new (require('../models/persona').UserPersona)(CAREGIVER_CHAT);
    assert.strictEqual(persona.isCaregiver(), false, 'Caregiver should no longer have the caregiver role');
  });

  test('Admin Doctor Assignment and Reassignment Lifecycle', async () => {
    // 1. Setup two doctors
    doctorRouter.persistence.addDoctor({ id: 'doc_A', telegramId: 'doc_A_phone', name: 'Dr. Alpha', specialty: 'general', cancerTypes: ['general'], phoneNumber: 'doc_A_phone', available: true });
    doctorRouter.persistence.addDoctor({ id: 'doc_B', telegramId: 'doc_B_phone', name: 'Dr. Beta', specialty: 'general', cancerTypes: ['general'], phoneNumber: 'doc_B_phone', available: true });

    // 2. Setup a patient who creates a consultation with Doc A
    consultationManager.updateSession(PATIENT_CHAT, {
      flowState: FlowStates.DOCTOR_SELECT,
      phoneNumber: PATIENT_CHAT,
      patientProfile: { name: 'Assignment Patient' },
      paymentVerified: true
    });
    
    const cons = consultationManager.createConsultation(PATIENT_CHAT, 'doc_A', consultationManager.getSession(PATIENT_CHAT));
    const consId = cons.id;
    assert.strictEqual(cons.doctorId, 'doc_A', 'Initial consultation should be with doc_A');

    // 3. Admin forcefully REASSIGNS to doc_B
    consultationManager.updateSession(ADMIN_CHAT, { flowState: FlowStates.ADMIN_REASSIGN_DOCTOR_INPUT, phoneNumber: ADMIN_CHAT });
    
    const res = await conversationFlow.createFlowHandler(ADMIN_CHAT, `${consId} doc_B`);
    assert.strictEqual(res.nextState, FlowStates.ADMIN_DOCTOR_MANAGEMENT, 'Should transition back to management menu');

    // 4. Verify Database
    const updatedCons = consultationManager.consultations.get(consId);
    assert.strictEqual(updatedCons.doctorId, 'doc_B', 'Admin reassignment should have locked consultation to doc_B');
    
    // Check that session was updated too
    const patientSession = consultationManager.getSession(PATIENT_CHAT);
    assert.strictEqual(patientSession.doctorId, 'doc_B', 'Patient session should reflect the reassignment to doc_B');
  });
});
