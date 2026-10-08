import { readFileSync, existsSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { load } from "cheerio";

const root = resolve(import.meta.dirname, "..");
const output = join(root, "dist");
const manifest = JSON.parse(
  readFileSync(join(root, "recovery-manifest.json"), "utf8")
);
const hash = value => createHash("sha256").update(value).digest("hex");
const page = path =>
  load(readFileSync(join(output, path, "index.html"), "utf8"));
for (const post of manifest.posts) {
  const $ = page(post.path);
  const bodyText = $("#article").text().replace(/\s+/gu, "");
  assert.equal(
    hash(bodyText),
    post.textHash,
    `Article body changed: ${post.path}`
  );
  assert.equal(
    $("h1").text().trim(),
    post.title,
    `Article title changed: ${post.path}`
  );
  assert.equal(
    $('meta[property="article:published_time"]').attr("content"),
    new Date(post.date).toISOString(),
    `Article date changed: ${post.path}`
  );
  for (const tag of post.tags)
    assert(
      $("main a")
        .toArray()
        .some(a => $(a).text().trim() === tag),
      `Tag missing: ${post.path} ${tag}`
    );
}
for (const entry of manifest.pages) {
  const $ = page(entry.path);
  assert($("h1").length, `Missing page: ${entry.path}`);
}
for (const asset of manifest.assets) {
  assert.equal(
    hash(readFileSync(join(output, asset.path))),
    asset.hash,
    `Asset changed: ${asset.path}`
  );
}
const files = readdirSync(output, {
  recursive: true,
  withFileTypes: true,
}).filter(file => file.isFile() && file.name.endsWith(".html"));
for (const file of files) {
  const path = join(file.parentPath, file.name);
  const $ = load(readFileSync(path, "utf8"));
  for (const node of $(
    "a[href], img[src], script[src], link[href]"
  ).toArray()) {
    const target = $(node).attr("href") ?? $(node).attr("src");
    if (!target || !target.startsWith("/")) continue;
    const url = new URL(target, "https://dawnmxv.github.io");
    if (url.hostname !== "dawnmxv.github.io") continue;
    const localPath = decodeURIComponent(url.pathname).replace(/^\//u, "");
    assert(
      existsSync(join(output, localPath)) ||
        existsSync(join(output, localPath, "index.html")),
      `Broken local link in ${path}: ${target}`
    );
  }
}
const article = page(manifest.newArticle.path);
assert.equal(
  hash(article("#article").text().replace(/\s+/gu, "")),
  manifest.newArticle.textHash,
  "New article text changed"
);
assert.equal(
  article("#article img").length,
  4,
  "New article must include all four illustrations"
);
for (const asset of manifest.newArticle.images)
  assert.equal(
    hash(readFileSync(join(output, asset.path))),
    asset.hash,
    `New illustration changed: ${asset.path}`
  );
const home = page("");
assert(
  home("a")
    .toArray()
    .some(a => home(a).text().trim() === manifest.newArticle.title),
  "New article missing from homepage"
);
assert(
  existsSync(join(output, "pagefind/pagefind.js")),
  "Search index missing"
);
console.log(
  "Verified 7 old articles and URLs, preserved assets, the complete new article, all 4 illustrations, local links and the search index."
);
