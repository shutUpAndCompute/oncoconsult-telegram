const ReportTypes = {
  DIAGNOSTIC: 'diagnostic',
  PROGNOSTIC: 'prognostic',
  PREDICTIVE: 'predictive',
  SCREENING: 'screening',
  MONITORING: 'monitoring',
  PATHOLOGY: 'pathology'
};

const DiagnosticReports = {
  IMAGING: {
    CT_SCAN: 'ct_scan',
    MRI: 'mri',
    PET_SCAN: 'pet_scan',
    XRAY: 'xray',
    ULTRASOUND: 'ultrasound',
    MAMMOGRAM: 'mammogram',
    BONE_SCAN: 'bone_scan',
    NUCLEAR_SCAN: 'nuclear_scan'
  },
  PATHOLOGY: {
    BIOPSY: 'biopsy',
    HISTOPATHOLOGY: 'histopathology',
    CYTOPATHOLOGY: 'cytology',
    FROZEN_SECTION: 'frozen_section'
  },
  LAB: {
    CBC: 'complete_blood_count',
    LIVER_FUNCTION: 'liver_function_test',
    KIDNEY_FUNCTION: 'kidney_function_test',
    TUMOR_MARKERS: 'tumor_markers',
    COAGULATION: 'coagulation_profile',
    RENAL_FUNCTION: 'renal_function',
    CREATININE: 'creatinine',
    UREA: 'urea',
    BILIUBIN: 'bilirubin',
    ALT_AST: 'alt_ast',
    ALK_PHOS: 'alk_phos',
    LDH: 'ldh',
    ALP: 'alp',
    PS_A: 'psa',
    CEA: 'cea',
    CA125: 'ca125',
    CA199: 'ca199',
    AFP: 'afp',
    B2_MICROGLOBULIN: 'b2_microglobulin',
    ESR: 'esr',
    CRP: 'crp',
    BLOOD_GLUCOSE: 'blood_glucose',
    SGO_MAKER: 'sgo_marker'
  }
};

