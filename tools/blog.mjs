import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { importPost, serializePost } from "./import-post.mjs";
import { listPostFiles, parsePost } from "./post-files.mjs";
import { publishBlog, waitForPages } from "./publish-blog.mjs";

const root = resolve(import.meta.dirname, "..");
const config = JSON.parse(
  readFileSync(join(root, "publishing.config.json"), "utf8")
);
const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    ...options,
  });
  if (result.error)
    throw new Error(`无法启动 ${command}：${result.error.message}`);
  if (result.status !== 0)
    throw new Error(`${command} 执行未完成，请查看上面的输出。`);
};
const unquotePath = text =>
  text
    .trim()
    .replace(/^['"]|['"]$/gu, "")
    .replace(/\\ /gu, " ");
function markReady(slug) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(slug ?? ""))
    throw new Error("请填写文章的英文 slug。");
  const path = join(root, "src/content/posts", `${slug}.md`);
  const { data, body } = parsePost(readFileSync(path, "utf8"), slug);
  if (!data.draft) {
    console.log("这篇文章已经是可发布状态。");
    return;
  }
  writeFileSync(path, serializePost({ ...data, draft: false }, body));
  console.log(`已设为可发布：${path}`);
}
function doctor() {
  console.log(
    `博客：${config.siteUrl}\n项目：${root}\nNode.js：${process.version}`
  );
  const auth = spawnSync("gh", ["auth", "status", "--hostname", "github.com"], {
    cwd: root,
    stdio: "pipe",
    encoding: "utf8",
  });
  console.log(
    auth.status === 0
      ? "GitHub：已登录"
      : "GitHub：首次使用请运行 npm run blog -- login"
  );
  const posts = listPostFiles(root);
  console.log(
    `文章：${posts.length} 篇，草稿 ${posts.filter(post => post.data.draft).length} 篇`
  );
  run("git", ["status", "--short", "--branch"]);
}
async function action(command, args = []) {
  if (command === "new")
    run(process.execPath, [join(root, "tools/new-post.mjs"), ...args]);
  else if (command === "import") {
    const [input, slug] = args;
    if (!input || !slug)
      throw new Error(
        '用法：npm run blog -- import "/路径/文章.md" english-slug'
      );
    const result = await importPost(root, unquotePath(input), { slug });
    console.log(
      `已导入草稿：${result.path}\n复制并优化 ${result.images} 张配图，原文件保持完整。\n检查后执行：npm run blog -- ready ${slug}`
    );
  } else if (command === "ready") markReady(args[0]);
  else if (command === "preview")
    run("npm", ["run", "dev", "--", "--port", "4322", "--open"], {
      env: { ...process.env, BLOG_PREVIEW_DRAFTS: "1" },
    });
  else if (command === "check") {
    run("npm", ["run", "build"]);
    run("npm", ["run", "verify"]);
  } else if (command === "publish") {
    if (args.some(arg => !["--dry-run", "--no-wait"].includes(arg)))
      throw new Error("发布参数只能是 --dry-run 或 --no-wait。");
    await publishBlog(root, {
      dryRun: args.includes("--dry-run"),
      wait: !args.includes("--no-wait"),
    });
  } else if (command === "login")
    run("gh", [
      "auth",
      "login",
      "--hostname",
      "github.com",
      "--git-protocol",
      "https",
      "--web",
      "--skip-ssh-key",
    ]);
  else if (command === "status") {
    doctor();
    const head = spawnSync(
      "gh",
      [
        "api",
        `repos/${config.githubRepository}/branches/${config.siteBranch}`,
        "--jq",
        ".commit.sha",
      ],
      { cwd: root, encoding: "utf8", stdio: "pipe" }
    );
    if (head.status === 0) await waitForPages(root, config, head.stdout.trim());
  } else if (command === "doctor") doctor();
  else
    throw new Error(
      "可用命令：new、import、ready、preview、check、publish、login、status、doctor。"
    );
}

async function menu() {
  const input = createInterface({ input: stdin, output: stdout });
  try {
    console.log(
      "\nDAWNMX 博客助手\n1. 新建草稿\n2. 导入 Markdown（含本地配图）\n3. 标记草稿可发布\n4. 预览博客（包含草稿）\n5. 检查并发布\n6. 查看环境与发布状态\n7. 首次登录 GitHub\n0. 退出\n"
    );
    const selected = (await input.question("选择操作：")).trim();
    let command,
      args = [];
    if (selected === "1") {
      command = "new";
      args = [
        await input.question("文章标题："),
        await input.question("英文地址 slug："),
      ];
    } else if (selected === "2") {
      command = "import";
      args = [
        await input.question("Markdown 路径（可拖入文件）："),
        await input.question("英文地址 slug："),
      ];
    } else if (selected === "3") {
      command = "ready";
      args = [await input.question("文章的英文 slug：")];
    } else if (selected === "4") command = "preview";
    else if (selected === "5") command = "publish";
    else if (selected === "6") command = "status";
    else if (selected === "7") command = "login";
    else if (selected === "0") return;
    else throw new Error("请选择 0～7。");
    input.close();
    await action(
      command,
      args.map(arg => arg.trim())
    );
  } finally {
    input.close();
  }
}

try {
  const [command, ...args] = process.argv.slice(2);
  if (command) await action(command, args);
  else await menu();
} catch (error) {
  console.error(`操作未完成：${error.message}`);
  process.exitCode = 1;
}
