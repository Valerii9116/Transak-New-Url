// api/Transak/index.js
const https = require('https');

// Utility to get the base URL
const getTransakBaseUrl = () => {
  const environment = process.env.TRANSAK_ENVIRONMENT || 'STAGING';
  return environment === 'PRODUCTION' 
    ? 'https://api-gateway.transak.com/' 
    : 'https://api-gateway-stg.transak.com/';
};

// Utility to make HTTP requests
function makeHttpRequest(url, method, data, headers = {}) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const postData = JSON.stringify(data);
      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || 443,
        path: urlObj.pathname + urlObj.search,
        method: method,
        headers: { 'Content-Type': 'application/json', ...headers }
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
            if (res.statusCode >= 200 && res.statusCode < 300) resolve(response);
            else reject(new Error(response.message || `HTTP ${res.statusCode}`));
          } catch (error) {
            reject(new Error('Invalid JSON response'));
          }
        });
      });
      req.on('error', (error) => reject(error));
      if (method === 'POST' || method === 'PUT') req.write(postData);
      req.end();
    });
}

// Main Function Handler
module.exports = async function (context, req) {
    const action = req.query.action;

    if (req.method === 'OPTIONS') {
        context.res = { status: 200 };
        return;
    }

    try {
        const baseUrl = getTransakBaseUrl();

        if (action === 'auth') {
            const authData = {
                apiKey: process.env.TRANSAK_API_KEY,
                secret: process.env.TRANSAK_API_SECRET,
            };
            const response = await makeHttpRequest(`${baseUrl}/api/v2/auth/session-token`, 'POST', authData);
            context.res = { status: 200, body: response };

        } else if (action === 'create-widget-url') {
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                context.res = { status: 401, body: { error: 'Missing or invalid authorization header' } };
                return;
            }
            const accessToken = authHeader.split(' ')[1];
            const widgetParams = {
                apiKey: process.env.TRANSAK_API_KEY,
                referrerDomain: req.headers.origin || req.headers.referer,
                ...req.body
            };
            const response = await makeHttpRequest(`${baseUrl}/api/v1/widgets/create-url`, 'POST', { widgetParams }, {
                'Authorization': `Bearer ${accessToken}`,
            });
            context.res = { status: 200, body: response };

        } else {
            context.res = { status: 400, body: { error: 'No action specified' } };
        }
    } catch (error) {
        context.log.error(`${action} error:`, error.message);
        context.res = { status: 500, body: { error: `Request failed for action: ${action}`, message: error.message }};
    }
};