const CancerReportMapping = {
  lung: {
    primary: [DiagnosticReports.IMAGING.CT_SCAN, DiagnosticReports.IMAGING.PET_SCAN, DiagnosticReports.IMAGING.BONE_SCAN, DiagnosticReports.PATHOLOGY.BIOPSY],
    labs: [DiagnosticReports.LAB.CBC, DiagnosticReports.LAB.LIVER_FUNCTION, DiagnosticReports.LAB.LDH, DiagnosticReports.LAB.ESR],
    specialty: 'medical_oncologist'
  },
  breast: {
    primary: [DiagnosticReports.IMAGING.MAMMOGRAM, DiagnosticReports.IMAGING.MRI, DiagnosticReports.PATHOLOGY.BIOPSY, DiagnosticReports.IMAGING.ULTRASOUND],
    labs: [DiagnosticReports.LAB.TUMOR_MARKERS, DiagnosticReports.LAB.CA125, DiagnosticReports.LAB.CEA],
    specialty: 'surgical_oncologist'
  },
  prostate: {
    primary: [DiagnosticReports.IMAGING.CT_SCAN, DiagnosticReports.IMAGING.MRI, DiagnosticReports.PATHOLOGY.BIOPSY],
    labs: [DiagnosticReports.LAB.PS_A, DiagnosticReports.LAB.CBC, DiagnosticReports.LAB.CRP],
    specialty: 'urological_oncologist'
  },
  colorectal: {
    primary: [DiagnosticReports.IMAGING.CT_SCAN, DiagnosticReports.IMAGING.MRI, DiagnosticReports.PATHOLOGY.BIOPSY, DiagnosticReports.IMAGING.PET_SCAN],
    labs: [DiagnosticReports.LAB.CBC, DiagnosticReports.LAB.CEA, DiagnosticReports.LAB.LIVER_FUNCTION],
    specialty: 'gastrointestinal_oncologist'
  },
  liver: {
    primary: [DiagnosticReports.IMAGING.CT_SCAN, DiagnosticReports.IMAGING.MRI, DiagnosticReports.IMAGING.ULTRASOUND, DiagnosticReports.PATHOLOGY.BIOPSY],
    labs: [DiagnosticReports.LAB.LIVER_FUNCTION, DiagnosticReports.LAB.CEA, DiagnosticReports.LAB.ALP, DiagnosticReports.LAB.ALT_AST],
    specialty: 'medical_oncologist'
  },
  pancreatic: {
    primary: [DiagnosticReports.IMAGING.CT_SCAN, DiagnosticReports.IMAGING.MRI, DiagnosticReports.IMAGING.ULTRASOUND, DiagnosticReports.PATHOLOGY.BIOPSY],
    labs: [DiagnosticReports.LAB.LIVER_FUNCTION, DiagnosticReports.LAB.CA199, DiagnosticReports.LAB.CBC],
    specialty: 'gastrointestinal_oncologist'
  },
  ovarian: {
    primary: [DiagnosticReports.IMAGING.CT_SCAN, DiagnosticReports.IMAGING.MRI, DiagnosticReports.PATHOLOGY.BIOPSY, DiagnosticReports.IMAGING.ULTRASOUND],
    labs: [DiagnosticReports.LAB.CA125, DiagnosticReports.LAB.CBC, DiagnosticReports.LAB.LIVER_FUNCTION],
    specialty: 'gynecological_oncologist'
  },
  uterine: {
    primary: [DiagnosticReports.IMAGING.CT_SCAN, DiagnosticReports.PATHOLOGY.BIOPSY],
    labs: [DiagnosticReports.LAB.CA125, DiagnosticReports.LAB.CBC],
    specialty: 'gynecological_oncologist'
  },
  cervical: {
    primary: [DiagnosticReports.IMAGING.CT_SCAN, DiagnosticReports.PATHOLOGY.BIOPSY],
    labs: [DiagnosticReports.LAB.CBC],
    specialty: 'gynecological_oncologist'
  },
  blood: {
    primary: [DiagnosticReports.PATHOLOGY.BIOPSY, DiagnosticReports.PATHOLOGY.HISTOPATHOLOGY],
    labs: [DiagnosticReports.LAB.CBC, DiagnosticReports.LAB.LDH, DiagnosticReports.LAB.B2_MICROGLOBULIN],
    specialty: 'hematologist'
  },
  leukemia: {
    primary: [DiagnosticReports.PATHOLOGY.BIOPSY, DiagnosticReports.PATHOLOGY.HISTOPATHOLOGY],
    labs: [DiagnosticReports.LAB.CBC, DiagnosticReports.LAB.LDH, DiagnosticReports.LAB.ESR],
    specialty: 'hematologist'
  },
  lymphoma: {
    primary: [DiagnosticReports.PATHOLOGY.BIOPSY, DiagnosticReports.IMAGING.PET_SCAN, DiagnosticReports.IMAGING.CT_SCAN],
    labs: [DiagnosticReports.LAB.CBC, DiagnosticReports.LAB.LDH],
    specialty: 'hematologist'
  },
  brain: {
    primary: [DiagnosticReports.IMAGING.MRI, DiagnosticReports.IMAGING.CT_SCAN, DiagnosticReports.IMAGING.PET_SCAN],
    labs: [DiagnosticReports.LAB.CBC, DiagnosticReports.LAB.LIVER_FUNCTION],
    specialty: 'radio_oncologist'
  },
  skin: {
    primary: [DiagnosticReports.IMAGING.MRI, DiagnosticReports.PATHOLOGY.BIOPSY],
    labs: [DiagnosticReports.LAB.CBC],
    specialty: 'surgical_oncologist'
  },
  melanoma: {
    primary: [DiagnosticReports.PATHOLOGY.BIOPSY, DiagnosticReports.IMAGING.MRI, DiagnosticReports.IMAGING.PET_SCAN],
    labs: [DiagnosticReports.LAB.CBC, DiagnosticReports.LAB.LDH, DiagnosticReports.LAB.SGO_MAKER],
    specialty: 'surgical_oncologist'
  },
  head_neck: {
    primary: [DiagnosticReports.IMAGING.CT_SCAN, DiagnosticReports.IMAGING.MRI, DiagnosticReports.PATHOLOGY.BIOPSY],
    labs: [DiagnosticReports.LAB.CBC],
    specialty: 'surgical_oncologist'
  },
  stomach: {
    primary: [DiagnosticReports.IMAGING.CT_SCAN, DiagnosticReports.PATHOLOGY.BIOPSY],
    labs: [DiagnosticReports.LAB.CBC, DiagnosticReports.LAB.LIVER_FUNCTION, DiagnosticReports.LAB.CEA],
    specialty: 'gastrointestinal_oncologist'
  },
  esophageal: {
    primary: [DiagnosticReports.IMAGING.CT_SCAN, DiagnosticReports.PATHOLOGY.BIOPSY],
    labs: [DiagnosticReports.LAB.CBC],
    specialty: 'gastrointestinal_oncologist'
  },
  bladder: {
    primary: [DiagnosticReports.IMAGING.CT_SCAN, DiagnosticReports.PATHOLOGY.BIOPSY, DiagnosticReports.IMAGING.ULTRASOUND],
    labs: [DiagnosticReports.LAB.CBC, DiagnosticReports.LAB.RENAL_FUNCTION],
    specialty: 'urological_oncologist'
  },
  kidney: {
    primary: [DiagnosticReports.IMAGING.CT_SCAN, DiagnosticReports.IMAGING.MRI],
    labs: [DiagnosticReports.LAB.RENAL_FUNCTION, DiagnosticReports.LAB.CBC],
    specialty: 'urological_oncologist'
  },
  general: {
    primary: [DiagnosticReports.IMAGING.CT_SCAN, DiagnosticReports.PATHOLOGY.BIOPSY, DiagnosticReports.IMAGING.MRI],
    labs: [DiagnosticReports.LAB.CBC, DiagnosticReports.LAB.LIVER_FUNCTION],
    specialty: 'oncologist'
  }
};

