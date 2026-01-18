# 🚅 高雄捷運碳排放計算器 (Kaohsiung Metro Carbon Calculator)

這是一個基於 **TDX 運輸資料流通服務 API** 開發的 Web 應用程式，旨在幫助使用者計算搭乘高雄捷運（KRTC）的碳足跡，並與其他交通工具進行比較。

專案使用原生 Node.js 開發 (`server-standalone.js`)，具備高穩定性與快速啟動的特性。

---

## ✨ 功能特色

- **碳足跡計算**：根據起訖站距離，使用官方係數 (220 gCO₂e/人公里) 精準計算。
- **減碳比較**：即時顯示相較於開車、騎機車所節省的碳排放量。
- **具象化指標**：將減碳量轉換為「大樹吸收天數」或「手機充電次數」，讓數據更有感。
- **歷史記錄 & 匯出**：自動記錄計算結果，並支援 **CSV 匯出**功能。
- **無需資料庫**：純前端運算，搭配輕量級 Backend Proxy 解決 CORS 問題。

---

## 🚀 快速開始 (Local Development)

### 1. 安裝與設定
本專案不需安裝大量 npm 套件，只需 Node.js 環境。

1. **Clone 專案**
   ```bash
   git clone https://github.com/klin1976/tdx-carbon-calculator.git
   cd tdx-carbon-calculator
   ```

2. **設定環境變數**
   複製範例設定檔並填入您的 TDX API 金鑰：
   ```bash
   cp .env.example .env
   ```
   編輯 `.env` 檔案，填入以下資訊（需至 TDX 官網申請）：
   ```env
   TDX_CLIENT_ID=您的Client_ID
   TDX_CLIENT_SECRET=您的Client_Secret
   ```

### 2. 啟動伺服器
我們提供了獨立的 Server 腳本，直接執行即可：

```bash
node server-standalone.js
```

伺服器啟動後，請在瀏覽器開啟：[http://localhost:3000](http://localhost:3000)

---

## 🔐 設定 GitHub 環境變數 (Secrets)

若您計畫在 **GitHub Codespaces** 運行或使用 **GitHub Actions**，由於安全因素 `.env` 不會被上傳，您需要手動設定 Secrets。

1. 進入 GitHub Repository 的 **Settings**。
2. 左側選單：**Secrets and variables** > **Codespaces** (或 Actions)。
3. 點擊 **New repository secret**。
4. 新增以下兩組變數：
   - Name: `TDX_CLIENT_ID`
     - Value: `(您的 Client ID)`
   - Name: `TDX_CLIENT_SECRET`
     - Value: `(您的 Client Secret)`

重啟 Codespaces 後，這些變數會自動注入到環境中。

---

## 🛠️ 技術架構

- **Frontend**: Vanilla JavaScript, HTML5, CSS3 (無大型框架)
- **Backend**: Node.js (`server-standalone.js`)
- **API**: TDX Transport Data API (v2/Rail/Metro)
- **Environment**: 自定義環境變數載入器 (Zero Dependencies)

---

## 📝 License
MIT
