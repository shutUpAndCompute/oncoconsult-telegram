const DoctorSpecialties = {
  ONCOLOGIST: 'oncologist',
  SURGEON: 'surgeon',
  RADIOLOGIST: 'radiologist',
  PATHOLOGIST: 'pathologist',
  RADIOONCOLOGIST: 'radio_oncologist',
  SURGICAL_ONCOLOGIST: 'surgical_oncologist',
  MEDICAL_ONCOLOGIST: 'medical_oncologist',
  HEMATOLOGIST: 'hematologist',
  NURSE: 'oncology_nurse',
  GYNECOLOGICAL_ONCOLOGIST: 'gynecological_oncologist',
  PEDIATRIC_ONCOLOGIST: 'pediatric_oncologist',
  GASTROINTESTINAL_ONCOLOGIST: 'gastrointestinal_oncologist',
  UROLOGICAL_ONCOLOGIST: 'urological_oncologist',
  PLASTIC_ONCOLOGIST: 'plastic_oncologist',
  NUCLEAR_MEDICINE: 'nuclear_medicine',
  PALLIATIVE_CARE: 'palliative_care',
  PSYCHO_ONCOLOGY: 'psycho_oncology'
};

const CancerSpecializations = {
  LUNG: 'lung_oncology',
  BREAST: 'breast_oncology',
  PROSTATE: 'prostate_oncology',
  COLORECTAL: 'colorectal_oncology',
  LIVER: 'liver_oncology',
  PANCREATIC: 'pancreatic_oncology',
  OVARIAN: 'ovarian_oncology',
  UTERINE: 'uterine_oncology',
  CERVICAL: 'cervical_oncology',
  SKIN: 'skin_oncology',
  MELANOMA: 'melanoma_oncology',
  BRAIN: 'neuro_oncology',
  SPINAL: 'spinal_oncology',
  BLOOD: 'hematologic_oncology',
  LEUKEMIA: 'leukemia',
  LYMPHOMA: 'lymphoma',
  MYELOMA: 'myeloma',
  HEAD_NECK: 'head_neck_oncology',
  ESOPHAGEAL: 'esophageal_oncology',
  GASTRIC: 'gastric_oncology',
  BLADDER: 'bladder_oncology',
  KIDNEY: 'kidney_oncology',
  GENERAL: 'general_oncology'
};

class DoctorProfile {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.phoneNumber = data.phoneNumber;
    this.telegramId = data.telegramId || null;
    this.email = data.email || '';
    this.specialty = data.specialty;
    this.cancerTypes = data.cancerTypes || [];
    this.qualifications = data.qualifications || [];
    this.experience = data.experience || 0;
    this.available = data.available ?? true;
    this.consultationFee = data.consultationFee || 1500;
    this.followupFee = data.followupFee || 800;
    this.languages = data.languages || ['en'];
    this.hospital = data.hospital || '';
    this.rating = data.rating || 5.0;
    this.bio = data.bio || '';
    this.workingHours = data.workingHours || { start: '09:00', end: '17:00' };
    this.timezone = data.timezone || 'Asia/Kolkata';
    this.maxPatientsPerDay = data.maxPatientsPerDay || 20;
  }

  canHandle(cancerType) {
    return this.cancerTypes.includes(cancerType) || this.cancerTypes.includes('general');
  }

  getSpecialtyLabel() {
    const labels = {
      medical_oncologist: 'Medical Oncologist',
      surgical_oncologist: 'Surgical Oncologist',
      radio_oncologist: 'Radiation Oncologist',
      radiologist: 'Radiologist',
      pathologist: 'Pathologist',
      hematologist: 'Hematologist',
      gynecological_oncologist: 'Gynecological Oncologist',
      pediatric_oncologist: 'Pediatric Oncologist'
    };
    return labels[this.specialty] || this.specialty;
  }
}

const doctorRegistry = {
  doctors: [],

  addDoctor(doctor) {
    if (doctor instanceof DoctorProfile) {
      this.doctors.push(doctor);
    }
  },

  getSpecialists(cancerType, specialty = null) {
    return this.doctors.filter(doc => {
      if (!doc.available) return false;
      if (specialty && doc.specialty !== specialty) return false;
      return doc.canHandle(cancerType);
    });
  },

  getAvailable(specialty = null) {
    return this.doctors.filter(doc => {
      if (!doc.available) return false;
      return specialty ? doc.specialty === specialty : true;
    });
  },

  findById(id) {
    return this.doctors.find(doc => doc.id === id);
  },

  findByPhone(phone) {
    return this.doctors.find(doc => doc.phoneNumber === phone || doc.telegramId === phone);
  },

  seedDoctors() {
    const doctors = [
      new DoctorProfile({
        id: 'doc_001',
        name: 'Dr. Rajesh Sharma',
        phoneNumber: '+919876543210',
        specialty: DoctorSpecialties.MEDICAL_ONCOLOGIST,
        cancerTypes: ['lung', 'liver', 'pancreatic'],
        qualifications: ['MBBS', 'MD Oncology', 'DM Medical Oncology'],
        experience: 15,
        consultationFee: 2000,
        languages: ['en', 'hi'],
        hospital: 'Apollo Hospitals, Delhi'
      }),
      new DoctorProfile({
        id: 'doc_002',
        name: 'Dr. Priya Patel',
        phoneNumber: '+919876543211',
        specialty: DoctorSpecialties.SURGICAL_ONCOLOGIST,
        cancerTypes: ['breast', 'ovarian', 'uterine', 'cervical'],
        qualifications: ['MBBS', 'MS Surgery', 'DNB Surgical Oncology'],
        experience: 12,
        consultationFee: 2500,
        languages: ['en', 'gu'],
        hospital: 'Tata Memorial, Mumbai'
      }),
      new DoctorProfile({
        id: 'doc_003',
        name: 'Dr. Mohammed Irfan',
        phoneNumber: '+919876543212',
        specialty: DoctorSpecialties.HEMATOLOGIST,
        cancerTypes: ['blood', 'leukemia', 'lymphoma'],
        qualifications: ['MBBS', 'MD Internal Medicine', 'DM Hematology'],
        experience: 14,
        consultationFee: 2000,
        languages: ['en', 'ur'],
        hospital: 'CMC, Vellore'
      }),
      new DoctorProfile({
        id: 'doc_004',
        name: 'Dr. Anjali Menon',
        phoneNumber: '+919876543213',
        specialty: DoctorSpecialties.PALLIATIVE_CARE,
        cancerTypes: ['general'],
        qualifications: ['MBBS', 'MD Palliative Medicine'],
        experience: 11,
        consultationFee: 1500,
        languages: ['en', 'ml'],
        hospital: 'Palliative Care Center, Kerala'
      })
    ];
    this.doctors = doctors;
  }
};

module.exports = {
  DoctorSpecialties,
  CancerSpecializations,
  DoctorProfile,
  doctorRegistry
};