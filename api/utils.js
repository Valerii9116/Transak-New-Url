const https = require('https');

/**
 * Returns the base URL for the Transak API based on the environment.
 * @returns {string} The base URL.
 */
function getTransakBaseUrl() {
  const environment = process.env.TRANSAK_ENVIRONMENT || 'STAGING';
  return environment === 'PRODUCTION'
    ? 'https://api-gateway.transak.com'
    : 'https://api-gateway-stg.transak.com';
}

/**
 * A utility function to make HTTP requests.
 * @param {string} url - The URL to make the request to.
 * @param {string} method - The HTTP method (e.g., 'POST').
 * @param {object} data - The data to send in the request body.
 * @param {object} headers - Additional headers to include.
 * @returns {Promise<object>} A promise that resolves with the JSON response.
 */
function makeHttpRequest(url, method, data, headers = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const postData = JSON.stringify(data);

    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    if (method === 'POST' || method === 'PUT') {
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(response);
          } else {
            reject(new Error(response.message || `HTTP ${res.statusCode}`));
          }
        } catch (error) {
          reject(new Error('Invalid JSON response from Transak API'));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (method === 'POST' || method === 'PUT') {
      req.write(postData);
    }
    req.end();
  });
}

module.exports = { getTransakBaseUrl, makeHttpRequest };