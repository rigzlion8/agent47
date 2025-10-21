/**
 * Axios configuration for VS Code extension environment
 * This ensures axios uses Node.js adapters instead of browser APIs
 */

import axios from 'axios';

// Configure axios for Node.js environment
// In VS Code extensions, we're always in a Node.js environment
const axiosDefaults = axios.defaults;

// Set default adapter to use Node.js HTTP/HTTPS
if (!axiosDefaults.adapter) {
  // This ensures axios uses the proper Node.js adapter
  // rather than trying to use browser APIs
  axiosDefaults.adapter = require('axios/lib/adapters/http');
}

export default axios;