import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { publishBlog } from "../publish-blog.mjs";

const git = (root, ...args) =>
  execFileSync("git", ["-c", "core.hooksPath=/dev/null", ...args], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
function put(root, path, text) {
  mkdirSync(join(root, path, ".."), { recursive: true });
  writeFileSync(join(root, path), text);
}
function fixture(t) {
  const temp = mkdtempSync(join(tmpdir(), "blog-publisher-test-"));
  t.after(() => rmSync(temp, { recursive: true, force: true }));
  const remote = join(temp, "remote.git"),
    root = join(temp, "source");
  mkdirSync(root);
  git(temp, "init", "--bare", "--initial-branch=main", remote);
  git(root, "init", "--initial-branch=main");
  git(root, "config", "user.name", "Publisher Test");
  git(root, "config", "user.email", "test@example.invalid");
  put(root, "index.html", "old site");
  put(root, "README.md", "keep main readme");
  put(root, ".github/keep.yml", "keep configuration");
  git(root, "add", ".");
  git(root, "commit", "-m", "Initial site");
  git(root, "remote", "add", "origin", remote);
  git(root, "push", "origin", "main");
  git(root, "checkout", "-b", "astro-source");
  put(root, ".gitignore", "dist/\nnode_modules/\n");
  put(
    root,
    "publishing.config.json",
    JSON.stringify({
      remote,
      githubRepository: null,
      sourceBranch: "astro-source",
      siteBranch: "main",
      siteUrl: "https://example.invalid/",
      newRootFiles: [],
      newFileDirectories: ["src/", "public/", "tools/"],
    })
  );
  put(
    root,
    "src/content/posts/ready.md",
    "---\ntitle: Ready\npubDatetime: 2020-01-01\ndraft: false\n---\noriginal\n"
  );
  put(
    root,
    "tools/build.cjs",
    "const fs=require('node:fs');fs.mkdirSync('dist',{recursive:true});fs.writeFileSync('dist/index.html',fs.readFileSync('src/content/posts/ready.md'));"
  );
  put(
    root,
    "package.json",
    JSON.stringify({
      name: "publisher-fixture",
      scripts: {
        build: "node tools/build.cjs",
        verify: "node -e \"require('node:fs').accessSync('dist/index.html')\"",
      },
    })
  );
  git(root, "add", ".");
  git(root, "commit", "-m", "Initial source");
  git(root, "push", "-u", "origin", "astro-source");
  return { temp, root, remote };
}

test("dry run validates the staged snapshot without changing commits or the original index", async t => {
  const { root, remote } = fixture(t);
  put(root, "README.md", "user staged edit");
  git(root, "add", "README.md");
  put(
    root,
    "src/content/posts/ready.md",
    "---\ntitle: Ready\ndraft: false\n---\nchanged\n"
  );
  const head = git(root, "rev-parse", "HEAD"),
    index = git(root, "write-tree"),
    remoteHead = git(remote, "rev-parse", "main");
  await publishBlog(root, { dryRun: true });
  assert.equal(git(root, "rev-parse", "HEAD"), head);
  assert.equal(git(root, "write-tree"), index);
  assert.equal(git(remote, "rev-parse", "main"), remoteHead);
  assert.match(
    readFileSync(join(root, "src/content/posts/ready.md"), "utf8"),
    /changed/u
  );
});

test("publishing backs up ready content and keeps drafts, draft images and unrelated files local", async t => {
  const { root, remote } = fixture(t);
  put(
    root,
    "src/content/posts/ready.md",
    "---\ntitle: Ready\ndraft: false\n---\nnew public content\n"
  );
  put(
    root,
    "src/content/posts/private-draft.md",
    "---\ntitle: Draft\ndraft: true\n---\nprivate draft text\n"
  );
  put(
    root,
    "public/images/posts/private-draft/private.png",
    "private draft image"
  );
  put(root, "private-notes.txt", "unrelated file");
  await publishBlog(root, { wait: false });
  const sourceFiles = git(
    remote,
    "ls-tree",
    "-r",
    "--name-only",
    "astro-source"
  );
  assert(!sourceFiles.includes("private-draft"));
  assert(!sourceFiles.includes("private-notes"));
  assert.match(
    git(remote, "show", "astro-source:src/content/posts/ready.md"),
    /new public content/u
  );
  assert.match(git(remote, "show", "main:index.html"), /new public content/u);
  assert.equal(git(remote, "show", "main:README.md"), "keep main readme");
  assert.equal(
    git(remote, "show", "main:.github/keep.yml"),
    "keep configuration"
  );
  assert(
    readFileSync(
      join(root, "src/content/posts/private-draft.md"),
      "utf8"
    ).includes("private draft text")
  );
});

test("a failed build restores the index and does not publish", async t => {
  const { root, remote } = fixture(t);
  put(root, "README.md", "user staged edit");
  git(root, "add", "README.md");
  const index = git(root, "write-tree"),
    source = git(remote, "rev-parse", "astro-source"),
    site = git(remote, "rev-parse", "main");
  put(root, "tools/build.cjs", "process.exit(7);");
  await assert.rejects(publishBlog(root, { dryRun: true }));
  assert.equal(git(root, "write-tree"), index);
  assert.equal(git(remote, "rev-parse", "astro-source"), source);
  assert.equal(git(remote, "rev-parse", "main"), site);
});

test("an advanced remote source is rejected instead of being overwritten", async t => {
  const { temp, root, remote } = fixture(t);
  const peer = join(temp, "peer");
  git(temp, "clone", "--branch", "astro-source", remote, peer);
  git(peer, "config", "user.name", "Peer");
  git(peer, "config", "user.email", "peer@example.invalid");
  put(peer, "README.md", "remote edit");
  git(peer, "add", "README.md");
  git(peer, "commit", "-m", "Remote edit");
  git(peer, "push", "origin", "astro-source");
  const head = git(remote, "rev-parse", "astro-source"),
    site = git(remote, "rev-parse", "main");
  await assert.rejects(publishBlog(root), /远端源码已有更新/u);
  assert.equal(git(remote, "rev-parse", "astro-source"), head);
  assert.equal(git(remote, "rev-parse", "main"), site);
});

test("an index changed during checks is preserved and is not published", async t => {
  const { root, remote } = fixture(t);
  const before = git(remote, "rev-parse", "main");
  const code = `const fs=require('node:fs');const cp=require('node:child_process');const root=${JSON.stringify(root)};fs.writeFileSync(root+'/README.md','concurrent user edit');cp.execFileSync('git',['add','README.md'],{cwd:root});fs.mkdirSync('dist',{recursive:true});fs.writeFileSync('dist/index.html','checked output');`;
  put(root, "tools/build.cjs", code);
  await assert.rejects(publishBlog(root, { dryRun: true }), /其他改动/u);
  assert.equal(git(remote, "rev-parse", "main"), before);
  assert.equal(git(root, "show", ":README.md"), "concurrent user edit");
});
