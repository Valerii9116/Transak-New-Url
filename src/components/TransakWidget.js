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

  const networks = {
    ethereum: { name: 'Ethereum', tokens: ['ETH', 'USDC', 'USDT', 'DAI', 'WBTC', 'UNI', 'LINK', 'AAVE'] },
    polygon: { name: 'Polygon', tokens: ['MATIC', 'USDC', 'USDT', 'DAI', 'WETH'] },
    bsc: { name: 'BSC', tokens: ['BNB', 'USDT', 'BUSD', 'CAKE', 'ADA'] },
    arbitrum: { name: 'Arbitrum One', tokens: ['ETH', 'USDC', 'USDT', 'ARB', 'GMX'] },
    optimism: { name: 'Optimism', tokens: ['ETH', 'USDC', 'USDT', 'OP'] },
    avalanche: { name: 'Avalanche C-Chain', tokens: ['AVAX', 'USDC', 'USDT', 'JOE'] },
    solana: { name: 'Solana', tokens: ['SOL', 'USDC', 'RAY', 'SRM'] },
    base: { name: 'Base', tokens: ['ETH', 'USDC', 'cbBTC'] }
  };

  const fiatCurrencies = [
    'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'INR',
    'BRL', 'MXN', 'KRW', 'SGD', 'HKD', 'CHF', 'NOK', 'SEK'
  ];

  useEffect(() => {
    const initializeTransakWidget = () => {
      try {
        setIsLoading(true);
        setError('');

        if (transak) {
          transak.cleanup();
        }

        const transakConfig = {
          apiKey: config.apiKey,
          environment: config.environment === 'PRODUCTION' ? 'PRODUCTION' : 'STAGING',
          containerId: 'transakMount',
          hostURL: config.hostURL,
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

        if (config.walletAddress) {
          transakConfig.walletAddress = config.walletAddress;
        }
        if (config.email) {
          transakConfig.email = config.email;
        }
        if (transactionType === 'SELL') {
          transakConfig.isSell = true;
        }

        console.log('Initializing Transak with config:', transakConfig);

        const transakInstance = new Transak(transakConfig);

        Transak.on('*', (data) => {
          console.log('Transak Event:', data);
        });

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

    if (config.apiKey && config.apiKey !== 'your-staging-api-key') {
      initializeTransakWidget();
    }
  }, [config, transactionType, transak]);

  useEffect(() => {
    return () => {
      if (transak) {
        transak.cleanup();
      }
    };
  }, [transak]);

  const openWidget = () => {
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

  const handleNetworkChange = (network) => {
    setConfig(prev => ({
      ...prev,
      network: network,
      cryptoCurrencyCode: networks[network].tokens[0]
    }));
  };

  const handleConfigChange = (key, value) => {
    setConfig(prev => ({
      ...prev,
      [key]: value
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
            Official Transak SDK with new API approach
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start">
              <span className="text-red-400 text-xl">❌</span>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Configuration Error</h3>
                <p className="mt-2 text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            {/* Widget Configuration */}
            {/* API Key */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Transak API Key
              </label>
              <input
                type="text"
                value={config.apiKey}
                onChange={(e) => handleConfigChange('apiKey', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg"
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
                className="w-full p-3 border border-gray-300 rounded-lg"
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
                  className={`flex-1 py-3 px-4 rounded-lg ${transactionType === 'BUY' ? 'bg-green-500 text-white' : 'bg-gray-100'}`}
                >
                  🟢 BUY
                </button>
                <button
                  onClick={() => setTransactionType('SELL')}
                  className={`flex-1 py-3 px-4 rounded-lg ${transactionType === 'SELL' ? 'bg-red-500 text-white' : 'bg-gray-100'}`}
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
                className="w-full p-3 border border-gray-300 rounded-lg"
              >
                {Object.entries(networks).map(([key, network]) => (
                  <option key={key} value={key}>{network.name}</option>
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
                className="w-full p-3 border border-gray-300 rounded-lg"
              >
                {networks[config.network].tokens.map(token => (
                  <option key={token} value={token}>{token}</option>
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
                className="w-full p-3 border border-gray-300 rounded-lg"
              >
                {fiatCurrencies.map(currency => (
                  <option key={currency} value={currency}>{currency}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Widget Preview */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div id="transakMount" ref={widgetContainerRef} className="min-h-96 border-2 border-gray-200 rounded-lg overflow-hidden">
              {!isWidgetOpen && !isLoading && (
                <div className="flex flex-col items-center justify-center h-96 space-y-4">
                  <div className="text-gray-400 text-6xl">🚀</div>
                  <h3 className="text-lg font-medium text-gray-700">Ready to Launch</h3>
                  <p className="text-sm text-gray-500 text-center">Click "Open Transak Widget" to start crypto trading.</p>
                </div>
              )}
              {isLoading && (
                <div className="flex flex-col items-center justify-center h-96 space-y-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                  <p className="text-gray-600">Initializing Transak Widget...</p>
                </div>
              )}
            </div>

            <div className="mt-4 flex space-x-2">
              <button onClick={openWidget} disabled={isLoading || isWidgetOpen} className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-3 px-4 rounded-lg">
                {isLoading ? 'Initializing...' : isWidgetOpen ? 'Widget Open' : 'Open Transak Widget'}
              </button>
              {isWidgetOpen && (
                <button onClick={closeWidget} className="px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg">
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransakWidget;
