import test from "node:test";
import assert from "node:assert/strict";
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import sharp from "sharp";
import { importPost } from "../import-post.mjs";
import { parsePost } from "../post-files.mjs";

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "blog-import-test-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const input = join(root, "材料 with spaces");
  mkdirSync(input);
  return { root, input };
}

test("Markdown import preserves code, supports spaced image names and reference images, and creates a draft", async t => {
  const { root, input } = fixture(t);
  await sharp({
    create: { width: 20, height: 10, channels: 3, background: "#FFFFFF" },
  })
    .png()
    .toFile(join(input, "示意 图.png"));
  const body =
    "# 测试文章\n\n这是一段正文。\n\n![示意图](<示意 图.png>)\n\n![引用图片][diagram]\n\n[diagram]: 示意%20图.png\n\n```md\n![不要改这里](fake.png)\n```\n";
  const file = join(input, "文章.md");
  writeFileSync(file, body);
  const result = await importPost(root, file, { slug: "example-post" });
  const text = readFileSync(result.path, "utf8");
  const post = parsePost(text);
  assert.equal(post.data.title, "测试文章");
  assert.equal(post.data.draft, true);
  assert(!post.body.startsWith("# 测试文章"));
  assert.match(post.body, /```md\n!\[不要改这里\]\(fake\.png\)\n```/u);
  const assets = [
    ...post.body.matchAll(
      /\/images\/posts\/example-post\/image-[a-f0-9]+\.webp/gu
    ),
  ];
  assert.equal(assets.length, 2);
  for (const asset of assets)
    assert(existsSync(join(root, "public", asset[0])));
  assert.equal(readFileSync(file, "utf8"), body);
});

test("import rejects images outside the selected article directory and leaves no partial output", async t => {
  const { root, input } = fixture(t);
  await sharp({
    create: { width: 2, height: 2, channels: 3, background: "#FFFFFF" },
  })
    .png()
    .toFile(join(root, "outside.png"));
  const file = join(input, "article.md");
  writeFileSync(file, "# Article\n\n![image](../outside.png)\n");
  await assert.rejects(
    importPost(root, file, { slug: "outside-image" }),
    /所在目录/u
  );
  assert(!existsSync(join(root, "src/content/posts/outside-image.md")));
  assert(!existsSync(join(root, "public/images/posts/outside-image")));
});

test("import does not overwrite an existing post", async t => {
  const { root, input } = fixture(t);
  const file = join(input, "article.md");
  writeFileSync(file, "# First title\n\nOriginal body\n");
  const imported = await importPost(root, file, { slug: "existing-post" });
  const before = readFileSync(imported.path);
  writeFileSync(file, "# Second title\n\nChanged body\n");
  await assert.rejects(
    importPost(root, file, { slug: "existing-post" }),
    /已经存在/u
  );
  assert.deepEqual(readFileSync(imported.path), before);
});
