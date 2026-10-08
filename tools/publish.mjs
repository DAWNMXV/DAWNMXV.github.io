import { execFileSync } from "node:child_process";
import { cpSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { tmpdir } from "node:os";

const root = resolve(import.meta.dirname, "..");
const remote = "https://github.com/DAWNMXV/DAWNMXV.github.io.git";
const dryRun = process.argv.includes("--dry-run");
if (process.argv.slice(2).some(arg => arg !== "--dry-run"))
  throw new Error("用法：npm run publish [-- --dry-run]");
const run = (command, args, cwd = root, capture = false) =>
  execFileSync(command, args, {
    cwd,
    stdio: capture ? "pipe" : "inherit",
    encoding: "utf8",
    timeout: 60_000,
  });
const git = (args, cwd = root, capture = false) =>
  run("git", ["-c", "http.version=HTTP/1.1", ...args], cwd, capture);
run("npm", ["run", "build"]);
run("npm", ["run", "verify"]);
if (dryRun) {
  console.log(
    "构建与校验通过；源码将备份到 astro-source，网页将发布到 main。本次未写入远端。"
  );
  process.exit(0);
}
if (git(["branch", "--show-current"], root, true).trim() !== "astro-source")
  throw new Error("请从 astro-source 分支发布。");
if (git(["remote", "get-url", "origin"], root, true).trim() !== remote)
  throw new Error("Git 远端与博客仓库不匹配。");
const checkout = join(
  mkdtempSync(join(tmpdir(), "dawnmxv-astro-publish-")),
  "site"
);
git([
  "clone",
  "--depth",
  "1",
  "--single-branch",
  "--branch",
  "main",
  remote,
  checkout,
]);
git(["add", "--", "."]);
if (git(["diff", "--cached", "--name-only"], root, true).trim())
  git(["commit", "-m", "Update Astro blog source"]);
git(["push", "--set-upstream", "origin", "astro-source"]);
// main is the generated site. Keep repository-level configuration alongside it.
for (const path of git(["ls-files", "-z"], checkout, true)
  .split("\0")
  .filter(Boolean)) {
  if (
    path.startsWith(".github/") ||
    ["CNAME", "README.md", ".gitignore"].includes(path)
  )
    continue;
  rmSync(join(checkout, path), { force: true });
}
cpSync(join(root, "dist"), checkout, { recursive: true });
writeFileSync(join(checkout, ".nojekyll"), "");
for (const field of ["user.name", "user.email"])
  git(["config", field, git(["config", field], root, true).trim()], checkout);
git(["add", "--", "."], checkout);
if (git(["diff", "--cached", "--name-only"], checkout, true).trim()) {
  git(["commit", "-m", "Publish Astro blog"], checkout);
  git(["push", "origin", "main"], checkout);
}
console.log(
  "网页已推送。等待 GitHub Pages 完成发布后访问 https://dawnmxv.github.io/ 。"
);
