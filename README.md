# AI 剧本杀 Web 平台

多人联机的 AI 剧本杀平台，包含 Node.js + Express + Socket.IO 后端以及 Vue3 + Vite 前端。主持人创建房间、生成剧本并分配角色，玩家通过手机或电脑加入，AI 主持人使用 Kimi/Moonshot API 引导流程。

## 快速开始

### 后端
```
cd server
npm install
# 配置 .env，写入 KIMI_API_KEY=你的密钥
npm run dev
```

接口：
- `GET http://localhost:3000/health` 返回 `{ ok: true }`
- Socket.IO 服务同端口。

### 前端
```
cd web
npm install
npm run dev
```

开发时默认连接 `http://localhost:3000`，构建后前端会被 Express 托管：
```
npm run build
```
然后在 server 中 `npm run start` 即可访问网页。

## 功能
- 主持人创建房间、生成剧本（Kimi/Moonshot）
- 玩家加入房间并获得自己的角色卡
- 阶段切换（准备/线索/辩论/投票）
- 公共聊天 + AI 主持人发言
