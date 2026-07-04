const rateLimit = {
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this number'
};

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/tiff',
  'image/gif',
  'application/pdf'
];

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.tiff', '.gif', '.pdf'];

const validateMediaType = (contentType, url) => {
  if (!contentType) return false;
  
  if (ALLOWED_MIME_TYPES.includes(contentType.toLowerCase())) {
    return true;
  }
  
  const ext = contentType.match(/filename\*?=.*?\.(.+?)(;|"$)/i);
  if (ext) {
    const extension = '.' + ext[1].toLowerCase();
    return ALLOWED_EXTENSIONS.includes(extension);
  }
  
  return false;
};

const rateLimitStore = new Map();

function createRateLimiter(options = rateLimit) {
  const { windowMs, max, message } = options;
  
  return (req, res, next) => {
    const key = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const now = Date.now();
    
    if (!rateLimitStore.has(key)) {
      rateLimitStore.set(key, []);
    }
    
    const requests = rateLimitStore.get(key);
    const validRequests = requests.filter(time => now - time < windowMs);
    
    if (validRequests.length >= max) {
      const retryAfter = Math.ceil((windowMs - (now - validRequests[0])) / 1000);
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({ error: message || 'Too many requests', retryAfter });
    }
    
    validRequests.push(now);
    rateLimitStore.set(key, validRequests);
    next();
  };
}

const simpleRateLimit = createRateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  message: 'Too many requests, please slow down'
});

const adminRateLimit = createRateLimiter({
  windowMs: 60 * 1000,
  max: 60,
  message: 'Too many admin requests'
});

const validateWebhook = (req, res, next) => {
  const signature = req.headers['x-twilio-signature'];
  next();
};

module.exports = { 
  rateLimit, 
  createRateLimiter, 
  simpleRateLimit, 
  adminRateLimit,
  validateWebhook, 
  validateMediaType, 
  ALLOWED_MIME_TYPES 
};