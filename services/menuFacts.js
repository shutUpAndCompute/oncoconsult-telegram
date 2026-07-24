// The ONLY place in the app that reads live data from services to answer
// "is X pending / complete / active". Every menuTree.js leaf's isPending()
// reads from the plain object these functions return - it never touches a
// service directly. This is what makes the cascade trustworthy: there is
// exactly one implementation of each fact, computed once per render, and
// every node (however deep) that depends on it reads the same value.
//
// `services` is expected to carry: consultationManager, paymentService,
// userRegistry, adminRegistry, doctorPersistence, doctorRouter,
// conversationFlow.

function computeAdminFacts(chatId, services) {
  const { consultationManager, paymentService, userRegistry, adminRegistry, doctorRouter, doctorPersistence } = services || {};
  const pendingDoctorsSource = doctorRouter?.persistence || doctorPersistence;

  return {
    pendingConsultations: consultationManager?.getPendingForAdmin?.()?.length || 0,
    activeConsultations: Array.from(consultationManager?.consultations?.values() || []).filter(c => c.status === 'active').length,
    isAdminProfileComplete: adminRegistry?.isAdminProfileComplete?.(chatId) || false,
    adminMissingFields: adminRegistry?.getIncompleteProfileFields?.(chatId) || [],
    hasPendingPayments: Array.from(paymentService?.payments?.values() || []).some(p => p.status === 'pending' && !p.feePending),
    hasPendingDiscounts: Array.from(consultationManager?.sessions?.values() || []).some(s =>
      s.patientProfile?.discountCategory && s.patientProfile?.discountVerificationStatus === 'pending'),
    pendingDoctorRoleRequests: userRegistry?.getPendingRequests?.('doctor')?.length || 0,
    pendingCaregiverRoleRequests: userRegistry?.getPendingRequests?.('caregiver')?.length || 0,
    pendingSupportRoleRequests: userRegistry?.getPendingRequests?.('support')?.length || 0,
    pendingDoctorInvites: (pendingDoctorsSource?.getPendingDoctors?.() || []).length
  };
}

function computePatientFacts(chatId, services) {
  const { consultationManager, conversationFlow } = services;
  const session = consultationManager.getSession(chatId);
  const isCaregiver = session?.isCaregiver || session?.selectedPersona === 'caregiver';
  const missingFields = session?.patientProfile
    ? conversationFlow.getIncompleteProfileFields(session)
    : { name: true, age: true };

  return {
    isProfileComplete: conversationFlow.isProfileComplete(session),
    hasMissingProfileFields: Object.keys(missingFields).length > 0,
    hasPendingConsultation: !!consultationManager.getPendingConsultationByPatient(chatId),
    hasActiveConsultation: Array.from(consultationManager.consultations.values())
      .some(c => c.patientPhone === chatId && c.status === 'active'),
    isCaregiver,
    patientName: session?.patientName
  };
}

function computeDoctorFacts(chatId, services) {
  const { consultationManager, doctorPersistence } = services;
  const doctor = doctorPersistence.getDoctors().find(d =>
    d.telegramId === chatId || String(d.phoneNumber).replace('+', '') === chatId);
  return {
    doctorName: doctor?.name || 'Doctor',
    hasActiveConsultation: !!doctor && Array.from(consultationManager.consultations.values())
      .some(c => c.doctorId === doctor.id && c.status === 'active'),
    pendingActions: doctor ? (consultationManager.getPendingActionsForDoctor(doctor.id) || 0) : 0
  };
}

module.exports = { computeAdminFacts, computePatientFacts, computeDoctorFacts };
