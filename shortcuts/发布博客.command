#!/bin/zsh
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
task_blog_root="${0:A:h:h}"
cd "$task_blog_root" || exit 1
node tools/blog.mjs publish
task_blog_status=$?
echo ""
read -r "task_blog_exit?按回车关闭窗口…"
exit "$task_blog_status"
