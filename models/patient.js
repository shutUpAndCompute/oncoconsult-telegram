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

module.exports = { PatientProfile, DISCOUNT_CATEGORIES, TREATMENT_STATUSES, PRIOR_TREATMENTS, COMORBIDITIES_LIST };