const StandardLabTests = {
  COMPLETE_HEMATOLOGY: {
    id: 'cbc',
    name: 'Complete Blood Count',
    components: ['hemoglobin', 'wbc', 'rbc', 'platelets', 'pcv'],
    normalRange: { male: '13-17 g/dL', female: '12-14 g/dL' }
  },
  LIVER_FUNCTION: {
    id: 'lft',
    name: 'Liver Function Test',
    components: ['bilirubin', 'alt', 'ast', 'alp', 'albumin'],
    normalRange: { ggt: '<50 U/L' }
  },
  KIDNEY_FUNCTION: {
    id: 'kft',
    name: 'Kidney Function Test',
    components: ['creatinine', 'urea', 'bun', 'eGFR'],
    normalRange: { creatinine: '0.6-1.2 mg/dL' }
  },
  TUMOR_MARKERS: {
    id: 'markers',
    name: 'Tumor Markers Panel',
    components: ['cea', 'ca125', 'ca199', 'afp', 'psa'],
    cancerSpecific: { cea: 'colorectal', ca125: 'ovarian', psa: 'prostate' }
  }
};

const SpecialtyReportRequirements = {
  medical_oncologist: { needs: [DiagnosticReports.PATHOLOGY.HISTOPATHOLOGY, DiagnosticReports.LAB.TUMOR_MARKERS], priority: 1 },
  surgical_oncologist: { needs: [DiagnosticReports.IMAGING.CT_SCAN, DiagnosticReports.PATHOLOGY.BIOPSY], priority: 1 },
  hematologist: { needs: [DiagnosticReports.LAB.CBC, DiagnosticReports.PATHOLOGY.BIOPSY], priority: 1 },
  urological_oncologist: { needs: [DiagnosticReports.IMAGING.CT_SCAN, DiagnosticReports.LAB.PS_A], priority: 1 },
  gynecological_oncologist: { needs: [DiagnosticReports.IMAGING.MRI, DiagnosticReports.PATHOLOGY.BIOPSY], priority: 1 },
  gastrointestinal_oncologist: { needs: [DiagnosticReports.IMAGING.CT_SCAN, DiagnosticReports.LAB.CEA], priority: 1 },
  radio_oncologist: { needs: [DiagnosticReports.IMAGING.MRI, DiagnosticReports.IMAGING.PET_SCAN], priority: 1 },
  radiologist: { needs: [DiagnosticReports.IMAGING.CT_SCAN, DiagnosticReports.IMAGING.MRI], priority: 2 },
  pathologist: { needs: [DiagnosticReports.PATHOLOGY.BIOPSY, DiagnosticReports.PATHOLOGY.HISTOPATHOLOGY], priority: 2 },
  palliative_care: { needs: [], priority: 3 }
};

const CancerStageDefinitions = {
  STAGE_0: { stage: 0, description: 'Carcinoma in situ - pre-invasive' },
  STAGE_1: { stage: 1, description: 'Localized tumor, small size' },
  STAGE_2: { stage: 2, description: 'Localized with lymph node involvement' },
  STAGE_3: { stage: 3, description: 'Regional spread, multiple lymph nodes' },
  STAGE_4: { stage: 4, description: 'Distant metastasis' }
};

const GradeDefinitions = {
  GRADE_1: { grade: 1, description: 'Well differentiated - slower growth' },
  GRADE_2: { grade: 2, description: 'Moderately differentiated' },
  GRADE_3: { grade: 3, description: 'Poorly differentiated - faster growth' }
};

class MedicalReport {
  constructor(data) {
    this.id = data.id || `rep_${Date.now()}`;
    this.patientPhone = data.patientPhone;
    this.type = data.type;
    this.category = data.category || ReportTypes.DIAGNOSTIC;
    this.cancerType = data.cancerType;
    this.fileUrl = data.fileUrl;
    this.extractedText = data.extractedText;
    this.reportDate = data.reportDate || new Date();
    this.uploadedAt = data.uploadedAt || new Date();
    this.requiresSpecialty = this.getRequiredSpecialty();
    this.reportData = data.reportData || {};
  }

  getRequiredSpecialty() {
    const mapping = CancerReportMapping[this.cancerType] || CancerReportMapping.general;
    return mapping.specialty;
  }

  isCriticalFor(cancerType) {
    const mapping = CancerReportMapping[cancerType] || CancerReportMapping.general;
    return mapping.primary.includes(this.type);
  }
}

module.exports = {
  ReportTypes,
  DiagnosticReports,
  CancerReportMapping,
  StandardLabTests,
  SpecialtyReportRequirements,
  CancerStageDefinitions,
  GradeDefinitions,
  MedicalReport
};