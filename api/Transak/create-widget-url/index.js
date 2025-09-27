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

  // Validate wallet address format (basic validation)
  if (config.walletAddress && config.walletAddress.length > 0) {
    if (config.walletAddress.length < 10) {
      errors.push('Invalid wallet address format');
    }
  }

  // Validate email format
  if (config.email && config.email.length > 0) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(config.email)) {
      errors.push('Invalid email format');
    }
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

    // Validate and sanitize widget configuration
    const widgetConfig = {
      fiatCurrency: req.body.fiatCurrency || 'USD',
      cryptoCurrencyCode: req.body.cryptoCurrencyCode || 'ETH',
      fiatAmount: Math.max(10, Math.min(50000, req.body.fiatAmount || 100)),
      network: req.body.network || 'ethereum',
      countryCode: req.body.countryCode || 'US',
      themeColor: req.body.themeColor || '000000',
      isAutoFillUserData: req.body.isAutoFillUserData !== false,
      hideMenu: req.body.hideMenu === true,
      exchangeScreenTitle: req.body.exchangeScreenTitle || 'Buy Crypto',
      isFeeCalculationHidden: req.body.isFeeCalculationHidden === true,
      isDisableCrypto: req.body.isDisableCrypto === true,
      disableWalletAddressForm: req.body.disableWalletAddressForm === true,
    };

    // Validate configuration
    const validationErrors = validateWidgetConfig(widgetConfig);
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

    // Add reference domain for security
    const origin = req.headers.origin || req.headers.referer;
    if (origin) {
      widgetConfig.referenceDomain = origin;
    }

    // Add optional fields
    if (req.body.walletAddress && req.body.walletAddress.length > 0) {
      widgetConfig.walletAddress = req.body.walletAddress;
    }
    if (req.body.email && req.body.email.length > 0) {
      widgetConfig.email = req.body.email;
    }
    if (req.body.isSell === true) {
      widgetConfig.isSell = true;
    }

    context.log(`Creating widget URL for ${widgetConfig.fiatCurrency}/${widgetConfig.cryptoCurrencyCode} on ${widgetConfig.network}`);

    const response = await makeHttpRequest(
      `${baseUrl}/api/v1/widgets/create-url`,
      'POST',
      widgetConfig,
      {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    );

    if (response.url) {
      context.log('Widget URL created successfully');
      context.res = {
        ...context.res,
        status: 200,
        body: {
          url: response.url,
          expires_at: response.expires_at,
          config: {
            fiatCurrency: widgetConfig.fiatCurrency,
            cryptoCurrencyCode: widgetConfig.cryptoCurrencyCode,
            network: widgetConfig.network,
            amount: widgetConfig.fiatAmount,
            isSell: widgetConfig.isSell || false
          }
        }
      };
    } else {
      throw new Error('Invalid response from Transak API - no URL received');
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