const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
require('dotenv').config(); // 載入 .env

// 載入 Vercel Serverless Function
const apiProxy = require('./api/proxy');

const PORT = 3000;

const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
};

const server = http.createServer(async (req, res) => {
    console.log(`${req.method} ${req.url}`);

    // 解析 URL
    const parsedUrl = url.parse(req.url, true);
    let pathname = parsedUrl.pathname;

    // 路由：API Proxy
    if (pathname === '/api/proxy') {
        // 模擬 Vercel 的 req.query
        req.query = parsedUrl.query;
        try {
            await apiProxy(req, res);
        } catch (err) {
            console.error('API Handler Error:', err);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: 'Internal Server Error' }));
        }
        return;
    }

    // 路由：靜態檔案
    if (pathname === '/') {
        pathname = '/index.html';
    }

    const filePath = path.join(__dirname, pathname);

    // 簡單的防止路徑遍歷
    if (!filePath.startsWith(__dirname)) {
        res.statusCode = 403;
        res.end('Forbidden');
        return;
    }

    fs.readFile(filePath, (err, data) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.statusCode = 404;
                res.end('Not Found');
            } else {
                res.statusCode = 500;
                res.end(`Server Error: ${err.code}`);
            }
        } else {
            const ext = path.extname(filePath);
            const contentType = MIME_TYPES[ext] || 'application/octet-stream';
            res.setHeader('Content-Type', contentType);
            res.end(data);
        }
    });
});

server.listen(PORT, () => {
    console.log(`\n🚀 Server is running at http://localhost:${PORT}`);
    console.log(`👉 Press Ctrl+C to stop\n`);
});
