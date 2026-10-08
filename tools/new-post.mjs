import { writeFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";

const [title, slug] = process.argv.slice(2);
if (!title || !slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
  throw new Error('用法：npm run new -- "文章标题" english-slug');
}
const path = join(
  resolve(import.meta.dirname, ".."),
  "src/content/posts",
  `${slug}.md`
);
if (existsSync(path)) throw new Error("这个文章文件已存在。");
const content = `---\ntitle: ${JSON.stringify(title)}\npubDatetime: ${new Date().toISOString()}\ntags: []\ndescription: 这里填写文章摘要。\ndraft: true\n---\n\n这里写正文。\n`;
writeFileSync(path, content);
console.log(`已创建草稿：${path}\n写好后把 draft 改成 false，再构建发布。`);
