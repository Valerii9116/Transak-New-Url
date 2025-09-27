#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Setting up Azure Functions for Transak Widget...\n');

// Check if api directory exists
if (!fs.existsSync('api')) {
  console.log('❌ api/ directory not found');
  console.log('Please run this script from the project root directory');
  process.exit(1);
}

// Check Azure Functions Core Tools
const { execSync } = require('child_process');
try {
  execSync('func --version', { stdio: 'ignore' });
  console.log('✅ Azure Functions Core Tools found');
} catch (error) {
  console.log('❌ Azure Functions Core Tools not found');
  console.log('Install with: npm install -g azure-functions-core-tools@4');
  process.exit(1);
}

// Initialize Azure Functions if not already done
const hostJsonPath = path.join('api', 'host.json');
if (!fs.existsSync(hostJsonPath)) {
  console.log('🚀 Initializing Azure Functions...');
  try {
    process.chdir('api');
    execSync('func init --javascript --force', { stdio: 'inherit' });
    process.chdir('..');
    console.log('✅ Azure Functions initialized');
  } catch (error) {
    console.log('❌ Failed to initialize Azure Functions');
    process.exit(1);
  }
}

// Check function directories
const requiredFunctions = [
  'api/transak/auth',
  'api/transak/create-widget-url'
];

let allFunctionsExist = true;
for (const funcDir of requiredFunctions) {
  const functionJsonPath = path.join(funcDir, 'function.json');
  const indexJsPath = path.join(funcDir, 'index.js');
  
  if (!fs.existsSync(functionJsonPath) || !fs.existsSync(indexJsPath)) {
    console.log(`❌ Missing files in ${funcDir}`);
    allFunctionsExist = false;
  }
}

if (allFunctionsExist) {
  console.log('✅ All function files exist');
} else {
  console.log('❌ Some function files are missing');
  console.log('Please copy all artifacts files to their correct locations');
}

// Check local.settings.json
const localSettingsPath = path.join('api', 'local.settings.json');
if (fs.existsSync(localSettingsPath)) {
  try {
    const localSettings = JSON.parse(fs.readFileSync(localSettingsPath, 'utf8'));
    const values = localSettings.Values || {};
    
    if (values.TRANSAK_API_KEY && values.TRANSAK_API_SECRET) {
      console.log('✅ Transak credentials configured');
    } else {
      console.log('⚠️  Transak credentials not configured');
      console.log('Please add TRANSAK_API_KEY and TRANSAK_API_SECRET to api/local.settings.json');
    }
  } catch (error) {
    console.log('❌ Invalid local.settings.json format');
  }
} else {
  console.log('❌ local.settings.json not found');
}

console.log('\n🎯 Next Steps:');
console.log('1. Add your Transak API credentials to api/local.settings.json');
console.log('2. Run: cd api && func start --port 7071');
console.log('3. Test the API endpoints in your React app');
console.log('\n✨ Setup check complete!');