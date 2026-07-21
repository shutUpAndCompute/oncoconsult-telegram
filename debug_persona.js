const { UserPersona } = require('./models/persona');
const UserRegistry = require('./services/userRegistry');
const adminRegistry = require('./services/adminRegistry');
const DoctorRouter = require('./services/doctorRouter');

const userRegistry = new UserRegistry();
const doctorRouter = new DoctorRouter();

const DOCTOR_CHAT = 'doctor456';
userRegistry.requestRole(DOCTOR_CHAT, 'doctor');
userRegistry.approveRole(DOCTOR_CHAT, 'doctor');
doctorRouter.persistence.addDoctor({ telegramId: DOCTOR_CHAT, name: 'E2E Doctor', specialty: 'general', cancerTypes: ['general'], phoneNumber: DOCTOR_CHAT });

const persona = new UserPersona(DOCTOR_CHAT);
console.log('Type:', persona.type);
console.log('User:', userRegistry.getUser(DOCTOR_CHAT));
