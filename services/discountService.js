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

  static getDiscountInfo(persona) {
    if (!this.canViewDiscounts(persona)) {
      return `💡 *Discount Information*\n\nAll discounts are at the discretion of administrators. To be considered for discounts, you must share eligibility documents (medical reports and socio-economic category documentation).`;
    }

    const tiers = Object.entries(DISCOUNT_TIERS)
      .filter(([cat]) => cat !== 'none')
      .map(([cat, pct]) => `${cat.replace(/_/g, ' ').toUpperCase()}: ${pct}%`)
      .join('\n');

    return `🏛️ *Discount Tiers (Indicative for Admin Reference)*\n\n${tiers}\n\nAll discounts are discretionary. Apply based on case merit and profitability.`;
  }

  static generateIndicativeBreakdown(baseAmount, patientProfile) {
    if (!patientProfile) {
      return {
        originalAmount: baseAmount,
        appliedDiscounts: [],
        totalDiscountPercent: 0,
        finalAmount: baseAmount
      };
    }

    const breakdown = {
      originalAmount: baseAmount,
      appliedDiscounts: [],
      totalDiscountPercent: 0,
      finalAmount: baseAmount
    };

    if (patientProfile.medicalReports?.length > 0 && patientProfile.cancerType) {
      breakdown.appliedDiscounts.push({ type: 'medical_sharing', percent: 0, label: 'Medical Data Shared - eligible for discount consideration' });
    }

    if (patientProfile.discountCategory && patientProfile.discountCategory !== 'none' && patientProfile.discountDocuments?.length > 0) {
      breakdown.appliedDiscounts.push({
        type: 'socio_economic',
        percent: DISCOUNT_TIERS[patientProfile.discountCategory] || 0,
        label: `${patientProfile.discountCategory.replace(/_/g, ' ')} (${DISCOUNT_TIERS[patientProfile.discountCategory] || 0}% indicative - DOCUMENTS REQUIRED)`
      });
    }

    return breakdown;
  }

  static presentPaymentEstimate(baseAmount, patientProfile, adminAppliedDiscount = 0, adminNote = '') {
    let message = `💰 *Payment Estimate*\n\n`;
    message += `Base Amount: ₹${baseAmount}\n\n`;

    if (patientProfile) {
      const breakdown = this.generateIndicativeBreakdown(baseAmount, patientProfile);
      
      if (breakdown.appliedDiscounts.length > 0) {
        message += `*Eligibility Indicators:*\n`;
        breakdown.appliedDiscounts.forEach(d => {
          message += `• ${d.label}\n`;
        });
        message += `\n⚠️ Final discount is at admin discretion. You may opt out of any discount and pay the full amount.\n`;
      }
    }

    if (adminAppliedDiscount > 0) {
      const finalAmount = Math.round(baseAmount * (1 - adminAppliedDiscount / 100));
      message += `\n📊 *Admin Proposed Discount:* ${adminAppliedDiscount}%\n`;
      message += `*Final Amount:* ₹${finalAmount}\n\n`;
      message += `Reply with:\n1. Accept discount (proceed to payment)\n2. Opt out (pay full ₹${baseAmount})\n3. Request review`;
    } else {
      message += `\nReply with:\n1. Proceed with payment (₹${baseAmount})\n2. Request review`;
    }

    if (adminNote) {
      message += `\n\nAdmin Note: ${adminNote}`;
    }

    return message;
  }

  static getPaymentOptionsMessage(baseAmount, adminAppliedDiscount = 0) {
    const finalAmount = adminAppliedDiscount > 0 
      ? Math.round(baseAmount * (1 - adminAppliedDiscount / 100)) 
      : baseAmount;
    
    return `💳 *Payment Options*\n\n` +
      `Base Amount: ₹${baseAmount}\n` +
      `${adminAppliedDiscount > 0 ? `Proposed Discount: ${adminAppliedDiscount}%\nFinal Amount: ₹${finalAmount}\n\n` : ''}` +
      `Choose your preferred option:\n\n` +
      `1. Accept discount and proceed to payment\n` +
      `2. Opt out of discounts (pay ₹${baseAmount})\n` +
      `3. Request review from admin`;
  }
}

module.exports = { DiscountService, PERSONA_TYPES };