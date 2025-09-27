import React, { useState, useEffect } from 'react';

const TransakWidget = () => {
  const [widgetUrl, setWidgetUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [config, setConfig] = useState({
    fiatCurrency: 'USD',
    cryptoCurrencyCode: 'ETH',
    fiatAmount: 100,
    network: 'ethereum',
    walletAddress: '',
    email: '',
    countryCode: 'US',
    themeColor: '000000',
    isAutoFillUserData: true,
    hideMenu: false,
    exchangeScreenTitle: 'Buy Crypto',
    isFeeCalculationHidden: false,
    isDisableCrypto: false,
    disableWalletAddressForm: false
  });

  const [transactionType, setTransactionType] = useState('BUY');

  // Network and token configurations
  const networks = {
    'ethereum': { 
      name: 'Ethereum', 
      tokens: ['ETH', 'USDC', 'USDT', 'DAI', 'WBTC', 'UNI', 'LINK', 'AAVE'] 
    },
    'polygon': { 
      name: 'Polygon', 
      tokens: ['MATIC', 'USDC', 'USDT', 'DAI', 'WETH'] 
    },
    'bsc': { 
      name: 'BSC', 
      tokens: ['BNB', 'USDT', 'BUSD', 'CAKE', 'ADA'] 
    },
    'arbitrum': { 
      name: 'Arbitrum One', 
      tokens: ['ETH', 'USDC', 'USDT', 'ARB', 'GMX'] 
    },
    'optimism': { 
      name: 'Optimism', 
      tokens: ['ETH', 'USDC', 'USDT', 'OP'] 
    },
    'avalanche': { 
      name: 'Avalanche C-Chain', 
      tokens: ['AVAX', 'USDC', 'USDT', 'JOE'] 
    },
    'solana': { 
      name: 'Solana', 
      tokens: ['SOL', 'USDC', 'RAY', 'SRM'] 
    },
    'base': {
      name: 'Base',
      tokens: ['ETH', 'USDC', 'cbBTC']
    }
  };

  const fiatCurrencies = [
    'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'INR', 
    'BRL', 'MXN', 'KRW', 'SGD', 'HKD', 'CHF', 'NOK', 'SEK'
  ];

  const countryCodes = [
    'US', 'GB', 'CA', 'AU', 'DE', 'FR', 'IT', 'ES', 
    'NL', 'IN', 'BR', 'MX', 'JP', 'KR', 'SG', 'HK'
  ];

  // API functions
  const getAccessToken = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      const response = await fetch('/api/transak/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        // Handle different error types
        if (response.status === 404) {
          throw new Error('Azure Functions not running - API endpoints not found');
        } else if (response.status === 500) {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            try {
              const errorData = await response.json();
              throw new Error(errorData.message || 'Internal server error');
            } catch (jsonErr) {
              throw new Error('Server error - check Azure Functions configuration');
            }
          } else {
            const errorText = await response.text();
            if (errorText.includes('Proxy error')) {
              throw new Error('Azure Functions proxy error - check function.json files');
            }
            throw new Error('Server configuration error');
          }
        } else {
          throw new Error(`HTTP ${response.status} - ${response.statusText}`);
        }
      }

      const data = await response.json();
      return data.access_token;
    } catch (err) {
      const errorMsg = err.message.includes('fetch') 
        ? 'API not available - check Azure Functions configuration' 
        : err.message;
      setError(`Authentication failed: ${errorMsg}`);
      console.error('Auth error:', err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const createWidgetUrl = async (token) => {
    try {
      setIsLoading(true);
      setError('');

      const widgetConfig = {
        fiatCurrency: config.fiatCurrency,
        cryptoCurrencyCode: config.cryptoCurrencyCode,
        fiatAmount: config.fiatAmount,
        network: config.network,
        countryCode: config.countryCode,
        themeColor: config.themeColor,
        isAutoFillUserData: config.isAutoFillUserData,
        hideMenu: config.hideMenu,
        exchangeScreenTitle: transactionType === 'SELL' ? 'Sell Crypto' : 'Buy Crypto',
        isFeeCalculationHidden: config.isFeeCalculationHidden,
        isDisableCrypto: config.isDisableCrypto,
        disableWalletAddressForm: config.disableWalletAddressForm,
      };

      // Add optional fields
      if (config.walletAddress) {
        widgetConfig.walletAddress = config.walletAddress;
      }
      if (config.email) {
        widgetConfig.email = config.email;
      }

      // Add transaction type for sell
      if (transactionType === 'SELL') {
        widgetConfig.isSell = true;
      }

      const response = await fetch('/api/transak/create-widget-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(widgetConfig),
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Widget URL API not available - check Azure Functions');
        }
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create widget URL');
      }

      const data = await response.json();
      if (data.url || data.widgetUrl) {
        // Handle both old and new API response formats
        const finalUrl = data.url || data.widgetUrl;
        setWidgetUrl(finalUrl);
        setError(''); // Clear any errors on success
      } else {
        throw new Error('No widget URL received from API');
      }
    } catch (err) {
      setError(`Widget URL creation failed: ${err.message}`);
      console.error('Widget URL creation error:', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Automatically try to initialize widget on component mount and config changes
    const initializeWidget = async () => {
      const token = await getAccessToken();
      if (token) {
        await createWidgetUrl(token);
      } else {
        // If API fails, show error message
        setError('Failed to connect to Transak API. Please check your configuration.');
        setIsLoading(false);
      }
    };

    initializeWidget();
  }, [config, transactionType]);

  const handleConfigChange = (key, value) => {
    setConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleNetworkChange = (network) => {
    setConfig(prev => ({
      ...prev,
      network: network,
      cryptoCurrencyCode: networks[network].tokens[0]
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Transak Widget Integration
          </h1>
          <p className="text-gray-600 text-lg">
            Production-ready crypto trading with secure API integration
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <span className="text-red-400 text-xl">❌</span>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">API Connection Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                  <p className="mt-2 font-medium">Required Configuration:</p>
                  <ul className="list-disc list-inside mt-1 text-xs">
                    <li>Azure Functions must be running</li>
                    <li>Transak API credentials configured</li>
                    <li>CORS domains properly set</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {!error && widgetUrl && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <span className="text-green-400 text-xl">✅</span>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">Transak Widget Active</h3>
                <div className="mt-2 text-sm text-green-700">
                  <p>Connected to Transak STAGING environment</p>
                  <p>Widget URL generated successfully with secure sessionId</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Configuration Panel */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-6 flex items-center">
              <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-2">
                ⚙
              </span>
              Widget Configuration
            </h2>
            
            {/* Transaction Type */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Transaction Type
              </label>
              <div className="flex space-x-2">
                <button
                  onClick={() => setTransactionType('BUY')}
                  className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
                    transactionType === 'BUY' 
                      ? 'bg-green-500 text-white shadow-lg transform scale-105' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  🟢 BUY
                </button>
                <button
                  onClick={() => setTransactionType('SELL')}
                  className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
                    transactionType === 'SELL' 
                      ? 'bg-red-500 text-white shadow-lg transform scale-105' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  🔴 SELL
                </button>
              </div>
            </div>

            {/* Network Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Blockchain Network
              </label>
              <select
                value={config.network}
                onChange={(e) => handleNetworkChange(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {Object.entries(networks).map(([key, network]) => (
                  <option key={key} value={key}>
                    {network.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Token Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cryptocurrency
              </label>
              <select
                value={config.cryptoCurrencyCode}
                onChange={(e) => handleConfigChange('cryptoCurrencyCode', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {networks[config.network].tokens.map(token => (
                  <option key={token} value={token}>
                    {token}
                  </option>
                ))}
              </select>
            </div>

            {/* Fiat Currency */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fiat Currency
              </label>
              <select
                value={config.fiatCurrency}
                onChange={(e) => handleConfigChange('fiatCurrency', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {fiatCurrencies.map(currency => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </select>
            </div>

            {/* Country Code */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Country
              </label>
              <select
                value={config.countryCode}
                onChange={(e) => handleConfigChange('countryCode', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {countryCodes.map(code => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </div>

            {/* Amount */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default Amount ({config.fiatCurrency})
              </label>
              <input
                type="number"
                value={config.fiatAmount}
                onChange={(e) => handleConfigChange('fiatAmount', parseInt(e.target.value) || 100)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min="10"
                max="10000"
              />
            </div>

            {/* Wallet Address */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Wallet Address (Optional)
              </label>
              <input
                type="text"
                value={config.walletAddress}
                onChange={(e) => handleConfigChange('walletAddress', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0x... or wallet address"
              />
            </div>

            {/* Email */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email (Optional)
              </label>
              <input
                type="email"
                value={config.email}
                onChange={(e) => handleConfigChange('email', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="user@example.com"
              />
            </div>

            {/* Theme Color */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Theme Color
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="color"
                  value={`#${config.themeColor}`}
                  onChange={(e) => handleConfigChange('themeColor', e.target.value.slice(1))}
                  className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={config.themeColor}
                  onChange={(e) => handleConfigChange('themeColor', e.target.value.replace('#', ''))}
                  className="flex-1 p-2 border border-gray-300 rounded-lg"
                  placeholder="000000"
                />
              </div>
            </div>

            {/* Options */}
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.hideMenu}
                  onChange={(e) => handleConfigChange('hideMenu', e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm">Hide Menu</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.isAutoFillUserData}
                  onChange={(e) => handleConfigChange('isAutoFillUserData', e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm">Auto-fill User Data</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.disableWalletAddressForm}
                  onChange={(e) => handleConfigChange('disableWalletAddressForm', e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm">Disable Wallet Address Form</span>
              </label>
            </div>
          </div>

          {/* Widget Preview */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-6 flex items-center">
              <span className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-2">
                📱
              </span>
              Live Widget Preview
            </h2>
            
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-96 space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                <p className="text-gray-600">Connecting to Transak API...</p>
                <p className="text-sm text-gray-500">Generating secure widget URL</p>
              </div>
            ) : widgetUrl ? (
              <div className="border-2 border-gray-200 rounded-lg overflow-hidden shadow-inner">
                <iframe
                  src={widgetUrl}
                  width="100%"
                  height="650px"
                  frameBorder="0"
                  allow="camera;microphone;payment;encrypted-media;fullscreen"
                  title="Transak Widget"
                  className="w-full"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
                  onLoad={() => {
                    console.log('Transak widget loaded successfully');
                  }}
                  onError={(e) => {
                    console.error('Widget failed to load:', e);
                  }}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-96 space-y-4 border-2 border-gray-200 rounded-lg bg-gray-50">
                <div className="text-gray-400 text-6xl">🔗</div>
                <h3 className="text-lg font-medium text-gray-700">Widget Not Available</h3>
                <p className="text-sm text-gray-500 text-center max-w-md">
                  Unable to generate Transak widget URL. Please check your API configuration and try again.
                </p>
                <button 
                  onClick={() => {
                    const initializeWidget = async () => {
                      const token = await getAccessToken();
                      if (token) {
                        await createWidgetUrl(token);
                      } else {
                        setError('Failed to connect to Transak API. Please check your configuration.');
                        setIsLoading(false);
                      }
                    };
                    initializeWidget();
                  }}
                  disabled={isLoading}
                  className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300"
                >
                  Retry Connection
                </button>
              </div>
            )}

            <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-800 mb-3">
                Current Configuration:
              </h3>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                <div><strong>Mode:</strong> {error ? 'Error' : 'Production'}</div>
                <div><strong>Type:</strong> {transactionType}</div>
                <div><strong>Network:</strong> {networks[config.network].name}</div>
                <div><strong>Token:</strong> {config.cryptoCurrencyCode}</div>
                <div><strong>Fiat:</strong> {config.fiatCurrency}</div>
                <div><strong>Amount:</strong> {config.fiatAmount}</div>
                <div><strong>Country:</strong> {config.countryCode}</div>
              </div>
            </div>

            <button
              onClick={() => {
                const initializeWidget = async () => {
                  const token = await getAccessToken();
                  if (token) {
                    await createWidgetUrl(token);
                  } else {
                    setError('Failed to connect to Transak API. Please check your configuration.');
                    setIsLoading(false);
                  }
                };
                initializeWidget();
              }}
              disabled={isLoading}
              className="w-full mt-4 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              {isLoading ? 'Connecting to Transak...' : 'Reconnect to Transak API'}
            </button>
            
            <div className="mt-2 text-center">
              <p className="text-xs text-gray-500">
                {widgetUrl 
                  ? 'Connected to live Transak API' 
                  : 'API connection required for widget'}
              </p>
            </div>
          </div>
        </div>

        {/* API Integration Guide */}
        <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">🚀 Transak Integration Status</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-3 text-blue-600">🔧 Current Environment</h3>
              <ul className="text-sm space-y-2 text-gray-700">
                <li>• <strong>Environment:</strong> STAGING</li>
                <li>• <strong>API Base:</strong> api-gateway-stg.transak.com</li>
                <li>• <strong>Widget Mode:</strong> Production API</li>
                <li>• <strong>Security:</strong> Server-side URL generation</li>
                <li>• <strong>Authentication:</strong> Bearer token based</li>
              </ul>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-3 text-green-600">✅ Ready Features</h3>
              <ul className="text-sm space-y-2 text-gray-700">
                <li>• Live API integration</li>
                <li>• Secure sessionId widget URLs</li>
                <li>• Domain validation</li>
                <li>• BUY/SELL transactions</li>
                <li>• Multiple networks & tokens</li>
              </ul>
            </div>
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-800 mb-2">📋 Required Configuration:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium text-gray-700">Environment Variables:</p>
                <code className="block bg-white p-2 rounded mt-1 text-xs">
                  TRANSAK_API_KEY=your_staging_key<br/>
                  TRANSAK_API_SECRET=your_staging_secret<br/>
                  TRANSAK_ENVIRONMENT=STAGING<br/>
                  ALLOWED_DOMAINS=your_domain
                </code>
              </div>
              <div>
                <p className="font-medium text-gray-700">API Endpoints:</p>
                <code className="block bg-white p-2 rounded mt-1 text-xs">
                  POST /api/transak/auth<br/>
                  POST /api/transak/create-widget-url<br/>
                  Base: api-gateway-stg.transak.com
                </code>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
            <h3 className="font-medium text-amber-800 mb-2">🎯 Next Steps:</h3>
            <ol className="text-sm text-amber-700 space-y-1 list-decimal list-inside">
              <li>Configure Transak STAGING credentials in Azure environment variables</li>
              <li>Test the widget with staging API</li>
              <li>Verify BUY/SELL flows work correctly</li>
              <li>Switch to PRODUCTION environment when ready</li>
              <li>Update credentials to production keys</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransakWidget;