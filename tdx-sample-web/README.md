# TDX API Vercel Serverless Sample

這是一個示範如何安全地在前端應用中使用 [TDX 運輸資料流通服務](https://tdx.transportdata.tw/) API 的範例專案。

## 為什麼需要這個專案？

直接在純前端 (HTML/JS) 呼叫 TDX API 會遇到兩個主要問題：
1. **CORS (跨域限制)**：瀏覽器會阻擋來自不同網域的 API 請求。
2. **安全性風險**：若在前端程式碼中放入 `Client ID` 與 `Client Secret`，會導致金鑰外洩。

## 解決方案

本專案使用 **Vercel Serverless Functions** 作為輕量級的中介層 (Proxy)：

1. **前端 (Browser)**：發送請求給自己的 Serverless Function (`/api/proxy`)。
2. **後端 (Serverless)**：
   - 安全地從環境變數讀取 ID 與 Secret。
   - 向 TDX 取得 Access Token。
   - 轉發請求至 TDX API 並回傳結果。

## 如何取得 API Key

Before you start, you need to register for a TDX account and get your API keys.

1. **註冊/登入 TDX 會員**
   - 前往 [TDX 運輸資料流通服務](https://tdx.transportdata.tw/) 官網。
   - 點擊右上角「登入/註冊」。

2. **進入會員中心**
   - 登入後，點擊「會員中心」。

3. **新增 API 金鑰**
   - 在左側選單選擇 **「資料服務」** > **「API金鑰」**。
   - 點擊 **「新增API金鑰」** 按鈕。
   - 填寫應用程式名稱 (例如: `My TDX App`) 與說明。
   - 建立後，您將會看到：
     - **Client Id**
     - **Client Secret** (請妥善保存，不要外洩)

## 如何使用

### 1. 本地開發 (Local Development)

首先，你需要安裝 [Vercel CLI](https://vercel.com/docs/cli)：

```bash
npm install -g vercel
```

下載專案並安裝依賴：

```bash
git clone https://github.com/your-repo/tdx-sample-web.git
cd tdx-sample-web
npm install
```

設定環境變數 (本地測試用)：
在專案根目錄建立 `.env` 檔案：

```env
TDX_CLIENT_ID=你的ClientId
TDX_CLIENT_SECRET=你的ClientSecret
```

啟動本地開發伺服器：

```bash
vercel dev
```

開啟瀏覽器訪問 `http://localhost:3000`。

### 2. 部署至 Vercel

1. 將專案推送到 GitHub。
2. 在 [Vercel Dashboard](https://vercel.com/dashboard) 匯入專案。
3. 在 **Settings > Environment Variables** 中加入：
   - `TDX_CLIENT_ID`
   - `TDX_CLIENT_SECRET`
4. 點擊 Deploy。

## 專案結構

- `index.html`: 前端主頁
- `app.js`: 前端邏輯 (呼叫 `/api/proxy`)
- `api/proxy.js`: Serverless Function (核心邏輯)
- `vercel.json`: Vercel 設定檔

## 授權

MIT License
