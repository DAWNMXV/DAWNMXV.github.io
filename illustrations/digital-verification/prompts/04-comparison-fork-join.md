---
illustration_id: 04
type: comparison
style: minimal-flat-technical
language: zh-CN
---

Use case: scientific-educational
Asset type: explanatory raster illustration embedded in a Chinese digital verification blog.
STYLE: Precise, restrained flat technical diagram. Pure white background, fine dark slate linework, a small number of softly filled boxes. Crisp computer typeset simplified Chinese headings and sans-serif labels; English signal names use a legible technical font. Large labels, strong hierarchy, clean composition with generous white space. No photorealistic objects, people, decoration, gradients, shadows, watermark, logo, or code screenshot. The final image is a finished raster diagram, not SVG source or a mockup. Keep all labels readable when displayed at 736px width.
COLORS: White #FFFFFF; dark ink #29343A; semantic blue #3B708E and teal #397F79; pale blue #EDF4F7 and pale teal #EDF6F3; muted amber #B17A30 only for risks. Color names and hex values are rendering guidance only: NEVER print them on the canvas.
ASPECT: landscape 3:2, aim for 1536×1024 pixels. Use 5–7% outer margins. All content inside the frame.

TITLE (verbatim): Fork 的三种等待方式

ZONES / STRUCTURE:
三行对照图，每行两个子任务 A、B 并行，A 的长度短，B 的长度长。join 的父进程继续标记在 B 结束之后；join_any 在 A 结束之后标记父进程继续，B 仍画到其结束；join_none 的父进程不等待子任务。底部特别注记：join_none 子进程在父进程阻塞或结束后启动。使用任务条，不画不准确的纳秒刻度。

LABELS:
join；join_any；join_none；任务 A；任务 B；父进程继续；等待全部；等待任一；不等待；其余仍运行
Only use these exact concise labels, plus the explicitly specified formulas and byte labels; do not invent additional technical claims.

TECHNICAL ACCURACY:
join_any 不会自动杀死其它子进程。join_none 不应画成子进程在父进程从未阻塞时已经启动。用独立抽象阶段图，不假装三个模式具有同一执行起点的精确波形。

Render the complete diagram with exact arrows, counts, values, and legible Chinese. Avoid dense prose. The caption is supplied outside the image, so do not render the full caption.
