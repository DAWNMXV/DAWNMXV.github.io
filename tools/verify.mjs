import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { resolve, join, relative } from "node:path";
import assert from "node:assert/strict";
import { load } from "cheerio";
import { listPostFiles } from "./post-files.mjs";

const root = resolve(import.meta.dirname, "..");
const output = join(root, "dist");
const site = new URL("https://dawnmxv.github.io/");
assert(existsSync(join(output, "index.html")), "请先运行 npm run build。");
assert(existsSync(join(output, "pagefind/pagefind.js")), "搜索索引缺失。");

const articlePages = [];
let localLinks = 0;
const files = readdirSync(output, {
  recursive: true,
  withFileTypes: true,
}).filter(file => file.isFile() && file.name.endsWith(".html"));
for (const file of files) {
  const path = join(file.parentPath, file.name);
  const $ = load(readFileSync(path, "utf8"));
  const pageUrl = new URL(
    relative(output, path).replace(/index\.html$/u, ""),
    site
  );
  if ($("#article").length) {
    assert.equal(
      $("main h1").length,
      1,
      `文章应只有一个主标题：${pageUrl.pathname}`
    );
    assert.equal(
      $("#article .katex-error").length,
      0,
      `公式渲染失败：${pageUrl.pathname}`
    );
    assert(
      $("#article").text().trim() || $("#article img").length,
      `文章正文为空：${pageUrl.pathname}`
    );
    articlePages.push({
      title: $("h1").text().trim(),
      date: $('meta[property="article:published_time"]').attr("content"),
      path: pageUrl.pathname,
    });
  }
  for (const node of $(
    "a[href], img[src], script[src], link[rel='stylesheet'], link[rel='icon'], link[rel='alternate'], meta[property='og:image']"
  ).toArray()) {
    const target =
      $(node).attr("href") ?? $(node).attr("src") ?? $(node).attr("content");
    if (!target || /^(?:mailto:|tel:|data:|javascript:)/iu.test(target))
      continue;
    let url;
    try {
      url = new URL(target, pageUrl);
    } catch {
      throw new Error(`无效地址：${target}`);
    }
    if (url.origin !== site.origin) continue;
    const localPath = decodeURIComponent(url.pathname).replace(/^\//u, "");
    const candidates = [
      join(output, localPath),
      join(output, localPath, "index.html"),
    ];
    const destination = candidates.find(
      candidate => existsSync(candidate) && statSync(candidate).isFile()
    );
    assert(destination, `链接或图片缺失：${pageUrl.pathname} → ${target}`);
    if (url.hash && destination.endsWith(".html")) {
      const document =
        destination === path ? $ : load(readFileSync(destination, "utf8"));
      const id = decodeURIComponent(url.hash.slice(1));
      assert(
        document("[id]")
          .toArray()
          .some(element => document(element).attr("id") === id),
        `目录锚点不存在：${target}`
      );
    }
    localLinks++;
  }
}

const posts = listPostFiles(root);
const ready = posts.filter(
  ({ data }) =>
    !data.draft && new Date(data.pubDatetime).getTime() <= Date.now()
);
assert.equal(
  articlePages.length,
  ready.length,
  "构建后的文章数与可发布的源文件不一致。"
);
for (const { path, data } of ready) {
  assert(
    typeof data.title === "string" && data.title.trim(),
    `文章缺少标题：${path}`
  );
  assert(
    typeof data.description === "string" && data.description.trim(),
    `文章缺少摘要：${path}`
  );
  const date = new Date(data.pubDatetime).toISOString();
  assert(
    articlePages.some(post => post.title === data.title && post.date === date),
    `文章未生成：${data.title}`
  );
}
console.log(
  `检查通过：${ready.length} 篇已发布文章、${localLinks} 个站内链接与资源、目录锚点、公式和搜索索引。`
);
console.log(
  `另有 ${posts.filter(({ data }) => data.draft).length} 篇草稿，未进入发布页面。`
);
