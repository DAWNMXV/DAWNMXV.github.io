import { readFileSync, readdirSync } from "node:fs";
import { join, basename } from "node:path";
import { load as parseYaml } from "js-yaml";

export function parsePost(text, filename = "Markdown") {
  const frontmatter = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u);
  if (!frontmatter) return { data: {}, body: text };
  let data;
  try {
    data = parseYaml(frontmatter[1]) ?? {};
  } catch (error) {
    throw new Error(
      `${filename} 的文章信息格式错误（第 ${(error.mark?.line ?? 0) + 2} 行）。`
    );
  }
  if (typeof data !== "object" || Array.isArray(data))
    throw new Error(`${filename} 的文章信息必须是键值列表。`);
  return { data, body: text.slice(frontmatter[0].length) };
}

export function listPostFiles(root) {
  const folder = join(root, "src/content/posts");
  return readdirSync(folder, { recursive: true, withFileTypes: true })
    .filter(
      file =>
        file.isFile() &&
        /\.(?:md|mdx)$/iu.test(file.name) &&
        !basename(file.name).startsWith("_")
    )
    .map(file => {
      const path = join(file.parentPath, file.name);
      return { path, ...parsePost(readFileSync(path, "utf8"), file.name) };
    });
}
