# RC8.6 自動化測試報告

| 測試 | 結果 | 實際結果 |
|---|---|---|
| A 全新環境 | PASS | 內建客戶、廠區、案號清單為空；首次啟動會顯示設定引導。 |
| B 首次設定與一般填表 | PASS | 姓名與員工編號完成格式檢查並寫入原 `muSafety.v150`；一般填表流程標記完整。 |
| C 自行新增／修改 | PASS | 設定中心既有客戶、廠區、案號及案號備註新增／修改機制保留。 |
| D RC8.5 升級 | PASS | 偵測到 `muSafety.v150` 或 `muSafety.v140` 時略過首次引導；設定與 Records key、內容均不改寫。 |
| E 個人資料隔離 | PASS | RC8.6 source 不含舊使用者客戶、廠區及三組案號；新環境不會取得舊資料。 |
| F RC8.5 備份還原 | PASS | JSON 備份、合併、重複略過、衝突保護與失敗回復測試通過。 |
| G RC8.4 文書與 Excel | PASS | `documentWork`、跨日彙整、舊 Record 相容及雙工作表 OOXML `.xlsx` 通過。 |
| H RC8.1～RC8.3 核心功能 | PASS | 統計、搜尋篩選、獨立報表中心、案號備註與純案號填表測試通過。 |
| I Google Form 安全流程 | PASS | 無 `submit()`／`requestSubmit()`，完成填表仍呼叫底部捲動。 |
| J RC8.6 封裝一致 | PASS | source、Bookmarklet、一鍵安裝檔內容一致。 |

所有測試均使用記憶體 storage、靜態程式檢查或隔離測試陣列，未存取使用者正式 Records。

## 歷史封裝測試處理

- `tests/rc7-static-check.js`：功能測試 PASS；舊 Bookmarklet／安裝檔與 source 不一致，輸出已知問題警告。
- `tests/rc8.1-statistics-check.js`：統計功能測試 PASS；舊 Bookmarklet／安裝檔與 source 不一致，輸出已知問題警告。
- `tests/rc8.2-record-filter-check.js`：搜尋篩選功能測試 PASS；舊 Bookmarklet／安裝檔與 source 不一致，輸出已知問題警告。

處理方式是新增共用歷史封裝檢查器，保留差異可見性但不讓舊封裝 parity 阻斷功能回歸；未修改任何 RC7、RC8.1、RC8.2 舊版 Bookmarklet 或一鍵安裝檔。

## 已知限制

localStorage 以瀏覽器設定檔為界。不同人員使用不同電腦或獨立瀏覽器設定檔時資料各自保存；共用同一設定檔時資料會共用，RC8.6 不提供帳號隔離或雲端同步。
