# RC8.6 七頁季報 PowerPoint 匯出（待發布）

報表輸出中心選擇年份、季度，按「匯出季報 .pptx」。瀏覽器內產生，不載入 CDN、不安裝軟體、不上傳資料、不改寫 Records。

七頁沿用 V6.3 結構（原 V6.2 六頁加管理成果摘要）：封面、安全總覽、客戶／廠區投入、現場投入、安全管理成果、文書／專案成果、管理成果摘要。文字、統計卡及橫條可編輯；橫條為原生形狀，非帶試算表的 Office Chart。

共用 Excel／JSON 的去重、不同日期、同場域最高申報值及明確改善狀態口徑。完整性未確認標示部分資料；缺值不計算相關比率。夜間計日，不推算時數。工作描述不等於正式文件份數。

固定七頁：廠區顯示前 5 項、文書 4 項、少量缺失案例 3 件、分類 8 項；長內容標示省略，完整資料保留在備忘稿與 Excel。備忘稿包含原始紀錄，分享前須確認可分享範圍。

測試：`node tests/rc8.6-pptx-report-check.js`、`python3 tests/rc8.6-pptx-package-check.py`、`node tests/rc8.6-browser-check.js`（隔離 Chromium 虛構資料）。涵蓋重複、跨日文書、不同廠區、僅第二缺失、空季、長內容、OOXML、實際下載、儲存不變與零網路請求。

Microsoft PowerPoint 實機開啟仍需最終驗收。僅修改 release/rc8.6，未修改 main、正式書籤或正式資料。

文書按原始名稱合併後，再依關鍵字分類與排序：防護計畫／送審、會議協調、一般行政內業。混合描述保留兼類，以最高優先類別計分類數。只分類工作描述，不推定已送審、核准或完成。管理摘要每項在 JSON／備忘稿中保留 evidence 來源。JSON 原有 schema v2、period、metrics、limitations 不變，presentation 加入 V6.3 與 slideCount=7。
