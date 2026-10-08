import { execFileSync } from "node:child_process";
import {
  cpSync,
  constants,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { basename, extname, join, relative } from "node:path";
import { tmpdir } from "node:os";
import { setTimeout as delay } from "node:timers/promises";
import { listPostFiles } from "./post-files.mjs";

export async function waitForPages(root, config, commit) {
  console.log("等待 GitHub Pages 部署…");
  for (let attempt = 0; attempt < 36; attempt++) {
    const text = execFileSync(
      "gh",
      [
        "api",
        `repos/${config.githubRepository}/actions/runs?head_sha=${commit}&per_page=10`,
      ],
      {
        cwd: root,
        encoding: "utf8",
        timeout: 20_000,
        maxBuffer: 8 * 1024 * 1024,
      }
    );
    const runs = JSON.parse(text).workflow_runs;
    const run = runs.find(
      item =>
        item.head_sha === commit &&
        (item.path?.includes("pages-build-deployment") ||
          item.name === "pages build and deployment")
    );
    if (run?.status === "completed") {
      if (run.conclusion !== "success")
        throw new Error(`Pages 部署未成功：${run.html_url}`);
      console.log(`已上线：${config.siteUrl}\n部署记录：${run.html_url}`);
      return;
    }
    await delay(5000);
  }
  throw new Error(
    `代码已推送，部署仍未结束。请查看 https://github.com/${config.githubRepository}/actions`
  );
}

export async function publishBlog(
  root,
  { dryRun = false, wait = true, message = "Update blog content" } = {}
) {
  const config = JSON.parse(
    readFileSync(join(root, "publishing.config.json"), "utf8")
  );
  const run = (command, args, cwd = root, capture = true, extra = {}) =>
    execFileSync(command, args, {
      cwd,
      encoding: "utf8",
      stdio: capture ? "pipe" : "inherit",
      timeout: 60_000,
      maxBuffer: 16 * 1024 * 1024,
      env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
      ...extra,
    });
  const credentialArgs = config.githubRepository
    ? [
        "-c",
        "credential.helper=",
        "-c",
        "credential.helper=!gh auth git-credential",
      ]
    : [];
  const git = (args, cwd = root, capture = true, extra = {}) =>
    run(
      "git",
      ["-c", "http.version=HTTP/1.1", ...credentialArgs, ...args],
      cwd,
      capture,
      extra
    );
  const files = value => value.split("\0").filter(Boolean);
  if (git(["branch", "--show-current"]).trim() !== config.sourceBranch)
    throw new Error(`请在 ${config.sourceBranch} 源码分支发布。`);
  if (git(["remote", "get-url", "origin"]).trim() !== config.remote)
    throw new Error("origin 与 publishing.config.json 指定的仓库不同。");
  if (
    config.githubRepository &&
    config.remote !== `https://github.com/${config.githubRepository}.git`
  )
    throw new Error("GitHub 仓库与远端地址不一致。");
  if (!dryRun && config.githubRepository) {
    try {
      run("gh", ["auth", "status", "--hostname", "github.com"]);
    } catch {
      throw new Error("首次发布需要登录 GitHub：npm run blog -- login");
    }
  }
  if (!dryRun) {
    git(
      ["fetch", "origin", config.sourceBranch, config.siteBranch],
      root,
      false
    );
    try {
      git([
        "merge-base",
        "--is-ancestor",
        `origin/${config.sourceBranch}`,
        "HEAD",
      ]);
    } catch {
      throw new Error(
        `远端源码已有更新，请先 git pull --ff-only origin ${config.sourceBranch}。`
      );
    }
  }

  const known = new Set(
    files(git(["ls-tree", "-r", "--name-only", "-z", "HEAD"]))
  );
  const all = files(
    git(["ls-files", "--cached", "--others", "--exclude-standard", "-z"])
  );
  const drafts = listPostFiles(root).filter(
    post => post.data.draft && !known.has(relative(root, post.path))
  );
  const draftFiles = new Set(drafts.map(post => relative(root, post.path)));
  const draftAssets = drafts.flatMap(post => {
    const slug = basename(post.path, extname(post.path));
    return [`public/images/posts/${slug}/`, `public/images/${slug}/`];
  });
  const approved = path =>
    known.has(path) ||
    config.newRootFiles.includes(path) ||
    config.newFileDirectories.some(prefix => path.startsWith(prefix));
  const eligible = path =>
    approved(path) &&
    !draftFiles.has(path) &&
    !draftAssets.some(prefix => path.startsWith(prefix));
  const staged = files(git(["diff", "--cached", "--name-only", "-z"]));
  if (staged.some(path => !eligible(path)))
    throw new Error(
      "暂存区里有草稿或本次发布范围之外的文件，请先取消这些文件的暂存。"
    );

  const originalIndex = git(["write-tree"]).trim();
  const originalHead = git(["rev-parse", "HEAD"]).trim();
  const temp = mkdtempSync(join(tmpdir(), "dawnmxv-publish-"));
  let committed = false;
  let sourcePushed = false;
  let preparedTree = null;
  try {
    const candidates = all.filter(eligible);
    if (candidates.length) git(["add", "--", ...candidates]);
    const tree = git(["write-tree"]).trim();
    preparedTree = tree;
    const ensureCheckedState = () => {
      if (
        git(["rev-parse", "HEAD"]).trim() !== originalHead ||
        git(["write-tree"]).trim() !== tree ||
        git(["branch", "--show-current"]).trim() !== config.sourceBranch
      )
        throw new Error(
          "检查期间 Git 暂存区或分支发生了其他改动，已保留当前状态，请重新发布。"
        );
    };
    const snapshot = join(temp, "source");
    mkdirSync(snapshot);
    const archive = git(["archive", "--format=tar", tree], root, true, {
      encoding: null,
      maxBuffer: 128 * 1024 * 1024,
    });
    run("tar", ["-xf", "-", "-C", snapshot], root, true, { input: archive });
    if (existsSync(join(root, "node_modules")))
      cpSync(join(root, "node_modules"), join(snapshot, "node_modules"), {
        recursive: true,
        verbatimSymlinks: true,
        mode: constants.COPYFILE_FICLONE,
      });
    console.log(
      `校验本次将提交的源码。${drafts.length ? `保留 ${drafts.length} 篇本地草稿，草稿及配图不自动提交。` : ""}`
    );
    const packageJson = JSON.parse(
      readFileSync(join(snapshot, "package.json"), "utf8")
    );
    if (packageJson.scripts.lint)
      run("npm", ["run", "lint"], snapshot, false, { timeout: 600_000 });
    run("npm", ["run", "build"], snapshot, false, { timeout: 600_000 });
    run("npm", ["run", "verify"], snapshot, false, { timeout: 600_000 });
    if (config.githubRepository)
      run("npm", ["audit", "--audit-level=high"], snapshot, false, {
        timeout: 120_000,
      });
    ensureCheckedState();
    if (dryRun) {
      console.log("检查通过。本次未提交、未推送，暂存区已恢复。");
      return { dryRun: true, excludedDrafts: drafts.length };
    }
    const site = join(temp, "site");
    git(
      [
        "clone",
        "--depth",
        "1",
        "--single-branch",
        "--branch",
        config.siteBranch,
        config.remote,
        site,
      ],
      root,
      false
    );
    ensureCheckedState();
    if (git(["diff", "--cached", "--name-only"]).trim())
      git(["commit", "-m", message], root, false);
    committed = true;
    const sourceCommit = git(["rev-parse", "HEAD"]).trim();
    if (git(["rev-parse", `${sourceCommit}^{tree}`]).trim() !== tree)
      throw new Error(
        "提交钩子改动了检查过的源码。本次没有推送，请重新检查并发布。"
      );
    git(
      ["push", "origin", `${sourceCommit}:${config.sourceBranch}`],
      root,
      false
    );
    sourcePushed = true;
    for (const path of files(git(["ls-files", "-z"], site))) {
      if (
        path.startsWith(".github/") ||
        ["CNAME", "README.md", ".gitignore"].includes(path)
      )
        continue;
      rmSync(join(site, path), { force: true });
    }
    cpSync(join(snapshot, "dist"), site, { recursive: true });
    writeFileSync(join(site, ".nojekyll"), "");
    for (const field of ["user.name", "user.email"])
      git(["config", field, git(["config", field]).trim()], site);
    git(["add", "--", "."], site);
    if (!git(["diff", "--cached", "--name-only"], site).trim()) {
      console.log("源码已备份；网页内容没有变化。");
      if (wait && config.githubRepository)
        await waitForPages(
          root,
          config,
          git(["rev-parse", "HEAD"], site).trim()
        );
      return { sourcePushed, siteChanged: false };
    }
    git(["commit", "-m", "Publish Astro blog"], site, false);
    const commit = git(["rev-parse", "HEAD"], site).trim();
    git(["push", "origin", config.siteBranch], site, false);
    console.log(`源码与网页均已推送：${commit.slice(0, 7)}`);
    if (wait && config.githubRepository)
      await waitForPages(root, config, commit);
    else console.log(`网站：${config.siteUrl}`);
    return { sourcePushed, siteChanged: true, commit };
  } catch (error) {
    if (sourcePushed)
      console.error(
        "源码已备份，网站发布尚未确认完成。修复后可再次运行发布命令。"
      );
    throw error;
  } finally {
    try {
      if (
        !committed &&
        git(["rev-parse", "HEAD"]).trim() === originalHead &&
        git(["branch", "--show-current"]).trim() === config.sourceBranch &&
        (preparedTree === null || git(["write-tree"]).trim() === preparedTree)
      )
        git(["read-tree", originalIndex]);
    } finally {
      rmSync(temp, { recursive: true, force: true });
    }
  }
}
