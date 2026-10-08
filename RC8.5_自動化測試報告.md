# RC8.5 自動化測試報告

| 測試 | 結果 | 實際結果 |
|---|---|---|
| A 備份重解析 | PASS | Records、設定、填表歷程與舊版遷移設定可重解析且內容一致；無關 key 未匯出。 |
| B 空白環境完整還原 | PASS | 四個白名單 key 依備份內容還原，Records 與設定一致。 |
| C 同備份連續合併 | PASS | 第一次新增 1 筆；第二次新增 0、略過 1，未重複。 |
| D 10／15 筆混合 | PASS | 8 筆相同資料略過、7 筆新增，結果共 17 筆。 |
| E 相同識別、內容不同 | PASS | 回報衝突 1 筆，保留目前版本。 |
| F 完整覆蓋前取消 | PASS | 未呼叫還原，儲存快照逐位元一致；UI 具兩次確認。 |
| G 無效與異常備份 | PASS | 無效 JSON、錯誤格式、Records 型別異常均拒絕，原資料不變。 |
| H 部分寫入失敗 | PASS | 模擬第二個 key 寫入失敗，所有已動 key 回復至原始快照。 |
| I RC8.4 文書與 XLSX | PASS | `documentWork`、跨日重要文書彙整、兩工作表 OOXML `.xlsx` 與舊 Record 空白欄位均通過。 |
| J RC8.1～RC8.3 核心回歸 | PASS | 統計中心、搜尋篩選、獨立報表中心、案號備註、底部捲動、無自動提交與 Trusted Types 禁用 API 檢查通過。 |

所有 RC8.5 測試使用記憶體模擬 localStorage 或測試陣列，未接觸使用者正式 Records。

補充：倉庫既有 `rc7-static-check.js`、`rc8.1-statistics-check.js`、`rc8.2-record-filter-check.js` 仍會因 main 上各舊版本的 Bookmarklet 與 source 早已不一致而失敗；這是 RC8.5 開發前即存在的歷史封裝 parity 問題。本次未修改舊版本交付檔，RC8.5 自身的 source／Bookmarklet／一鍵安裝 parity 已通過。
