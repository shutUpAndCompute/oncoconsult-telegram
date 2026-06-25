const { DoctorSpecialties, CancerSpecializations } = require('./doctor');
const { PatientProfile } = require('./patient');

const EntityTypes = {
  DOCTOR: 'doctor',
  PATIENT: 'patient',
  CONSULTATION: 'consultation',
  REPORT: 'report',
  PAYMENT: 'payment'
};

const SpecialtyMappings = {
  [DoctorSpecialties.MEDICAL_ONCOLOGIST]: [
    CancerSpecializations.LUNG,
    CancerSpecializations.BREAST,
    CancerSpecializations.LIVER,
    CancerSpecializations.PANCREATIC,
    CancerSpecializations.GENERAL
  ],
  [DoctorSpecialties.SURGICAL_ONCOLOGIST]: [
    CancerSpecializations.BREAST,
    CancerSpecializations.PROSTATE,
    CancerSpecializations.COLORECTAL,
    CancerSpecializations.LUNG
  ],
  [DoctorSpecialties.RADIOONCOLOGIST]: [
    CancerSpecializations.GENERAL,
    CancerSpecializations.BRAIN
  ],
  [DoctorSpecialties.RADIOLOGIST]: [
    CancerSpecializations.GENERAL
  ],
  [DoctorSpecialties.PATHOLOGIST]: [
    CancerSpecializations.GENERAL
  ],
  [DoctorSpecialties.HEMATOLOGIST]: [
    CancerSpecializations.BLOOD
  ]
};

module.exports = {
  EntityTypes,
  SpecialtyMappings,
  DoctorSpecialties,
  CancerSpecializations
};