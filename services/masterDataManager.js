const fs = require('fs');
const path = require('path');
const { DoctorSpecialties, CancerSpecializations } = require('../models/doctor');

class MasterDataManager {
  constructor(dataDir = process.env.DATA_DIR || './data') {
    this.dataDir = dataDir;
    this.masterFile = path.join(dataDir, 'masterdata.json');
    this.ensureDataDir();
    this.ensureMasterData();
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
    fs.writeFileSync(this.masterFile, JSON.stringify(this.data, null, 2));
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