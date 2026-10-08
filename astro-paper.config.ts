import { defineAstroPaperConfig } from "./src/types/config";

export default defineAstroPaperConfig({
  site: {
    url: "https://dawnmxv.github.io/",
    title: "DAWNMX",
    description: "随笔、诗歌与技术笔记。",
    author: "DAWNMXV",
    profile: "https://github.com/DAWNMXV",
    ogImage: "default-og.webp",
    lang: "zh-CN",
    timezone: "Asia/Shanghai",
    dir: "ltr",
  },
  posts: {
    perPage: 10,
    perIndex: 8,
    scheduledPostMargin: 0,
  },
  features: {
    lightAndDarkMode: true,
    dynamicOgImage: false,
    showArchives: true,
    showBackButton: false,
    editPost: {
      enabled: false,
    },
    search: "pagefind",
  },
  socials: [{ name: "github", url: "https://github.com/DAWNMXV" }],
  shareLinks: [],
});
