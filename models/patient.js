class PatientProfile {
  constructor(data) {
    this.id = data.id || `pat_${Date.now()}`;
    this.phoneNumber = data.phoneNumber;
    this.name = data.name || '';
    this.dateOfBirth = data.dateOfBirth || null;
    this.age = data.age || null;
    this.gender = data.gender || '';
    this.email = data.email || '';
    this.aadhaarNumber = data.aadhaarNumber || '';
    this.address = data.address || '';
    this.pinCode = data.pinCode || '';
    this.state = data.state || '';
    this.district = data.district || '';
    this.preferredLanguage = data.preferredLanguage || '';

    this.discountCategory = data.discountCategory || '';
    this.discountDocuments = data.discountDocuments || [];
    this.discountVerificationStatus = data.discountVerificationStatus || 'not_applied';
    this.discountRejectionReason = data.discountRejectionReason || '';

    this.cancerType = data.cancerType || '';
    this.diagnosisDate = data.diagnosisDate || '';
    this.currentStage = data.currentStage || '';
    this.treatingHospital = data.treatingHospital || '';
    this.oncologistName = data.oncologistName || '';
    this.treatmentStatus = data.treatmentStatus || '';
    this.priorTreatments = data.priorTreatments || [];
    this.currentMedications = data.currentMedications || [];
    this.comorbidities = data.comorbidities || [];
    this.allergies = data.allergies || [];
    this.medicalReports = data.medicalReports || [];
    this.reasonForSecondOpinion = data.reasonForSecondOpinion || '';

    this.emergencyContactName = data.emergencyContactName || '';
    this.emergencyContactNumber = data.emergencyContactNumber || '';
    this.emergencyContactRelation = data.emergencyContactRelation || '';
    this.caregiverName = data.caregiverName || '';
    this.familyHistoryOfCancer = data.familyHistoryOfCancer || false;

    this.hasHealthInsurance = data.hasHealthInsurance || false;
    this.insuranceProvider = data.insuranceProvider || '';
    this.insurancePolicyNumber = data.insurancePolicyNumber || '';
    this.incomeBracket = data.incomeBracket || '';
    this.referralSource = data.referralSource || '';

    this.consentTeleconsultation = data.consentTeleconsultation || false;
    this.consentDataSharing = data.consentDataSharing || false;
    this.consentDPDP = data.consentDPDP || false;
    this.platformTermsAccepted = data.platformTermsAccepted || false;
    this.consentTimestamp = data.consentTimestamp || null;
    this.confirmedConsents = data.confirmedConsents || {};

    this.registeredAt = data.registeredAt || new Date();
  }
}

const DISCOUNT_CATEGORIES = [
  'none',
  'bpl_ews',
  'ayushman_bharat',
  'e_shram',
  'farmer',
  'defence_exservicemen',
  'paramilitary',
  'police',
  'government_employee',
  'freedom_fighter_dependent',
  'senior_citizen',
  'widow_single_woman',
  'pwd',
  'sc_st',
  'minority_community',
  'rural_tribal_resident',
  'healthcare_worker',
  'teacher_angadiwadi',
  'journalist'
];

const TREATMENT_STATUSES = ['newly_diagnosed', 'under_treatment', 'post_treatment', 'relapsed', 'survivor'];

const PRIOR_TREATMENTS = ['surgery', 'chemotherapy', 'radiation', 'immunotherapy', 'targeted_therapy', 'hormone_therapy'];

const COMORBIDITIES_LIST = ['diabetes', 'hypertension', 'cardiac_disease', 'kidney_disease', 'liver_disease', 'respiratory_disease'];

const patientRegistry = {
  patients: new Map(),

  addOrUpdate(phoneNumber, data) {
    if (!this.patients.has(phoneNumber)) {
      this.patients.set(phoneNumber, new PatientProfile(data));
    } else {
      const patient = this.patients.get(phoneNumber);
      Object.assign(patient, data);
    }
    return this.patients.get(phoneNumber);
  },

  get(phoneNumber) {
    return this.patients.get(phoneNumber);
  },

  addReport(phoneNumber, report) {
    const patient = this.get(phoneNumber);
    if (patient) {
      patient.medicalReports.push({
        id: `rep_${Date.now()}`,
        ...report,
        uploadedAt: new Date()
      });
    }
  },

  addDiscountDocument(phoneNumber, document) {
    const patient = this.get(phoneNumber);
    if (patient) {
      patient.discountDocuments.push({
        id: `doc_${Date.now()}`,
        ...document,
        uploadedAt: new Date()
      });
    }
  },

  verifyDiscount(phoneNumber, status, rejectionReason = '') {
    const patient = this.get(phoneNumber);
    if (patient) {
      patient.discountVerificationStatus = status;
      patient.discountRejectionReason = rejectionReason;
    }
  },

  isProfileComplete(phoneNumber) {
    const p = this.get(phoneNumber);
    const c = p?.confirmedConsents || {};
    if (!p) return false;
    return !!(p.name && p.age && p.gender && p.aadhaarNumber && p.address && p.state &&
      p.cancerType && p.treatingHospital && p.treatmentStatus &&
      p.emergencyContactName && p.emergencyContactNumber && p.emergencyContactRelation &&
      p.medicalReports.length > 0 &&
      c.teleconsultation && c.dataSharing && c.dpdp);
  },

  hasDiscountDocuments(phoneNumber) {
    const p = this.get(phoneNumber);
    return p && p.discountCategory && p.discountCategory !== 'none' && p.discountDocuments.length > 0;
  }
};

module.exports = { PatientProfile, patientRegistry, DISCOUNT_CATEGORIES, TREATMENT_STATUSES, PRIOR_TREATMENTS, COMORBIDITIES_LIST };