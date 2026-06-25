class PatientProfile {
  constructor(data) {
    this.id = data.id || `pat_${Date.now()}`;
    this.phoneNumber = data.phoneNumber;
    this.name = data.name || '';
    this.age = data.age || null;
    this.gender = data.gender || '';
    this.location = data.location || '';
    this.medicalHistory = data.medicalHistory || [];
    this.currentMedications = data.currentMedications || [];
    this.allergies = data.allergies || [];
    this.reports = data.reports || [];
    this.registeredAt = data.registeredAt || new Date();
  }
}

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
      patient.reports.push({
        id: `rep_${Date.now()}`,
        ...report,
        uploadedAt: new Date()
      });
    }
  }
};

module.exports = { PatientProfile, patientRegistry };