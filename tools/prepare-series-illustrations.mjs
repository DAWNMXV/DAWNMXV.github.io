import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { createHash } from "node:crypto";
import sharp from "sharp";
import {
  normalizedArticleSource,
  applySeriesIllustrations,
} from "./apply-series-illustrations.mjs";

const root = resolve(import.meta.dirname, "..");
const folder = join(root, "illustrations/digital-verification");
const plan = JSON.parse(readFileSync(join(folder, "plan.json"), "utf8"));
const hash = data => createHash("sha256").update(data).digest("hex");
const images = [];
for (const image of plan) {
  const output = join(root, "public", image.asset);
  mkdirSync(dirname(output), { recursive: true });
  await sharp(join(root, image.original))
    .resize({ width: 1536, withoutEnlargement: true })
    .webp({ quality: 90, effort: 6 })
    .toFile(output);
  const metadata = await sharp(output).metadata();
  const data = readFileSync(output);
  const source = readFileSync(
    join(root, "src/content/posts", `${image.post}.md`),
    "utf8"
  );
  images.push({
    ...image,
    width: metadata.width,
    height: metadata.height,
    bytes: data.length,
    sha256: hash(data),
    sourceTextHash: hash(normalizedArticleSource(source)),
  });
}
writeFileSync(
  join(folder, "manifest.json"),
  JSON.stringify({ backend: "built-in-imagegen", images }, null, 2) + "\n"
);
const outline = [
  "# 数字验证问答配图",
  "",
  "每篇 2 张，共 16 张。使用内置 imagegen，白底与蓝绿强调色，全部为原创的解释示意。PNG 原图保存在本地 output/illustrations/digital-verification/，网站使用 WebP。",
  "",
];
for (const image of images)
  outline.push(
    `## ${String(image.id).padStart(2, "0")} · ${image.title}`,
    `文章：\`${image.post}\`。插入「${image.heading}」的答案之后。`,
    "",
    image.caption,
    "",
    `- [提示词](${image.prompt.replace("illustrations/digital-verification/", "")})`,
    `- [网站图片](https://dawnmxv.github.io${image.asset})`,
    ""
  );
writeFileSync(join(folder, "outline.md"), outline.join("\n") + "\n");
applySeriesIllustrations();
console.log(
  `Prepared ${images.length} WebP files: ${(images.reduce((sum, image) => sum + image.bytes, 0) / 1024 / 1024).toFixed(2)} MiB total.`
);
