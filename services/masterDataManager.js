const fs = require('fs');
const path = require('path');
const { DoctorSpecialties, CancerSpecializations } = require('../models/doctor');

let singletonInstance = null;

class MasterDataManager {
  constructor(dataDir = process.env.DATA_DIR || './data') {
    if (singletonInstance) {
      return singletonInstance;
    }
    this.dataDir = dataDir;
    this.masterFile = path.join(dataDir, 'masterdata.json');
    this.ensureDataDir();
    this.ensureMasterData();
    singletonInstance = this;
  }

  ensureDataDir() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  ensureMasterData() {
    try {
      const data = fs.readFileSync(this.masterFile, 'utf8');
      this.data = JSON.parse(data);
    } catch (e) {
      console.error('Failed to parse masterdata.json, using defaults:', e.message);
      this.data = this.getDefaultMasterData();
      this.save();
    }
  }

  getDefaultMasterData() {
    return {
      specialties: Object.values(DoctorSpecialties),
      cancerTypes: Object.values(CancerSpecializations),
      consultationFees: {
        firstConsultation: 1500,
        followup: 800,
        reportReview: 500
      },
      discounts: {
        research: 30,
        commercial: 15
      },
      createdAt: new Date().toISOString()
    };
  }

  save() {
    try {
      const tempFile = this.masterFile + '.tmp';
      fs.writeFileSync(tempFile, JSON.stringify(this.data, null, 2));
      fs.renameSync(tempFile, this.masterFile);
    } catch (e) {
      console.error('MasterDataManager save error:', e);
    }
  }

  getSpecialties() {
    return this.data.specialties || Object.values(DoctorSpecialties);
  }

  getCancerTypes() {
    return this.data.cancerTypes || Object.values(CancerSpecializations);
  }

  updateSpecialties(specialties) {
    this.data.specialties = specialties;
    this.save();
  }

  updateCancerTypes(cancerTypes) {
    this.data.cancerTypes = cancerTypes;
    this.save();
  }

  getDefaultFees() {
    return this.data.consultationFees || {
      firstConsultation: 1500,
      followup: 800,
      reportReview: 500
    };
  }

  updateFees(fees) {
    this.data.consultationFees = fees;
    this.save();
  }

  getDefaultDiscounts() {
    return this.data.discounts || { research: 30, commercial: 15 };
  }

  updateDiscounts(discounts) {
    this.data.discounts = discounts;
    this.save();
  }
}

module.exports = MasterDataManager;