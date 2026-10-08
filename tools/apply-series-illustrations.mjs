import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(import.meta.dirname, "..");
const folder = join(root, "illustrations/digital-verification");

export function stripSeriesIllustrations(content) {
  return content
    .replace(
      /<!-- dv-illustration: (\d+) -->[\s\S]*?<!-- \/dv-illustration: \1 -->\n*/gu,
      ""
    )
    .replace(
      /<!-- dv-illustration-hint -->[\s\S]*?<!-- \/dv-illustration-hint -->\n*/gu,
      ""
    );
}

export function normalizedArticleSource(content) {
  return stripSeriesIllustrations(content)
    .replace(/^---\r?\n[\s\S]*?\r?\n---\s*/u, "")
    .replace(/\s+/gu, "");
}

const escapeAttribute = value =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

function questionEnd(content, start) {
  const newline = content.indexOf("\n", start);
  let offset = newline + 1;
  let fence = null;
  for (const line of content.slice(offset).split(/(?<=\n)/u)) {
    const marker = line.match(/^\s{0,3}(`{3,}|~{3,})/u)?.[1];
    if (marker) {
      if (!fence) fence = marker[0];
      else if (marker[0] === fence) fence = null;
    } else if (!fence && /^#{2,3} /u.test(line)) return offset;
    offset += line.length;
  }
  return content.length;
}

export function applySeriesIllustrations() {
  const manifestPath = join(folder, "manifest.json");
  if (!existsSync(manifestPath)) return;
  const { images } = JSON.parse(readFileSync(manifestPath, "utf8"));
  const posts = new Set(images.map(image => image.post));
  for (const post of posts) {
    const path = join(root, "src/content/posts", `${post}.md`);
    const before = readFileSync(path, "utf8");
    let content = stripSeriesIllustrations(before);
    const illustrations = images.filter(image => image.post === post);
    for (const image of illustrations) {
      if (!existsSync(join(root, "public", image.asset)))
        throw new Error(`Missing illustration: ${image.asset}`);
      const heading = `### ${image.heading}\n`;
      const start = content.indexOf(heading);
      if (start < 0) throw new Error(`Missing question: ${image.heading}`);
      const end = questionEnd(content, start);
      const figure = [
        `<!-- dv-illustration: ${image.id} -->`,
        `<figure class="technical-figure" data-illustration="${image.id}">`,
        `<img src="${image.asset}" alt="${escapeAttribute(image.title)}" width="${image.width}" height="${image.height}" loading="lazy" decoding="async" />`,
        `<figcaption>${escapeAttribute(image.caption)}</figcaption>`,
        "</figure>",
        `<!-- /dv-illustration: ${image.id} -->`,
      ].join("\n");
      content =
        content.slice(0, end).trimEnd() +
        "\n\n" +
        figure +
        "\n\n" +
        content.slice(end);
    }
    const link = "[查看系列目录](/series/digital-verification/)";
    const hint =
      '<!-- dv-illustration-hint -->\n<p class="technical-figure-hint">文中示意图可点击放大。</p>\n<!-- /dv-illustration-hint -->';
    content = content.replace(link, `${link}\n\n${hint}`);
    if (content !== before) {
      const updated = `modDatetime: ${new Date().toISOString()}`;
      content = /^modDatetime:/mu.test(content)
        ? content.replace(/^modDatetime:.*$/mu, updated)
        : content.replace(/^(pubDatetime:.*)$/mu, `$1\n${updated}`);
      if (!/^ogImage:/mu.test(content))
        content = content.replace(
          /^(description:.*)$/mu,
          `$1\nogImage: "https://dawnmxv.github.io${illustrations[0].asset}"`
        );
      writeFileSync(path, content);
    }
  }
  console.log(
    `Inserted ${images.length} illustrations into ${posts.size} articles.`
  );
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  applySeriesIllustrations();
