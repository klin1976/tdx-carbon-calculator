const axios = require('axios');
const qs = require('qs');

// 全域變數快取 Token (在 Lambda 容器重用時有效)
let cachedToken = null;
let tokenExpiry = 0;

async function getAccessToken() {
  const currentTime = Date.now();
  
  // 如果 Token 存在且未過期 (預留 60 秒緩衝)，直接回傳
  if (cachedToken && currentTime < tokenExpiry - 60000) {
    return cachedToken;
  }

  const clientId = process.env.TDX_CLIENT_ID;
  const clientSecret = process.env.TDX_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Server misconfiguration: TDX_CLIENT_ID or TDX_CLIENT_SECRET missing');
  }

  const authUrl = 'https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token';
  
  try {
    const response = await axios.post(authUrl, qs.stringify({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret
    }), {
      headers: {
        'content-type': 'application/x-www-form-urlencoded'
      }
    });

    cachedToken = response.data.access_token;
    // expires_in 是秒數，轉為毫秒並計算過期時間
    tokenExpiry = currentTime + (response.data.expires_in * 1000);
    
    return cachedToken;
  } catch (error) {
    console.error('Failed to get access token:', error.response ? error.response.data : error.message);
    throw new Error('Failed to acthenticate with TDX service');
  }
}

module.exports = async (req, res) => {
  // 處理 CORS (允許所有來源，或特定來源)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // 處理 Preflight Request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { endpoint } = req.query;

  if (!endpoint) {
    return res.status(400).json({ error: 'Missing endpoint parameter' });
  }

  // 簡單驗證 endpoint 格式，避免被濫用存取非 TDX 網址
  // 允許 /api/basic/... 或 /api/advance/... 開頭，或直接 /v2/... /v3/...
  // 這裡假設前端傳來的是 path，如 /v2/Rail/TRA/LiveTrainDelay
  
  try {
    const token = await getAccessToken();
    
    // 組合完整 URL
    // 如果 endpoint 開頭沒有 /，補上
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const targetUrl = `https://tdx.transportdata.tw/api/basic${path}`;

    // 轉發請求
    // 這裡只支援 GET，若需支援其他方法需修改
    const apiResponse = await axios.get(targetUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept-Encoding': 'br,gzip' // 建議的 header
      },
      params: req.query // 轉發其他 query parameters (例如 $top, $format)
    });

    res.status(200).json(apiResponse.data);
  } catch (error) {
    console.error('API Proxy Error:', error.response ? error.response.data : error.message);
    
    if (error.response) {
      // 轉發上游錯誤狀態
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
};
