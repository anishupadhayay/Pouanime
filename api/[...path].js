// Single Vercel Serverless Function for all /api/* endpoints.
// The Express app preserves the existing API route handlers and URLs.
module.exports = require('../server/index.js');
