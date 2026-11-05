# tw-view

本地 X 推荐信息流阅读器。需要 Node.js 20 或更高版本。

## 配置

将 `.env.example` 复制为 `.env`，填写重新登录后获取的 `X_AUTH_TOKEN` 和 `X_CT0`。这些值是登录凭据，不要分享或提交。此前在聊天中发送的凭据建议立即注销并更换。

```powershell
Copy-Item .env.example .env
npm install
npm run dev
```

打开终端中显示的 Vite 地址。服务只监听本机。该项目读取 X 的非公开网页接口，X 可能随时更改接口、验证方式或限制访问，因而不保证长期可用。遇到接口变更时可在 `.env` 更新 `X_HOME_QUERY_ID`，并重启本地服务。

运行 `npm test` 验证解析与去重，运行 `npm run build` 构建前端。

## 赞助

通过 [爱发电](https://afdian.com/a/honshenai/) 支持项目。公开赞助排行由仓库的
`sponsors/leaderboard.json` 维护，发布前应取得赞助者同意并审核头像、昵称；暂不支持
自动核验付款或自动隐藏赞助按钮。

## 许可

本项目仅授权使用，未经许可不得修改或再分发，详见 `LICENSE`。第三方依赖遵循各自许可证。
