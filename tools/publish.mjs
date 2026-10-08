import { resolve } from "node:path";
import { publishBlog } from "./publish-blog.mjs";

const args = process.argv.slice(2);
const options = {};
for (let index = 0; index < args.length; index++) {
  const arg = args[index];
  if (arg === "--dry-run") options.dryRun = true;
  else if (arg === "--no-wait") options.wait = false;
  else if (arg === "--message" && args[index + 1])
    options.message = args[++index];
  else
    throw new Error(
      "用法：npm run publish [-- --dry-run | --no-wait | --message 描述]"
    );
}
try {
  await publishBlog(resolve(import.meta.dirname, ".."), options);
} catch (error) {
  console.error(`发布未完成：${error.message}`);
  process.exitCode = 1;
}
