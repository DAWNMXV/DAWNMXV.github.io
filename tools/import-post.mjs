import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, extname, join, relative, resolve } from "node:path";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import { unified } from "unified";
import remarkParse from "remark-parse";
import sharp from "sharp";
import { parsePost } from "./post-files.mjs";

export function serializePost(data, body) {
  const lines = Object.entries(data)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => {
      const name = /^[A-Za-z][A-Za-z0-9_]*$/u.test(key)
        ? key
        : JSON.stringify(key);
      if (["pubDatetime", "modDatetime"].includes(key) && value != null) {
        if (!(value instanceof Date) && typeof value !== "string")
          throw new Error(`${name} 请填写有效的日期。`);
        return `${name}: ${new Date(value).toISOString()}`;
      }
      return `${name}: ${JSON.stringify(value)}`;
    });
  return `---\n${lines.join("\n")}\n---\n\n${body.trim()}\n`;
}

export async function importPost(root, input, options) {
  const { slug } = options;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(slug ?? ""))
    throw new Error("文章地址请用英文小写、数字和连字符。");
  const source = realpathSync(resolve(input));
  if (!/\.md$/iu.test(source)) throw new Error("目前请导入 .md 文件。");
  const destination = join(root, "src/content/posts", `${slug}.md`);
  if (existsSync(destination))
    throw new Error("这篇文章地址已经存在，请换一个 slug。");
  const { data, body: original } = parsePost(
    readFileSync(source, "utf8"),
    basename(source)
  );
  const heading = original.match(/^\s*# ([^\n]+)\r?\n/u);
  const title = String(
    options.title ||
      data.title ||
      heading?.[1] ||
      basename(source, extname(source))
  ).trim();
  const body = heading ? original.slice(heading[0].length) : original;
  const tree = unified().use(remarkParse).parse(body);
  const nodes = [];
  function visit(node) {
    nodes.push(node);
    for (const child of node.children ?? []) visit(child);
  }
  visit(tree);
  const references = new Set(
    nodes
      .filter(node => node.type === "imageReference")
      .map(node => node.identifier)
  );
  const imageNodes = nodes.filter(
    node =>
      node.type === "image" ||
      (node.type === "definition" && references.has(node.identifier))
  );
  const temp = mkdtempSync(join(tmpdir(), "blog-import-"));
  const imageFolder = join(root, "public/images/posts", slug);
  const mappings = new Map();
  const replacements = [];
  let createdFolder = false;
  try {
    for (const node of imageNodes) {
      const url = node.url;
      if (/^(?:https?:|data:|\/\/)/iu.test(url)) continue;
      if (
        url.startsWith("/") &&
        existsSync(join(root, "public", decodeURIComponent(url)))
      )
        continue;
      let published = mappings.get(url);
      if (!published) {
        const local = realpathSync(
          resolve(dirname(source), decodeURIComponent(url.split(/[?#]/u)[0]))
        );
        const scope = relative(dirname(source), local);
        if (
          scope === ".." ||
          scope.startsWith("../") ||
          scope.startsWith("..\\")
        )
          throw new Error("本地配图需要放在 Markdown 所在目录或其子目录内。");
        const extension = extname(local).toLowerCase();
        if (
          ![".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif"].includes(
            extension
          )
        )
          throw new Error(`不支持的配图格式：${extension}`);
        const digest = createHash("sha256")
          .update(readFileSync(local))
          .digest("hex")
          .slice(0, 12);
        const outputName = `image-${digest}${extension === ".gif" ? ".gif" : ".webp"}`;
        if (extension === ".gif") {
          const metadata = await sharp(local).metadata();
          if (metadata.format !== "gif") throw new Error("GIF 配图内容无效。");
          cpSync(local, join(temp, outputName));
        } else
          await sharp(local, { limitInputPixels: 100_000_000 })
            .resize({ width: 1536, withoutEnlargement: true })
            .webp({ quality: 88 })
            .toFile(join(temp, outputName));
        published = `/images/posts/${slug}/${outputName}`;
        mappings.set(url, published);
      }
      const suffix = node.title ? ` ${JSON.stringify(node.title)}` : "";
      const replacement =
        node.type === "image"
          ? `![${node.alt.replace(/[\[\]\\]/gu, "\\$&")}](${published}${suffix})`
          : `[${node.label ?? node.identifier}]: ${published}${suffix}`;
      replacements.push({
        start: node.position.start.offset,
        end: node.position.end.offset,
        replacement,
      });
    }
    let rewritten = body;
    for (const change of replacements.sort((a, b) => b.start - a.start))
      rewritten =
        rewritten.slice(0, change.start) +
        change.replacement +
        rewritten.slice(change.end);
    const excerpt = body
      .replace(/```[\s\S]*?```/gu, "")
      .replace(/!\[[^\]]*\]\([^)]*\)/gu, "")
      .replace(/<[^>]*>/gu, "")
      .replace(/[#*_`>]/gu, "")
      .replace(/\s+/gu, " ")
      .trim()
      .slice(0, 140);
    const metadata = {
      ...data,
      title,
      pubDatetime: data.pubDatetime ?? new Date().toISOString(),
      tags: options.tags ?? data.tags ?? [],
      description: options.description ?? data.description ?? excerpt ?? title,
      draft: true,
    };
    if (!metadata.description) metadata.description = title;
    if (mappings.size) {
      if (existsSync(imageFolder))
        throw new Error("同名配图目录已存在，请换一个 slug。");
      mkdirSync(dirname(imageFolder), { recursive: true });
      cpSync(temp, imageFolder, {
        recursive: true,
        errorOnExist: true,
        force: false,
      });
      createdFolder = true;
    }
    mkdirSync(dirname(destination), { recursive: true });
    writeFileSync(destination, serializePost(metadata, rewritten), {
      flag: "wx",
    });
    return {
      path: destination,
      images: new Set(mappings.values()).size,
      title,
      slug,
    };
  } catch (error) {
    if (createdFolder) rmSync(imageFolder, { recursive: true, force: true });
    throw error;
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
}
