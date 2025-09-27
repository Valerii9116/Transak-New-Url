// api/transak/refresh-token.js
// Refreshes expired access token
const { getTransakBaseUrl, makeHttpRequest } = require('../utils');

module.exports = async function (context, req) {
    // CORS is handled by host.json, no need for manual headers
    if (req.method === 'OPTIONS') {
        context.res = { status: 200 };
        return;
    }

    if (req.method !== 'POST') {
        context.res = { status: 405, body: { error: 'Method not allowed' } };
        return;
    }

    try {
        const { refresh_token } = req.body;

        if (!refresh_token) {
            context.res = { status: 400, body: { error: 'refresh_token is required' } };
            return;
        }

        const environment = process.env.TRANSAK_ENVIRONMENT || 'STAGING';
        const baseUrl = getTransakBaseUrl(environment);

        const refreshData = {
            api_key: process.env.TRANSAK_API_KEY,
            refresh_token: refresh_token
        };

        const response = await makeHttpRequest(
            `${baseUrl}/api/v1/auth/refresh-token`,
            'POST',
            refreshData
        );

        if (response.access_token) {
            context.res = {
                status: 200,
                body: {
                    access_token: response.access_token,
                    expires_in: response.expires_in,
                    refresh_token: response.refresh_token
                }
            };
        } else {
            throw new Error('Invalid response from Transak API on token refresh');
        }

    } catch (error) {
        context.log('Token refresh error:', error.message);
        context.res = {
            status: 500,
            body: {
                error: 'Token refresh failed',
                message: error.message
            }
        };
    }
};