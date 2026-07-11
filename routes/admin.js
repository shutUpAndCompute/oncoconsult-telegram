const express = require('express');
const router = express.Router();
const adminRegistry = require('../services/adminRegistry');
const { UserPersona, PersonaTypes } = require('../models/persona');
const { adminRateLimit } = require('../middleware/validation');
const crypto = require('crypto');

function generateApiKey() {
  return crypto.randomBytes(16).toString('hex');
}

function sanitizePhone(phone) {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length === 0) return null;
  return digits;
}

function validateRole(role) {
  const validRoles = ['admin', 'super_admin', 'support', 'doctor', 'caregiver'];
  return validRoles.includes(role?.toLowerCase()) ? role.toLowerCase() : 'admin';
}

function requireAdmin(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.headers['x-admin-api-key'];
  const requesterPhone = sanitizePhone(req.body.requesterPhone || req.headers['x-admin-phone']);
  
  if (!apiKey && !requesterPhone) {
    return res.status(403).json({ error: 'Admin authentication required' });
  }
  
  if (apiKey) {
    const expectedKey = process.env.ADMIN_API_KEY;
    if (!expectedKey || apiKey !== expectedKey) {
      return res.status(403).json({ error: 'Invalid API key' });
    }
    req.isApiKeyAuth = true;
    return next();
  }
  
  const requester = new UserPersona(requesterPhone);
  if (!requester.isAdmin() && requester.type !== PersonaTypes.SUPPORT) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

function requireSuperAdmin(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.headers['x-admin-api-key'];
  const requesterPhone = sanitizePhone(req.body.requesterPhone || req.headers['x-admin-phone']);
  
  if (!apiKey && !requesterPhone) {
    return res.status(403).json({ error: 'Super admin authentication required' });
  }
  
  if (apiKey) {
    const expectedKey = process.env.ADMIN_API_KEY;
    if (!expectedKey || apiKey !== expectedKey) {
      return res.status(403).json({ error: 'Invalid API key' });
    }
    return next();
  }
  
  const requester = new UserPersona(requesterPhone);
  if (requester.type !== PersonaTypes.SUPER_ADMIN) {
    return res.status(403).json({ error: 'Only Super Admin can perform this action' });
  }
  next();
}

router.get('/list', adminRateLimit, requireAdmin, (req, res) => {
  console.log(`[AdminAPI] List admins by ${req.isApiKeyAuth ? 'API key' : 'phone'}`);
  res.json(adminRegistry.getAdmins());
});

router.post('/register', adminRateLimit, requireSuperAdmin, (req, res) => {
   const telegramId = sanitizePhone(req.body.telegramId);
   const phoneNumber = sanitizePhone(req.body.phoneNumber);
   const role = validateRole(req.body.role);
   const name = req.body.name?.trim() || null;
   
   if (!telegramId && !phoneNumber) {
     return res.status(400).json({ error: 'telegramId or phoneNumber required' });
   }
   
   const addedBy = sanitizePhone(req.body.requesterPhone) || 'api-key';
   const admin = adminRegistry.addAdmin(telegramId || phoneNumber, addedBy, telegramId, role, name);
   
   console.log(`[AdminAPI] Admin registered: ${admin.id} by ${addedBy}`);
   res.json({ success: true, admin });
 });

router.delete('/:identifier', adminRateLimit, requireSuperAdmin, (req, res) => {
  const identifier = sanitizePhone(req.params.identifier);
  
  if (!identifier) {
    return res.status(400).json({ error: 'Invalid identifier' });
  }
  
  const removed = adminRegistry.removeAdmin(identifier);
  
  console.log(`[AdminAPI] Admin removed: ${identifier}`);
  res.json({ success: removed });
});

module.exports = router;