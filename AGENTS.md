# tdx-carbon-calculator 專案規則

## 專案定位

這是高雄捷運碳排放計算器，使用 TDX 運輸資料流通服務 API，前端為原生 HTML/CSS/JavaScript，後端以 Node.js proxy 處理 TDX API 與 CORS。

主要應用程式位於 `tdx-sample-web/`。

## 常用入口

- 本機啟動：在 `tdx-sample-web/` 執行 `node server-standalone.js`
- 本機網址：http://localhost:3000
- Vercel 設定：`tdx-sample-web/vercel.json`
- Serverless API：`tdx-sample-web/api/`
- 獨立本機伺服器：`tdx-sample-web/server-standalone.js`

## 環境變數與安全

- 需要 `TDX_CLIENT_ID` 與 `TDX_CLIENT_SECRET`。
- 真實憑證只能放在本機 `.env` 或部署平台環境變數。
- 不要把 API key、token、密碼或私密憑證寫入 README、AGENTS、範例檔、Obsidian 筆記或 Git commit。
- `.env.example` 只能放 placeholder。

## Git 與同步

- 這個 repo 位於 Google Drive 同步資料夾時，Git 應設定 `windows.appendAtomically=false`。
- 不要自動 pull、commit、push；先回報狀態與風險。
- 不要提交 `.codex/`、`.claude/`、`.agent/`、`.env`、`.vercel/`、`node_modules/`、build output 或 log。
- 保留既有使用者變更；未確認前不要覆蓋或還原。

## Obsidian Cockpit

- Vault-relative cockpit note：`2026Codex/tdx-carbon-calculator.md`
- Obsidian vault 位置依全域規則與 vault 根目錄 `AGENTS.md` 判斷；不要在跨設備筆記中寫死磁碟代號。

## Firebase

目前未使用 Firebase。若之後加入 Firebase，預設採 authenticated-only 規則，除非使用者明確要求公開測試設定。