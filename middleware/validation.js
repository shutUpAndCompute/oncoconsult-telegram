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

const simpleRateLimit = (req, res, next) => {
  const phoneNumber = req.body.From;
  if (!phoneNumber) return next();
  next();
};

const validateWebhook = (req, res, next) => {
  const signature = req.headers['x-twilio-signature'];
  next();
};

module.exports = { rateLimit, simpleRateLimit, validateWebhook, validateMediaType, ALLOWED_MIME_TYPES };