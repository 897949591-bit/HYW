# 胡耀文 · 内容营销作品集

此目录为 Cloudflare Pages＋R2 上线版本，包含全部作品的页面与资源清单。完整视频和策划原件上传 R2，网页、封面及账号图片保存在 GitHub。

## 构建

使用 Node.js 22 或更高版本，执行 `npm install`、`npm test`、`npm run build`。

## Cloudflare 配置

- Pages 项目：`hu-yaowen-portfolio`
- Git 分支：`main`
- 构建命令：`npm run build`
- 构建输出：`dist`
- R2 Bucket：`hu-yaowen-portfolio-media`
- Pages R2 绑定名称：`MEDIA`

`wrangler.jsonc` 声明 Pages 与 R2 绑定。`functions/media/[[path]].js` 仅开放作品清单中的资源，支持视频拖动进度、PDF 预览与文件下载。R2 存储桶无需直接开放公网。

## 上传完整媒体

在本机环境设置 `CLOUDFLARE_ACCOUNT_ID`、`R2_ACCESS_KEY_ID`、`R2_SECRET_ACCESS_KEY`。R2 凭据仅需上述存储桶的对象读写权限。不要把密钥写进代码或提交 Git。

`PORTFOLIO_MEDIA_SOURCE` 默认指向同级目录「胡耀文-内容营销作品集」；如移动原素材文件夹，请指定实际路径。执行 `npm run upload:media`，脚本会校验全部 22 个文件大小，并使用分片上传保留完整视频与原始策划文件。

也可在 Cloudflare 控制台上传 `assets/videos/` 和 `documents/`，保持清单中的目录结构。封面、账号图已包含于站点。

## 更新

修改 `site/index.html` 的 `CONTENT` 或页面文案，提交到 GitHub 后由 Pages 自动构建。变更媒体时同步更新 `media-manifest.json` 与 `lib/allowed-media.js`。
