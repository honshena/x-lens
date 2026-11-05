# 赞助用户维护

`leaderboard.json` 是公开名单，只包含昵称及可选的 HTTPS 头像，不包含金额或用户 ID。
任务依据爱发电累计赞助金额排序。添加前须取得赞助者同意并检查昵称和头像；
用户后续修改昵称或头像也需要重新审核，不适宜的内容应及时移除。

在 GitHub 仓库 Settings → Secrets and variables → Actions 中添加以下 repository secrets：

- `AFDIAN_USER_ID`：创作者的爱发电 API User ID。
- `AFDIAN_TOKEN`：创作者的爱发电 API Token，禁止提交到仓库或分享。
- `AFDIAN_APPROVED_USER_IDS`：已同意公开且审核通过的赞助者 user_id，以逗号或空格分隔。

创作者可在爱发电开发者设置获取 API 凭据，并从爱发电赞助者数据获取用户 ID。
凭据只应存放在 GitHub Secrets。赞助者名单必须先经人工审核，未批准的用户不会公开。
要下架用户，先从该 secret 中删除 ID，然后手动运行工作流；若要下架最后一位用户，
还需手动清空 `leaderboard.json`，因为空白审核名单会使任务停止以保护现有数据。

工作流每小时整点尝试运行，也可在 Actions → Sync sponsors 手动运行。
计划任务可能延迟；仓库必须允许 GitHub Actions 写入，受保护分支还可能阻止推送。
首次运行前需将工作流提交到默认分支并配置上述 secrets。API 失败或配置缺失时，
任务报错且不会覆盖现有名单。该工作流不验证客户端的赞助权益，也不隐藏广告。
