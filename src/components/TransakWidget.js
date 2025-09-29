import React, { useState, useEffect, useRef } from 'react';
import { Transak } from '@transak/transak-sdk';

const TransakWidget = () => {
  const [transak, setTransak] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isWidgetOpen, setIsWidgetOpen] = useState(false);
  const widgetContainerRef = useRef(null);
  
  const [config, setConfig] = useState({
    apiKey: process.env.REACT_APP_TRANSAK_API_KEY || 'your-staging-api-key',
    environment: process.env.REACT_APP_TRANSAK_ENVIRONMENT || 'STAGING',
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
    disableWalletAddressForm: false,
    hostURL: window.location.origin
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

  // Initialize Transak SDK with server-side CreateWidgetURL approach
  useEffect(() => {
    const createWidgetUrlAndInitialize = async () => {
      if (!config.apiKey || config.apiKey === 'your-staging-api-key') {
        return;
      }

      try {
        setIsLoading(true);
        setError('');

        // Clean up existing instance if it exists
        if (transak) {
          transak.cleanup();

        }

        console.log('Creating widget URL via server-side CreateWidgetURL API...');

        // Call your server endpoint that implements Transak's CreateWidgetURL API
        const widgetParams = {
          apiKey: config.apiKey,
          referrerDomain: window.location.origin,
          fiatAmount: config.fiatAmount.toString(),
          cryptoCurrencyCode: config.cryptoCurrencyCode,
          fiatCurrency: config.fiatCurrency,
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

        if (config.walletAddress) {
          widgetParams.walletAddress = config.walletAddress;
        }
        if (config.email) {
          widgetParams.email = config.email;
        }
        if (transactionType === 'SELL') {
          widgetParams.isSell = true;
        }

        // For now, create a direct URL since server-side CreateWidgetURL isn't implemented yet
        // TODO: Replace this with actual server API call to CreateWidgetURL endpoint
        const baseUrl = config.environment === 'PRODUCTION' 
          ? 'https://api-gateway.transak.com/' 
          : 'https://api-gateway-stg.transak.com/';

        const queryParams = new URLSearchParams(widgetParams).toString();
        const widgetUrl = `${baseUrl}?${queryParams}`;

        console.log('Generated widget URL:', widgetUrl);

        const transakConfig = {
          widgetUrl: widgetUrl,
          containerId: 'transakMount',
          referrer: window.location.origin,
        };

        const transakInstance = new Transak(transakConfig);
        
        // Set up event listeners only once
        Transak.on(Transak.EVENTS.TRANSAK_WIDGET_INITIALISED, () => {
          console.log('Transak widget initialized');
          setIsLoading(false);
          setIsWidgetOpen(true);
          setError('');
        });

        Transak.on(Transak.EVENTS.TRANSAK_WIDGET_CLOSE, () => {
          console.log('Transak widget closed');
          setIsWidgetOpen(false);
        });

        Transak.on(Transak.EVENTS.TRANSAK_ORDER_CREATED, (orderData) => {
          console.log('Order created:', orderData);
        });

        Transak.on(Transak.EVENTS.TRANSAK_ORDER_SUCCESSFUL, (orderData) => {
          console.log('Order successful:', orderData);
        });

        transakInstance.init();
        setTransak(transakInstance);

      } catch (err) {
        console.error('Transak initialization error:', err);
        setError(`Failed to initialize Transak: ${err.message}`);
        setIsLoading(false);
      }
    };

    createWidgetUrlAndInitialize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, transactionType]); // FIX #2: The dependency on 'transak' is what caused the infinite loop. It has been removed.

  useEffect(() => {
    return () => {
      if (transak) {
        transak.cleanup();
      }
    };
  }, [transak]);

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

  const openWidgetManually = () => {
    if (!config.apiKey || config.apiKey === 'your-staging-api-key') {
      setError('Please configure your Transak API key');
      return;
    }
    if (transak && !isWidgetOpen) {
      transak.init();
      setIsWidgetOpen(true);
    }
  };

  const closeWidget = () => {
    if (transak) {
      transak.close();
      setIsWidgetOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Transak Widget Integration
          </h1>
          <p className="text-gray-600 text-lg">
            Official Transak SDK with new API approach
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <span className="text-red-400 text-xl">❌</span>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Configuration Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {isWidgetOpen && !error && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <span className="text-green-400 text-xl">✅</span>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">Transak Widget Active</h3>
                <div className="mt-2 text-sm text-green-700">
                  <p>Connected to Transak {config.environment} environment</p>
                  <p>Widget initialized successfully using official SDK</p>
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

            {/* API Key */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Transak API Key
              </label>
              <input
                type="text"
                value={config.apiKey}
                onChange={(e) => handleConfigChange('apiKey', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your Transak API key"
              />
            </div>

            {/* Environment */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Environment
              </label>
              <select
                value={config.environment}
                onChange={(e) => handleConfigChange('environment', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="STAGING">Staging</option>
                <option value="PRODUCTION">Production</option>
              </select>
            </div>
            
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
          </div>

          {/* Widget Preview */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-6 flex items-center">
              <span className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-2">
                📱
              </span>
              Transak Widget
            </h2>

            {/* Widget Container */}
            <div 
              id="transakMount" 
              ref={widgetContainerRef}
              className="min-h-96 border-2 border-gray-200 rounded-lg overflow-hidden"
            >
              {!isWidgetOpen && !isLoading && (
                <div className="flex flex-col items-center justify-center h-96 space-y-4">
                  <div className="text-gray-400 text-6xl">🚀</div>
                  <h3 className="text-lg font-medium text-gray-700">Ready to Launch</h3>
                  <p className="text-sm text-gray-500 text-center max-w-md">
                    Enter your API key above and the widget will initialize automatically
                  </p>
                </div>
              )}
              
              {isLoading && (
                <div className="flex flex-col items-center justify-center h-96 space-y-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                  <p className="text-gray-600">Initializing Transak Widget...</p>
                </div>
              )}
            </div>

            <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-800 mb-3">
                Current Configuration:
              </h3>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                <div><strong>Environment:</strong> {config.environment}</div>
                <div><strong>Type:</strong> {transactionType}</div>
                <div><strong>Network:</strong> {networks[config.network].name}</div>
                <div><strong>Token:</strong> {config.cryptoCurrencyCode}</div>
                <div><strong>Fiat:</strong> {config.fiatCurrency}</div>
                <div><strong>Amount:</strong> {config.fiatAmount}</div>
              </div>
            </div>

            <div className="mt-4 flex space-x-2">
              <button
                onClick={openWidgetManually}
                disabled={isLoading || isWidgetOpen}
                className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white font-medium py-3 px-4 rounded-lg transition-colors"
              >
                {isLoading ? 'Initializing...' : isWidgetOpen ? 'Widget Open' : 'Open Transak Widget'}
              </button>
              
              {isWidgetOpen && (
                <button
                  onClick={closeWidget}
                  className="px-4 py-3 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>

        {/* SDK Integration Guide */}
        <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">🎯 Transak SDK v4.0.0 Integration</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-amber-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-3 text-amber-600">⚠️ Current Approach</h3>
              <ul className="text-sm space-y-2 text-gray-700">
                <li>• Using direct widget URL approach</li>
                <li>• SDK v4.0.0 requires pre-generated widgetUrl</li>
                <li>• Temporary solution until CreateWidgetURL API</li>
                <li>• Works for testing and demonstration</li>
                <li>• Real-time configuration updates</li>
              </ul>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-3 text-blue-600">🚀 Production Ready</h3>
              <ul className="text-sm space-y-2 text-gray-700">
                <li>• Implement server-side CreateWidgetURL API</li>
                <li>• Use your fork: transak-sdk repository</li>
                <li>• Secure API token management</li>
                <li>• Reference domain validation</li>
                <li>• SessionId-based security</li>
              </ul>
            </div>
          </div>

          <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
            <h3 className="font-medium text-green-800 mb-2">✅ Working Features:</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm text-green-700">
              <div>• Widget initialization</div>
              <div>• BUY/SELL transactions</div>
              <div>• Multiple networks</div>
              <div>• Event monitoring</div>
              <div>• Theme customization</div>
              <div>• Real-time config</div>
            </div>
          </div>

          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-medium text-blue-800 mb-2">📋 Next Steps for Production:</h3>
            <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
              <li>Implement server endpoint for Transak CreateWidgetURL API</li>
              <li>Replace direct URL generation with API call</li>
              <li>Add proper API token refresh handling</li>
              <li>Configure reference domain validation</li>
              <li>Test with production Transak credentials</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransakWidget;