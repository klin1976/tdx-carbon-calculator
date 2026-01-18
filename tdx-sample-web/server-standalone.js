const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');
const querystring = require('querystring');

// ==========================================
// 環境變數載入器 (取代 dotenv)
// ==========================================
function loadEnv() {
    const envPath = path.join(__dirname, '.env');
    if (fs.existsSync(envPath)) {
        console.log('📄 Loading .env file...');
        const content = fs.readFileSync(envPath, 'utf8');
        content.split('\n').forEach(line => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                const key = match[1].trim();
                const value = match[2].trim().replace(/^['"]|['"]$/g, ''); // 移除可能的引號
                if (!process.env[key]) {
                    process.env[key] = value;
                }
            }
        });
    } else {
        console.warn('⚠️ .env file not found! Environment variables must be set manually.');
    }
}

// 載入環境變數
loadEnv();

// ==========================================
// 設定
// ==========================================
const CONFIG = {
    TDX_CLIENT_ID: process.env.TDX_CLIENT_ID,
    TDX_CLIENT_SECRET: process.env.TDX_CLIENT_SECRET,
    PORT: process.env.PORT || 3000
};

if (!CONFIG.TDX_CLIENT_ID || !CONFIG.TDX_CLIENT_SECRET) {
    console.error('❌ Error: TDX_CLIENT_ID or TDX_CLIENT_SECRET is missing.');
    console.error('👉 Please create a .env file with your credentials.');
    process.exit(1);
}

// ==========================================
// Token 管理
// ==========================================
let cachedToken = null;
let tokenExpiry = 0;

function getAccessToken() {
    return new Promise((resolve, reject) => {
        const currentTime = Date.now();
        if (cachedToken && currentTime < tokenExpiry - 60000) {
            return resolve(cachedToken);
        }

        const authData = querystring.stringify({
            grant_type: 'client_credentials',
            client_id: CONFIG.TDX_CLIENT_ID,
            client_secret: CONFIG.TDX_CLIENT_SECRET
        });

        const req = https.request('https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(authData)
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.access_token) {
                        cachedToken = json.access_token;
                        tokenExpiry = currentTime + (json.expires_in * 1000);
                        resolve(cachedToken);
                    } else {
                        reject(new Error('No access_token in response'));
                    }
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', reject);
        req.write(authData);
        req.end();
    });
}

// ==========================================
// API Proxy
// ==========================================
async function handleProxy(req, res, query) {
    const endpoint = query.endpoint;
    if (!endpoint) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing endpoint' }));
        return;
    }

    try {
        const token = await getAccessToken();

        // 移除 endpoint 參數，將剩餘參數保留
        delete query.endpoint;
        const queryString = querystring.stringify(query);

        const apiPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        const targetUrl = `https://tdx.transportdata.tw/api/basic${apiPath}${queryString ? '?' + queryString : ''}`;

        console.log(`Proxying to: ${targetUrl}`);

        https.get(targetUrl, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept-Encoding': 'identity' // 簡化處理，不使用 gzip
            }
        }, (apiRes) => {
            res.writeHead(apiRes.statusCode, { 'Content-Type': 'application/json' });
            apiRes.pipe(res);
        }).on('error', (e) => {
            console.error('API Request Error:', e);
            res.writeHead(500);
            res.end(JSON.stringify({ error: 'Upstream API Error', details: e.message }));
        });

    } catch (error) {
        console.error('Token Error:', error);
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Authentication Failed' }));
    }
}

// ==========================================
// 主伺服器
// ==========================================
const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg'
};

const server = http.createServer((req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    const parsedUrl = url.parse(req.url, true);
    let pathname = parsedUrl.pathname;

    console.log(`${req.method} ${req.url}`);

    if (pathname === '/api/proxy') {
        handleProxy(req, res, parsedUrl.query);
        return;
    }

    if (pathname === '/') pathname = '/index.html';

    // 靜態檔案
    const filePath = path.join(__dirname, pathname);

    // 安全檢查
    if (!filePath.startsWith(__dirname)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    fs.readFile(filePath, (err, data) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404);
                res.end('Not Found');
            } else {
                res.writeHead(500);
                res.end('Server Error');
            }
        } else {
            const ext = path.extname(filePath);
            res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
            res.end(data);
        }
    });
});

server.listen(CONFIG.PORT, () => {
    console.log(`\n=================================================`);
    console.log(`  🚀 Server running at http://localhost:${CONFIG.PORT}`);
    console.log(`  ✨ Standalone Mode (Secure Env Loading)`);
    console.log(`=================================================\n`);

    if (fs.existsSync(path.join(__dirname, '.env'))) {
        console.log('✅ .env file loaded successfully.');
    } else {
        console.warn('⚠️ No .env file found. Make sure environment variables are set.');
    }
});
