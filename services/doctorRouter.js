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

  getAvailableDoctors(cancerType) {
    return this.findAvailableDoctor(cancerType);
  }

  getSpecialization(cancerType) {
    return CancerSpecializations[cancerType?.toUpperCase()] || CancerSpecializations.GENERAL;
  }

  async findAvailableDoctor(cancerType, specialty = null, patientCity = null) {
    const doctors = this.getDoctors();
    
    let availableDoctors = doctors.filter(doc => {
      if (!(doc.available ?? true)) return false;
      if (specialty && doc.specialty !== specialty) return false;
      return doc.cancerTypes.includes(cancerType) || doc.cancerTypes.includes('general');
    });

    if (availableDoctors.length === 0) return null;

    const cityMatchDoctors = availableDoctors.filter(
      doc => (doc.city || '').toLowerCase() === (patientCity || '').toLowerCase()
    );

    if (cityMatchDoctors.length > 0) {
      const doctor = cityMatchDoctors.sort((a, b) => (a.activeConsultations || 0) - (b.activeConsultations || 0))[0];
      this.persistence.updateDoctor(doctor.id, { activeConsultations: (doctor.activeConsultations || 0) + 1 });
      return {
        id: doctor.id,
        name: doctor.name,
        specialization: doctor.specialty,
        fee: doctor.consultationFee,
        city: doctor.city
      };
    }

    const doctor = availableDoctors.sort((a, b) => {
      const consultsA = a.activeConsultations || 0;
      const consultsB = b.activeConsultations || 0;
      if (consultsA !== consultsB) return consultsA - consultsB;
      return (b.rating || 0) - (a.rating || 0);
    })[0];

    this.persistence.updateDoctor(doctor.id, { activeConsultations: (doctor.activeConsultations || 0) + 1 });
    return {
      id: doctor.id,
      name: doctor.name,
      specialization: doctor.specialty,
      fee: doctor.consultationFee,
      city: doctor.city,
      qualifications: doctor.qualifications,
      hospital: doctor.hospital
    };
  }

  releaseDoctor(doctorId) {
    const doctor = this.getDoctors().find(d => d.id === doctorId);
    if (doctor) {
      this.persistence.updateDoctor(doctorId, { 
        available: true,
        activeConsultations: Math.max(0, (doctor.activeConsultations || 1) - 1)
      });
    }
  }

  completeConsultation(doctorId) {
    this.releaseDoctor(doctorId);
  }

  getDoctorByPhone(phoneNumber) {
    return this.getDoctors().find(d => d.phoneNumber === phoneNumber);
  }

  findById(id) {
    return this.getDoctors().find(d => d.id === id);
  }
}

module.exports = DoctorRouter;