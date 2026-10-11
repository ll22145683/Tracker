# 追蹤本

記錄每個人的開始日期、週期、階段（預備 → 第1～3階段 → 完成）和筆記。
有甘特圖總覽和每週人數統計，手機和平板用同一個 Google 帳號登入就會同步，也能加到主畫面當 App 用。

- 網頁：放在 GitHub Pages（免費）
- 資料：存在你自己的 Firebase 專案（Google 提供，個人使用在免費額度內）
- 登入：Google 帳號，每個帳號只看得到自己的資料

## 一、建立 Firebase 專案（約 15 分鐘，只要做一次）

1. 打開 <https://console.firebase.google.com>，用你的 Google 帳號登入，按「建立專案」。
   名稱隨意（例如 `tracker`），Google Analytics 可以關掉。
2. **開啟 Google 登入**：左邊「建構 → Authentication」→「開始使用」→「登入方式」→ 選「Google」→ 啟用 → 選一個支援電子郵件 → 儲存。
3. **加入授權網域**：同一頁的「設定」分頁 →「授權網域」→「新增網域」，填入
   `ll22145683.github.io`
4. **建立資料庫**：左邊「建構 → Firestore Database」→「建立資料庫」→ 位置選 `asia-east1 (台灣)` → 選「以正式版模式啟動」→ 建立。
5. **設定資料權限**：Firestore 的「規則」分頁，把內容整個換成 [`firestore.rules`](firestore.rules) 的內容 → 發布。
6. **取得網頁設定**：左上齒輪「專案設定」→「一般」→ 最下面「你的應用程式」→ 按 `</>`（網頁）圖示 → 應用程式暱稱隨意 → 註冊。
   畫面上會出現一段 `const firebaseConfig = { apiKey: ..., authDomain: ..., ... }`，把這段複製下來，
   填進 [`firebase-config.js`](firebase-config.js)（或直接貼給 Claude 幫你填）。

> `firebaseConfig` 裡的值不是密碼，放在公開的 GitHub 上沒問題。真正保護資料的是第 5 步的規則。

## 二、開啟 GitHub Pages

儲存庫的「Settings → Pages」→ Source 選「Deploy from a branch」→ Branch 選 `main`、資料夾 `/ (root)` → Save。
一兩分鐘後網址就會是 `https://ll22145683.github.io/<儲存庫名稱>/`。

## 三、裝到手機和平板

用 Chrome 打開上面的網址 → 用 Google 帳號登入 → 右上角「⋮」→「安裝應用程式」（或「加到主畫面」）。
Samsung Internet：下方「≡」→「新增頁面至」→「主畫面」。平板也做一次，登入同一個 Google 帳號就會同步。

## 備份

右上角的人像按鈕 →「匯出備份」會下載一個 `.json` 檔；「匯入備份」可以把檔案裡的紀錄放回來。

## 檔案

| 檔案 | 用途 |
|---|---|
| `index.html` | 整個 App 的畫面與邏輯 |
| `app-firebase.js` | Google 登入與 Firestore 資料存取 |
| `firebase-config.js` | 你的 Firebase 專案設定 |
| `firestore.rules` | 資料權限規則（貼到 Firebase 主控台） |
| `sw.js`、`manifest.webmanifest`、`icon-*.png` | 讓它可以安裝成 App、沒網路也能打開 |
