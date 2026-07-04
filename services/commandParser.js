class CommandParser {
  static parse(message) {
    const trimmed = message.trim();
    
    const commands = {
      // Patient commands
      MENU: { match: /^menu$/i, args: 0, handler: 'showMenu' },
      CONNECT: { match: /^connect$/i, args: 0, handler: 'connect' },
      PAYMENT: { match: /^payment$/i, args: 0, handler: 'payment' },
      
      // Admin commands (numbered menu)
      ADMIN_DOCTORS: { match: /^1$/i, handler: 'listDoctors' },
      ADMIN_SPECIALTIES: { match: /^2$/i, handler: 'listSpecialties' },
      ADMIN_CANCERS: { match: /^3$/i, handler: 'listCancers' },
      ADMIN_PAY: { match: /^4$/i, handler: 'adminPay' },
      ADMIN_REGISTER: { match: /^5$/i, handler: 'adminRegister' },
      ADMIN_UPDATE: { match: /^6$/i, handler: 'adminUpdate' },
      ADMIN_DELETE: { match: /^7$/i, handler: 'adminDelete' },
      ADMIN_AVAILABILITY: { match: /^8$/i, handler: 'adminAvailability' },
      
      // Action commands with args
      REGISTER_DOCTOR: { match: /^REGISTER\s+(.+)$/i, args: 1, handler: 'registerDoctor', adminOnly: true },
      UPDATE_DOCTOR: { match: /^UPDATE\s+(\S+)\s+(\S+)\s+(.+)$/i, args: 3, handler: 'updateDoctor', adminOnly: true },
      DELETE_DOCTOR: { match: /^DELETE\s+(\S+)$/i, args: 1, handler: 'deleteDoctor', adminOnly: true },
      SET_AVAILABILITY: { match: /^AVAILABILITY\s+(\S+)\s+(true|false|1|0)$/i, args: 2, handler: 'setAvailability', adminOnly: true },
      PAY_PATIENT: { match: /^PAY\s+(\S+)\s+(\d+)\s+(\d+)\s+(\d+)\s*(.*)$/i, args: 4, handler: 'payPatient', adminOnly: true }
    };

    for (const [key, cmd] of Object.entries(commands)) {
      const match = trimmed.match(cmd.match);
      if (match) {
        return {
          command: key,
          handler: cmd.handler,
          adminOnly: cmd.adminOnly || false,
          args: match.slice(1)
        };
      }
    }

    return { command: null, handler: null, adminOnly: false, args: [] };
  }

  static isValidCommand(message) {
    return this.parse(message).command !== null;
  }
}

module.exports = CommandParser;