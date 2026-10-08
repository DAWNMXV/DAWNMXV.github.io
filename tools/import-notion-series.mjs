import { readFileSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { createHash } from "node:crypto";
import { load } from "cheerio";

const root = resolve(import.meta.dirname, "..");
const groups = [
  {
    number: "一",
    slug: "dv-sv-basics",
    title: "SystemVerilog 语言基础",
    pages: ["01", "12", "15"],
    tags: ["数字验证", "SystemVerilog"],
    description: "类型、四态逻辑、面向对象、对象复制、数组与随机约束。",
  },
  {
    number: "二",
    slug: "dv-simulation-concurrency-sva",
    title: "仿真调度、并发与 SVA",
    pages: ["02", "14"],
    tags: ["数字验证", "SystemVerilog", "SVA"],
    description:
      "事件区域、断言采样、并发进程、Clocking Block 与 Driver 复位。",
  },
  {
    number: "三",
    slug: "dv-rtl-timing-cdc",
    title: "数字设计、时序与 CDC",
    pages: ["16", "03", "18"],
    tags: ["数字验证", "RTL", "CDC"],
    description: "RTL 设计题、建立与保持时间、异步 FIFO、低功耗与实现约束。",
  },
  {
    number: "四",
    slug: "dv-uvm-platform",
    title: "UVM 验证平台",
    pages: ["13", "04", "05", "22"],
    tags: ["数字验证", "UVM"],
    description:
      "Phase、Objection、Factory、Config DB、TLM、Sequence、Monitor 与 RAL。",
  },
  {
    number: "五",
    slug: "dv-axi-protocol",
    title: "AXI 协议",
    pages: ["06", "07", "08"],
    tags: ["数字验证", "AXI"],
    description: "通道与 Burst、地址与 WSTRB、Outstanding、顺序与原子访问。",
  },
  {
    number: "六",
    slug: "dv-bridge-ahb-apb",
    title: "Bridge 验证与 AHB/APB",
    pages: ["09", "10"],
    tags: ["数字验证", "AXI", "AHB", "APB"],
    description: "位宽转换、VIP 验证、检查与覆盖，以及 AHB、AHB-Lite 和 APB。",
  },
  {
    number: "七",
    slug: "dv-noc-chi-bandwidth",
    title: "NoC、CHI 与接口带宽",
    pages: ["17", "11"],
    tags: ["数字验证", "NoC", "CHI"],
    description: "路由、Flit、Credit、VC、一致性互联与高速接口的带宽和分层。",
  },
  {
    number: "八",
    slug: "dv-soc-engineering",
    title: "SoC 验证与工程工具",
    pages: ["19", "20", "21"],
    tags: ["数字验证", "SoC", "工程工具"],
    description:
      "系统验证、参考模型、数值表示、嵌入式 C、Linux、Makefile 与仿真调试。",
  },
];
const digest = value => createHash("sha256").update(value).digest("hex");
const manifest = [];
const seriesPath = "/series/digital-verification/";

function convertProse(text) {
  return text
    .replace(/<mention-page[^>]*>[^<]*<\/mention-page>\s*/g, "")
    .replace(/<table_of_contents\s*\/>\s*/g, "")
    .replace(/\s*\{color="[^"]*"\}/g, "")
    .replace(/\$`([^`]+)`\$/g, "$$$1$")
    .replace(/^(#{2,5}) /gm, "$1# ")
    .replace(/<table\b[^>]*>[\s\S]*?<\/table>/g, table => {
      const $ = load(table, { xmlMode: true });
      const rows = $("tr")
        .toArray()
        .map(tr =>
          $(tr)
            .find("td")
            .toArray()
            .map(td =>
              $(td)
                .text()
                .trim()
                .replace(/(?<!\\)\|/g, "\\|")
                .replace(/\n/g, "<br>")
            )
        );
      if (!rows.length) throw new Error("Empty source table");
      const line = row => "| " + row.join(" | ") + " |";
      return (
        "\n\n" +
        [
          line(rows[0]),
          line(rows[0].map(() => "---")),
          ...rows.slice(1).map(line),
        ].join("\n") +
        "\n\n"
      );
    });
}

function convert(body, key) {
  // Protect code verbatim while translating Notion's surrounding markup.
  const blocks = [...body.matchAll(/^```([^\n]*)\n([\s\S]*?)^```\s*$/gm)];
  let result = "",
    offset = 0;
  for (const block of blocks) {
    result += convertProse(body.slice(offset, block.index));
    const code = block[2];
    let language = "text";
    if (
      /\b(uvm_|constraint\s|always_|fork\b|endclass|endtask|endfunction|rand\s|logic\s)/.test(
        code
      )
    )
      language = "system-verilog";
    if (
      key === "21" &&
      /^(cp |ln |grep |awk |sed |cd |pwd|find |rg )/m.test(code)
    )
      language = "bash";
    result += "```" + language + "\n" + code + "```\n";
    offset = block.index + block[0].length;
  }
  result += convertProse(body.slice(offset));
  return {
    body: result.trim(),
    codes: blocks.map(block => digest(block[2].replace(/\n$/, ""))),
  };
}

for (let index = 0; index < groups.length; index++) {
  const group = groups[index];
  const postTitle = `数字验证问答（${group.number}）：${group.title}`;
  const sections = [],
    questions = [],
    codes = [];
  for (const key of group.pages) {
    const source = JSON.parse(
      readFileSync(join(root, ".notion-cache", `${key}.json`), "utf8")
    );
    const sectionTitle = source.title.split("｜").slice(1).join("｜");
    const converted = convert(source.body, key);
    questions.push(
      ...[...source.body.matchAll(/^## (.+)$/gm)].map(match =>
        match[1].replace(/\\([\\*~`$\[\]<>{}|^])/g, "$1")
      )
    );
    codes.push(...converted.codes);
    sections.push(`## ${sectionTitle}\n\n${converted.body}`);
  }
  const date = "2026-10-08T14:00:00+08:00";
  const frontmatter = [
    "---",
    `title: ${JSON.stringify(postTitle)}`,
    `pubDatetime: ${date}`,
    `tags: ${JSON.stringify(group.tags)}`,
    `description: ${JSON.stringify(group.description)}`,
    "---",
  ].join("\n");
  const intro = `这篇是数字验证问答系列的第${group.number}篇，整理自我的复习笔记。${group.description}\n\n[查看系列目录](${seriesPath})\n\n## 目录\n\n`;
  const related = groups
    .filter(other => other !== group)
    .map(
      other => `- [第${other.number}篇：${other.title}](/posts/${other.slug}/)`
    )
    .join("\n");
  const content =
    frontmatter +
    "\n\n" +
    intro +
    sections.join("\n\n") +
    "\n\n## 系列其他文章\n\n" +
    related +
    "\n";
  writeFileSync(join(root, "src/content/posts", `${group.slug}.md`), content);
  manifest.push({
    title: postTitle,
    path: `posts/${group.slug}/`,
    description: group.description,
    sections: group.pages.length,
    questions,
    codeHashes: codes,
  });
}
writeFileSync(
  join(root, "notion-series-manifest.json"),
  JSON.stringify(manifest, null, 2) + "\n"
);
console.log(
  `Imported 22 topics into ${groups.length} articles, ${manifest.reduce((n, x) => n + x.questions.length, 0)} questions.`
);
