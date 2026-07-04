const { DISCOUNT_TIERS } = require('./paymentService');

const PERSONA_TYPES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  DOCTOR: 'doctor',
  CAREGIVER: 'caregiver',
  PATIENT: 'patient',
  SUPPORT: 'support'
};

const VIEWABLE_ROLES = [PERSONA_TYPES.SUPER_ADMIN, PERSONA_TYPES.ADMIN, PERSONA_TYPES.DOCTOR];

class DiscountService {
  static canViewDiscounts(persona) {
    return VIEWABLE_ROLES.includes(persona);
  }

  static canApplyDiscounts(persona) {
    return VIEWABLE_ROLES.includes(persona);
  }

  static getDiscountInfo(persona) {
    if (!this.canViewDiscounts(persona)) {
      return `💡 *Discount Information*\n\nSharing your medical eligibility information (consultation data and reports) may qualify you for discounts at the discretion of our administrators.`;
    }

    const tiers = Object.entries(DISCOUNT_TIERS)
      .filter(([cat]) => cat !== 'none')
      .map(([cat, pct]) => `${cat.replace(/_/g, ' ').toUpperCase()}: ${pct}%`)
      .join('\n');

    return `🏛️ *Discount Tiers (Admin Reference)*\n\n${tiers}\n\nAll discounts are guidance. Admin may apply any discount at their discretion to maintain profitability.`;
  }

  static calculateBaseDiscount(patientProfile) {
    if (!patientProfile) return 0;

    if (patientProfile.medicalReports?.length > 0 && patientProfile.cancerType) {
      return 10;
    }

    if (patientProfile.consentDataSharing) {
      return 5;
    }

    return 0;
  }

  static calculateTotalDiscount(baseAmount, patientProfile, adminOverridePercent = 0) {
    let totalDiscount = 0;

    const baseDiscount = this.calculateBaseDiscount(patientProfile);
    totalDiscount = Math.max(totalDiscount, baseDiscount);

    if (patientProfile?.discountVerificationStatus === 'verified' && patientProfile?.discountCategory) {
      const categoryDiscount = DISCOUNT_TIERS[patientProfile.discountCategory] || 0;
      totalDiscount = Math.max(totalDiscount, categoryDiscount);
    }

    const finalDiscount = adminOverridePercent > 0 ? adminOverridePercent : totalDiscount;

    return {
      originalAmount: baseAmount,
      totalDiscountPercent: finalDiscount,
      finalAmount: Math.round(baseAmount * (1 - finalDiscount / 100)),
      baseDiscountPercent: baseDiscount,
      categoryDiscountPercent: patientProfile?.discountCategory ? DISCOUNT_TIERS[patientProfile.discountCategory] : 0,
      adminOverridePercent
    };
  }

  static applyAdminDiscount(phoneNumber, consultationId, discountPercent, adminPhone, adminNote = '') {
    const consultation = require('./consultationManager').prototype.getConsultationById(consultationId);
    if (!consultation) return false;

    consultation.adminAppliedDiscount = discountPercent;
    consultation.adminDiscountNote = adminNote;
    consultation.discountAppliedBy = adminPhone;
    consultation.discountAppliedAt = new Date();

    return true;
  }

  static getPricingInfo(persona) {
    const basePrices = {
      first_consultation: 1500,
      followup: 800,
      report_review: 500
    };

    if (!this.canViewDiscounts(persona)) {
      return `💰 *Consultation Pricing*\n\n• First Consultation: ₹${basePrices.first_consultation}\n• Follow-up: ₹${basePrices.followup}\n• Report Review: ₹${basePrices.report_review}\n\n💡 Sharing eligibility information may qualify you for discounts at admin discretion.`;
    }

    return `💰 *Pricing & Discounts*\n\nBase Fees:\n• First Consultation: ₹${basePrices.first_consultation}\n• Follow-up: ₹${basePrices.followup}\n• Report Review: ₹${basePrices.report_review}\n\nAutomatic discounts applied for eligible patients.`;
  }
}

module.exports = { DiscountService, PERSONA_TYPES };