/**
 * Configuration for CareDash SMART on FHIR App
 *
 * SETUP INSTRUCTIONS:
 * 1. Copy this file to config.js
 * 2. Fill in your credentials
 * 3. Never commit config.js to git!
 */

// === SMART on FHIR OAuth2 Credentials ===
window.SMART_CLIENT_ID = 'YOUR_CLIENT_ID_HERE';
window.SMART_CLIENT_SECRET = 'YOUR_CLIENT_SECRET_HERE';

// === Gemini AI Configuration ===
// Option 1: Cloudflare Workers proxy (recommended for production)
// window.GEMINI_API_ENDPOINT = 'https://your-worker.workers.dev';

// Option 2: Direct API key (for development/testing)
// Get your API key from: https://aistudio.google.com/apikey
// window.GEMINI_API_KEY = 'YOUR_GEMINI_API_KEY_HERE';
