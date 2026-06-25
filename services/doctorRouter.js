const { CancerSpecializations, DoctorSpecialties, DoctorProfile } = require('../models/doctor');
const DoctorPersistence = require('./doctorPersistence');

class DoctorRouter {
  constructor() {
    this.persistence = new DoctorPersistence();
    this.persistence.seedDefaultDoctors();
  }

  getDoctors() {
    return this.persistence.getDoctors();
  }

  getSpecialization(cancerType) {
    return CancerSpecializations[cancerType?.toUpperCase()] || CancerSpecializations.GENERAL;
  }

  async findAvailableDoctor(cancerType, specialty = null) {
    const doctors = this.getDoctors();
    
    let availableDoctors = doctors.filter(doc => {
      if (!(doc.available ?? true)) return false;
      if (specialty && doc.specialty !== specialty) return false;
      return doc.cancerTypes.includes(cancerType) || doc.cancerTypes.includes('general');
    });

    if (availableDoctors.length > 0) {
      const doctor = availableDoctors[0];
      this.persistence.updateDoctor(doctor.id, { available: false });
      return {
        id: doctor.id,
        name: doctor.name,
        specialization: doctor.specialty,
        fee: doctor.consultationFee
      };
    }
    return null;
  }

  releaseDoctor(doctorId) {
    this.persistence.updateDoctor(doctorId, { available: true });
  }

  getDoctorByPhone(phoneNumber) {
    return this.getDoctors().find(d => d.phoneNumber === phoneNumber);
  }

  findById(id) {
    return this.getDoctors().find(d => d.id === id);
  }
}

module.exports = DoctorRouter;