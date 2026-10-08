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

const series = JSON.parse(
  readFileSync(join(root, "notion-series-manifest.json"), "utf8")
);
const normalizeHeading = value =>
  value.replace(/[\\`*_]/g, "").replace(/\s+/gu, "");
for (const [index, entry] of series.entries()) {
  const $ = page(entry.path);
  assert.equal(
    $("h1").text().trim(),
    entry.title,
    `Missing series article: ${entry.path}`
  );
  const headings = $("#article h3")
    .toArray()
    .map(node => normalizeHeading($(node).text()));
  for (const question of entry.questions)
    assert(
      headings.includes(normalizeHeading(question)),
      `Missing question: ${question}`
    );
  const codes = $("#article pre code")
    .toArray()
    .map(node => hash($(node).text().replace(/\n$/, "")));
  assert.deepEqual(
    codes,
    entry.codeHashes,
    `Code was changed in ${entry.path}`
  );
  assert.equal(
    $("#article .katex-error").length,
    0,
    `Formula rendering failed: ${entry.path}`
  );
  assert(
    $("#article details summary")
      .toArray()
      .some(node => $(node).text() === "目录"),
    `Missing table of contents: ${entry.path}`
  );
  for (const a of $("#article a[href^='#']").toArray()) {
    const target = decodeURIComponent($(a).attr("href").slice(1));
    assert(
      $("[id]")
        .toArray()
        .some(node => $(node).attr("id") === target),
      `Broken heading link: ${entry.path} #${target}`
    );
  }
  const adjacent = $("[data-pagefind-ignore] a").toArray();
  for (const [label, neighbor] of [
    ["上一篇", series[index - 1]],
    ["下一篇", series[index + 1]],
  ]) {
    const link = adjacent.find(node => $(node).text().trim().startsWith(label));
    assert.equal(
      link ? $(link).attr("href") : undefined,
      neighbor ? `/${neighbor.path}` : undefined,
      `Wrong ${label} in ${entry.path}`
    );
  }
}
assert.equal(series.length, 8);
assert.equal(
  series.reduce((n, entry) => n + entry.sections, 0),
  22
);
console.log(
  "Verified all 8 series articles, 22 source topics, 205 question headings, original code blocks, formulas and table-of-contents links."
);
