# DAWNMX — Astro + AstroPaper

白底、文字为主的个人博客。基于 [AstroPaper](https://github.com/satnaing/astro-paper) 6.1.0，保留原站七篇文章、日期、标签、图片和文章地址，并加入《焦虑与和解》及四张配图。

Notion 的“问答提炼”整理成数字验证问答系列，包含 8 篇文章、22 个专题、205 条问答。系列入口是 `/series/digital-verification/`，每篇带可折叠目录，代码和公式分别使用语法高亮与 KaTeX 渲染。

## 本地使用

要求 Node.js 22.12 或更新版本。本项目使用 npm 和 `package-lock.json`。

```bash
npm ci
npm run dev
```

新建一篇 Markdown 草稿：

```bash
npm run new -- '文章标题' english-slug
```

文章放在 `src/content/posts/`，配图放在 `public/images/`。写好后把文章信息中的 `draft` 改为 `false`。

构建和预览完整的发布版本（包含搜索索引）：

```bash
npm run build
npm run verify
npm run preview
```

## 配置与发布

- `astro-paper.config.ts`：站名、作者、描述、功能和 GitHub 链接。
- `src/styles/theme.css`：颜色、字体。
- `src/styles/global.css`：中文阅读排版。
- `src/i18n/lang/zh-CN.ts`：中文界面文案。
- `src/legacy-routes.json`：旧文章地址映射。
- `recovery-manifest.json`：旧文、新文章和图片的迁移校验。
- `notion-series-manifest.json`：问答系列的标题、问题清单及代码校验。

网站继续发布到 https://dawnmxv.github.io/ 。`astro-source` 分支备份源码，`main` 分支保存 `dist/` 中生成的网页。
可以让 Codex 使用已经连接的 GitHub 发布，也可以配置本机 GitHub 认证后执行：

```bash
npm run publish -- --dry-run
npm run publish
```

本地发布脚本先构建、校验并备份源码，再以普通 Git 提交更新网页；不会强制覆盖远端历史。
需要 GitHub Pages 的发布来源仍指向 `main` 分支根目录。

## 迁移和图片

旧 Hexo 项目仍在本机相邻目录 `../dawnmxv-blog/`，原始网页备份在 `../dawnmxv-blog-original/`。
旧文章用根目录的静态路由继续提供正文，不经过跳转；旧归档子目录和分类页提供兼容跳转。
新文章地址是 `/posts/anxiety-and-reconciliation/`，发布日期设为 2026-10-08，正文与提供的 Markdown 一致。
四张拼贴插画转换成 960 像素宽的 WebP，保留完整构图；原 PNG 在用户原来的插画目录中保留。

校验针对本次迁移和新增文章。如以后有意改写旧文或新文章正文，请同步审核并更新校验基线。

问答系列的正文位于 `src/content/posts/dv-*.md`，可以直接编辑。`tools/import-notion-series.mjs` 用于从本地 `.notion-cache/` 重新生成本次分组；缓存属于导入材料，已排除在 Git 和网站发布内容之外。重新导入会覆盖系列文章，手工修改后应先保存副本。

## 回退

本次上线以原 `main` 提交为父提交，原网页可通过 `git revert` 恢复。原始基线：`53ed716f252d248b1b0fc2fd32028360fd53c13a`。

## 授权

AstroPaper 使用 MIT 许可证，原许可保留在 `LICENSE` 中。文章和插画属于博主。
