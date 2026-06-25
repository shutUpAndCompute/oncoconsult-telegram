const fs = require('fs');
const path = require('path');
const { DoctorProfile, DoctorSpecialties, CancerSpecializations } = require('../models/doctor');

class DoctorPersistence {
  constructor(dataDir = process.env.DATA_DIR || './data') {
    this.dataDir = dataDir;
    this.doctorsFile = path.join(dataDir, 'doctors.json');
    this.ensureDataDir();
    this.doctors = this.loadDoctors();
  }

  ensureDataDir() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  loadDoctors() {
    try {
      const data = fs.readFileSync(this.doctorsFile, 'utf8');
      return JSON.parse(data);
    } catch (e) {
      return [];
    }
  }

  saveDoctors() {
    fs.writeFileSync(this.doctorsFile, JSON.stringify(this.doctors, null, 2));
  }

  getDoctors() {
    return this.doctors.map(d => ({
      ...d,
      available: d.available ?? true
    }));
  }

  getDoctorById(id) {
    return this.doctors.find(d => d.id === id);
  }

  addDoctor(doctorData) {
    const doctor = new DoctorProfile(doctorData);
    this.doctors.push(doctor);
    this.saveDoctors();
    return doctor;
  }

  updateDoctor(id, updates) {
    const doctor = this.doctors.find(d => d.id === id);
    if (doctor) {
      Object.assign(doctor, updates);
      this.saveDoctors();
      return doctor;
    }
    return null;
  }

  removeDoctor(id) {
    const index = this.doctors.findIndex(d => d.id === id);
    if (index !== -1) {
      this.doctors.splice(index, 1);
      this.saveDoctors();
      return true;
    }
    return false;
  }

  seedDefaultDoctors() {
    if (this.doctors.length > 0) return;
    
    const defaultDoctors = [
      {
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
      },
      {
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
      },
      {
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
      },
      {
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
      }
    ];
    
    this.doctors = defaultDoctors;
    this.saveDoctors();
  }
}

module.exports = DoctorPersistence;