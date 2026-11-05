# 赞助用户维护

`leaderboard.json` 是公开名单，只包含昵称及可选的 HTTPS 头像，不包含金额或用户 ID。
任务依据爱发电累计赞助金额排序，默认公开所有赞助者的昵称和头像。
请确认公开展示符合爱发电规则及适用的隐私要求，并及时处理下架请求和不适宜内容。

在 GitHub 仓库 Settings → Secrets and variables → Actions 中添加以下 repository secrets：

- `AFDIAN_USER_ID`：创作者的爱发电 API User ID。
- `AFDIAN_TOKEN`：创作者的爱发电 API Token，禁止提交到仓库或分享。
- `AFDIAN_BLOCKED_USER_IDS`：可选，不公开的赞助者 user_id，以逗号或空格分隔。

创作者可在爱发电开发者设置获取 API 凭据，并从爱发电赞助者数据获取用户 ID。
凭据只应存放在 GitHub Secrets。黑名单未设置或为空时，所有赞助者都会公开；
请勿误删该 secret。要下架用户，将其 ID 加入黑名单，然后手动运行工作流。
从白名单版本升级后，旧的 `AFDIAN_APPROVED_USER_IDS` 不再生效。

工作流每小时整点尝试运行，也可在 Actions → Sync sponsors 手动运行。
计划任务可能延迟；仓库必须允许 GitHub Actions 写入，受保护分支还可能阻止推送。
首次运行前需将工作流提交到默认分支并配置必需的凭据。API 失败或凭据缺失时，
任务报错且不会覆盖现有名单。该工作流不验证客户端的赞助权益，也不隐藏广告。
