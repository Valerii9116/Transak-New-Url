const https = require('https');

const getTransakBaseUrl = (environment) => {
  return environment === 'PRODUCTION' 
    ? 'https://api-gateway.transak.com' 
    : 'https://api-gateway-sdk.transak.com';
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

const validateWidgetConfig = (config) => {
  const errors = [];

  // Validate fiat currency
  const validFiatCurrencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'INR', 'BRL', 'MXN', 'KRW', 'SGD', 'HKD', 'CHF', 'NOK', 'SEK'];
  if (!validFiatCurrencies.includes(config.fiatCurrency)) {
    errors.push('Invalid fiat currency');
  }

  // Validate amount
  if (!config.fiatAmount || config.fiatAmount < 10 || config.fiatAmount > 50000) {
    errors.push('Fiat amount must be between 10 and 50000');
  }

  // Validate network
  const validNetworks = ['ethereum', 'polygon', 'bsc', 'arbitrum', 'optimism', 'avalanche', 'solana', 'base'];
  if (!validNetworks.includes(config.network)) {
    errors.push('Invalid network');
  }

  // Validate crypto currency (basic validation)
  if (!config.cryptoCurrencyCode || config.cryptoCurrencyCode.length < 2) {
    errors.push('Invalid crypto currency code');
  }

  // Validate country code
  const validCountryCodes = ['US', 'GB', 'CA', 'AU', 'DE', 'FR', 'IT', 'ES', 'NL', 'IN', 'BR', 'MX', 'JP', 'KR', 'SG', 'HK'];
  if (!validCountryCodes.includes(config.countryCode)) {
    errors.push('Invalid country code');
  }

  return errors;
};

module.exports = async function (context, req) {
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
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      context.res = {
        ...context.res,
        status: 401,
        body: { error: 'Missing or invalid authorization header' }
      };
      return;
    }

    const accessToken = authHeader.split(' ')[1];
    const environment = process.env.TRANSAK_ENVIRONMENT || 'STAGING';
    const baseUrl = getTransakBaseUrl(environment);

    // Build widget parameters according to new API format
    const widgetParams = {
      // Mandatory parameters (as per Transak documentation)
      apiKey: process.env.TRANSAK_API_KEY,
      referrerDomain: req.headers.origin || req.headers.referer || process.env.ALLOWED_DOMAINS?.split(',')[0] || 'http://localhost:3000',
      
      // Core widget configuration
      environment: environment,
      fiatCurrency: req.body.fiatCurrency || 'USD',
      cryptoCurrencyCode: req.body.cryptoCurrencyCode || 'ETH',
      fiatAmount: Math.max(10, Math.min(50000, req.body.fiatAmount || 100)),
      network: req.body.network || 'ethereum',
      countryCode: req.body.countryCode || 'US',
      themeColor: req.body.themeColor || '000000',
      
      // UI configuration
      isAutoFillUserData: req.body.isAutoFillUserData !== false,
      hideMenu: req.body.hideMenu === true,
      exchangeScreenTitle: req.body.exchangeScreenTitle || 'Buy Crypto',
      isFeeCalculationHidden: req.body.isFeeCalculationHidden === true,
      isDisableCrypto: req.body.isDisableCrypto === true,
      disableWalletAddressForm: req.body.disableWalletAddressForm === true,
    };

    // Add optional fields
    if (req.body.walletAddress && req.body.walletAddress.length > 0) {
      widgetParams.walletAddress = req.body.walletAddress;
    }
    if (req.body.email && req.body.email.length > 0) {
      widgetParams.email = req.body.email;
    }
    if (req.body.isSell === true) {
      widgetParams.isSell = true;
    }

    // Validate mandatory parameters
    if (!widgetParams.apiKey) {
      throw new Error('TRANSAK_API_KEY environment variable is required');
    }
    if (!widgetParams.referrerDomain) {
      throw new Error('referrerDomain is required - could not determine from request headers or environment');
    }

    context.log(`Creating widget URL with referrerDomain: ${widgetParams.referrerDomain}`);
    context.log(`Widget config: ${widgetParams.fiatCurrency}/${widgetParams.cryptoCurrencyCode} on ${widgetParams.network}`);

    // Validate configuration
    const validationErrors = validateWidgetConfig(widgetParams);
    if (validationErrors.length > 0) {
      context.res = {
        ...context.res,
        status: 400,
        body: { 
          error: 'Invalid widget configuration',
          details: validationErrors
        }
      };
      return;
    }

    context.log(`Creating widget URL for ${widgetParams.fiatCurrency}/${widgetParams.cryptoCurrencyCode} on ${widgetParams.network}`);

    // Use the new Create Widget URL API endpoint
    const response = await makeHttpRequest(
      `${baseUrl}/api/v1/widgets/create-url`,
      'POST',
      { widgetParams },
      {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    );

    if (response.widgetUrl) {
      context.log('Widget URL created successfully');
      context.res = {
        ...context.res,
        status: 200,
        body: {
          url: response.widgetUrl,
          expires_at: response.expires_at,
          sessionId: response.sessionId,
          config: {
            fiatCurrency: widgetParams.fiatCurrency,
            cryptoCurrencyCode: widgetParams.cryptoCurrencyCode,
            network: widgetParams.network,
            amount: widgetParams.fiatAmount,
            isSell: widgetParams.isSell || false
          }
        }
      };
    } else {
      throw new Error('Invalid response from Transak API - no widgetUrl received');
    }

  } catch (error) {
    context.log.error('Widget URL creation error:', error.message);
    
    // Handle specific error types
    let statusCode = 500;
    let errorMessage = 'Failed to create widget URL';
    
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      statusCode = 401;
      errorMessage = 'Authentication failed - token may be expired';
    } else if (error.message.includes('400') || error.message.includes('Bad Request')) {
      statusCode = 400;
      errorMessage = 'Invalid request parameters';
    } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
      statusCode = 403;
      errorMessage = 'Access denied - check API permissions';
    }

    context.res = {
      ...context.res,
      status: statusCode,
      body: { 
        error: errorMessage,
        message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      }
    };
  }
};