const https = require('https');

const getTransakBaseUrl = (environment) => {
  return environment === 'PRODUCTION' 
    ? 'https://api-gateway.transak.com' 
    : 'https://api-gateway-stg.transak.com';
};

const makeHttpRequest = (url, method, data, headers = {}) => {
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
        'Content-Length': Buffer.byteLength(postData),
        ...headers
      }
    };

    const req = https.request(options, (res) => {
      let body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(response);
          } else {
            reject(new Error(response.message || `HTTP ${res.statusCode}: ${body}`));
          }
        } catch (error) {
          reject(new Error(`Invalid JSON response: ${body}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
};

module.exports = async function (context, req) {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': process.env.ALLOWED_DOMAINS || '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400'
  };

  context.res = {
    headers: corsHeaders
  };

  if (req.method === 'OPTIONS') {
    context.res.status = 200;
    return;
  }

  if (req.method !== 'POST') {
    context.res = {
      ...context.res,
      status: 405,
      body: { error: 'Method not allowed' }
    };
    return;
  }

  try {
    // Validate required environment variables
    if (!process.env.TRANSAK_API_KEY || !process.env.TRANSAK_API_SECRET) {
      throw new Error('Missing required environment variables: TRANSAK_API_KEY or TRANSAK_API_SECRET');
    }

    const environment = process.env.TRANSAK_ENVIRONMENT || 'STAGING';
    const baseUrl = getTransakBaseUrl(environment);
    
    context.log(`Authenticating with Transak API (${environment})`);

    const authData = {
      api_key: process.env.TRANSAK_API_KEY,
      api_secret: process.env.TRANSAK_API_SECRET
    };

    const response = await makeHttpRequest(
      `${baseUrl}/api/v1/auth/token`,
      'POST',
      authData
    );

    if (response.access_token) {
      context.log('Authentication successful');
      context.res = {
        ...context.res,
        status: 200,
        body: {
          access_token: response.access_token,
          expires_in: response.expires_in,
          token_type: response.token_type || 'Bearer'
        }
      };
    } else {
      throw new Error('Invalid response from Transak API - no access token received');
    }

  } catch (error) {
    context.log.error('Authentication error:', error.message);
    context.res = {
      ...context.res,
      status: 500,
      body: { 
        error: 'Authentication failed',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      }
    };
  }
};