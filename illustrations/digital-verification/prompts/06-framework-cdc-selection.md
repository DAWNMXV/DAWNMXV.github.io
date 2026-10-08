---
illustration_id: 06
type: framework
style: minimal-flat-technical
language: zh-CN
---

Use case: scientific-educational
Asset type: explanatory raster illustration embedded in a Chinese digital verification blog.
STYLE: Precise, restrained flat technical diagram. Pure white background, fine dark slate linework, a small number of softly filled boxes. Crisp computer typeset simplified Chinese headings and sans-serif labels; English signal names use a legible technical font. Large labels, strong hierarchy, clean composition with generous white space. No photorealistic objects, people, decoration, gradients, shadows, watermark, logo, or code screenshot. The final image is a finished raster diagram, not SVG source or a mockup. Keep all labels readable when displayed at 736px width.
COLORS: White #FFFFFF; dark ink #29343A; semantic blue #3B708E and teal #397F79; pale blue #EDF4F7 and pale teal #EDF6F3; muted amber #B17A30 only for risks. Color names and hex values are rendering guidance only: NEVER print them on the canvas.
ASPECT: landscape 3:2, aim for 1536×1024 pixels. Use 5–7% outer margins. All content inside the frame.

TITLE (verbatim): CDC 结构按信号类型选择

ZONES / STRUCTURE:
2×2 卡片，每张一个明确结构。稳态单 bit：源信号→目的域 FF1→FF2。短脉冲/事件：展宽或 Toggle→同步→事件恢复，标记速率约束。低速多 bit：稳定数据总线和 req/ack 握手两条独立路径。连续数据：异步 FIFO，左右分别写时钟域、读时钟域。

LABELS:
稳态单 bit；2FF；短脉冲/事件；展宽 / Toggle；速率约束；低速多 bit；稳定数据 + 握手；连续数据；异步 FIFO；写时钟域；读时钟域
Only use these exact concise labels, plus the explicitly specified formulas and byte labels; do not invent additional technical claims.

TECHNICAL ACCURACY:
不能把多 bit 数据逐 bit 接 2FF 说成正确方案；2FF 是降低亚稳态传播概率，不是消除亚稳态；Toggle 有事件速率约束。四种图不要互连成同一流水线。

Render the complete diagram with exact arrows, counts, values, and legible Chinese. Avoid dense prose. The caption is supplied outside the image, so do not render the full caption.
