# 全校教師課表管理系統

網頁版教師排班管理系統，支持多人協作。

## 功能

- 教師管理（姓名、職務、科目、學部）
- 職務管理（含拋節節數設定）
- 科目管理
- 班級管理（5 個學部，48 個班級）
- 數據報告與統計
- CSV 匯入/匯出
- 多人實時協作（WebSocket）

## 部署到 Render

1. 註冊 [Render.com](https://render.com)（可用 GitHub 登錄）
2. 點擊 "New" → "Web Service"
3. 連接此 GitHub 倉庫
4. Render 會自動檢測配置並部署

## 本地運行

```bash
cd server
npm install
node server.js
```

然後訪問 http://localhost:3001
