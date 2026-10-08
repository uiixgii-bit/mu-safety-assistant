# MU Safety Assistant V1.50 RC8.5 試作版

- 設定中心新增「資料備份／還原」，未增加首頁入口。
- 完整 JSON 備份採 MU 專用 key 白名單：`muSafety.v150.rc7Records`、`muSafety.v150`、`muSafety.v150.rc4History`、`muSafety.v140`。
- 合併還原預設保留目前 Records 與工作預設；同 id／可靠識別資料相同者略過，內容不同者列為衝突。
- 無 id 舊資料優先使用日期、案號、員工 ID、建立時間識別；缺少建立時間且無法可靠辨識者，不直接覆蓋或刪除，以衝突處理。
- 完整覆蓋需二次確認，並在覆蓋前啟動目前資料的安全備份下載。
- 還原先在記憶體完成驗證與計算，寫入前保存各 MU key 原始值；部分寫入失敗時逐鍵回復，不清空整個 localStorage。
- localStorage 本身不提供真正交易機制；若瀏覽器在寫入與回復階段同時發生不可恢復故障，程式會明確列出無法自動回復的 key，不宣稱絕對零風險。
- 保留 RC8.1～RC8.4 正式功能、既有 Records schema 與 key；不自動提交 Google Form。
