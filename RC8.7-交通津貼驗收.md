# MU Safety Assistant RC8.7 交通津貼與報銷中心

## 安裝及操作

1. 解壓縮驗收包，在 Chrome 開啟「01_RC8.7_一鍵安裝.html」，將安裝連結拖到書籤列。用獨立 Chrome 測試設定檔並保留正式書籤。
2. 開啟工安 Google Form，點 RC8.7 書籤，再從「交通津貼與報銷中心」選月份並下載當月工作日誌 JSON。這個動作只讀取工作日誌。
3. 在 Chrome 開啟「03_RC8.7_離線報銷中心.html」，匯入工作日誌 JSON、遠通 ETC PDF 與公司 XLSX 範本，輸入各廠區的核定往返公里數。
4. 產生試算，逐日核對。異常可展開確認或修正，填理由後套用。匯出的 XLSX 另有「核對明細」，包含入表狀態、原始數值、修正值及來源。
5. 使用 Excel 檢查油資、通行費、合計及主管核簽區。請依公司流程附憑證及核簽。

離線頁與 Google Form 的資料儲存分開，透過選定月份的 JSON 交接。PDF、Excel、核對項目只在分頁處理。若瀏覽器允許本機頁面儲存，核定里程設定會記在該離線頁。人工核對結果隨核對明細匯出，重新載入來源後請重新核對。

## 計算口徑

- 同日只產生一列。油資以核定往返公里數乘 6。多筆或跨廠、非駐廠、資料缺漏及地點不一致的日期先列待確認。
- ETC 以遠通 PDF 同日里程加總後，以每公里 1 元四捨五入至整數。實際扣款分開保存。來源不完整或無同日 ETC 紀錄時，該 ETC 不入表。
- 使用 10 月範本的油資、通行費兩張表，保留額外的原表、公式、樣式與核簽位置。額外原表的舊明細會清空。差異與非原表欄位寫入「核對明細」。
- 表單原版型每張有 17 個明細列。超過容量時匯出會提示錯誤，可逐日排除後分批產出，避免擠壓核簽區。
- 遠通匯入支援這份有文字層且具頁碼的明細格式。掃描、缺頁、未辨識格式須重新取得可讀 PDF。換版時需驗證。
- 範本原有員工資料、申請表頭與附件資產依原檔保留，正式送件前請自行核對。驗收包未附實際工作日誌、PDF 或報銷表。

## 開發與測試

在 repo 根目錄以 Node.js 22 或相容版本執行。離線頁將 PDF.js 與 JSZip 打包到單一 HTML。套件只用於建置與測試，Chrome 執行時無需安裝軟體。

```sh
npm install --no-save --no-package-lock jszip@3.10.1 pdfjs-dist@5.6.205
node scripts/build-rc8.7-bookmarklet.js
node scripts/build-rc8.7-center.js
node tests/rc8.7-transport-check.js
node tests/rc8.6-pptx-report-check.js
python3 tests/rc8.6-pptx-package-check.py
```

實際 10 月來源測試可用 `scripts/verify-rc8.7-october.js` 執行。請傳入 XLSX、PDF、日誌 JSON、核定里程 JSON（陣列，每列含 client、site、km）、輸出 XLSX 及核對 JSON 的路徑。實際資料及測試輸出請留在 repo 外。
