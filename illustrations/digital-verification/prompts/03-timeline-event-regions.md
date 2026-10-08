---
illustration_id: 03
type: timeline
style: minimal-flat-technical
language: zh-CN
---

Use case: scientific-educational
Asset type: explanatory raster illustration embedded in a Chinese digital verification blog.
STYLE: Precise, restrained flat technical diagram. Pure white background, fine dark slate linework, a small number of softly filled boxes. Crisp computer typeset simplified Chinese headings and sans-serif labels; English signal names use a legible technical font. Large labels, strong hierarchy, clean composition with generous white space. No photorealistic objects, people, decoration, gradients, shadows, watermark, logo, or code screenshot. The final image is a finished raster diagram, not SVG source or a mockup. Keep all labels readable when displayed at 736px width.
COLORS: White #FFFFFF; dark ink #29343A; semantic blue #3B708E and teal #397F79; pale blue #EDF4F7 and pale teal #EDF6F3; muted amber #B17A30 only for risks. Color names and hex values are rendering guidance only: NEVER print them on the canvas.
ASPECT: landscape 3:2, aim for 1536×1024 pixels. Use 5–7% outer margins. All content inside the frame.

TITLE (verbatim): 同一时间槽里的关键调度区

ZONES / STRUCTURE:
横向一条六阶段主线：Preponed→Active→NBA→Observed→Reactive→Postponed。每阶段下只有一个短注解：采样、RTL 执行、非阻塞更新、断言求值、断言动作、稳定观察。高亮 Preponed 与 Observed，用虚线把采样值传到求值框。底部独立细注记：简化主线，省略部分区域与迭代。

LABELS:
Preponed；Active；NBA；Observed；Reactive；Postponed；采样；RTL 执行；非阻塞更新；断言求值；断言动作；稳定观察；简化主线
Only use these exact concise labels, plus the explicitly specified formulas and byte labels; do not invent additional technical claims.

TECHNICAL ACCURACY:
这是简化示意，不声称完整调度表，不把 UVM 全部归到 Reactive。断言在 Observed 求值使用 Preponed 采样值，不使用 NBA 更新后的值。箭头表达常用顺序，不否认迭代。

Render the complete diagram with exact arrows, counts, values, and legible Chinese. Avoid dense prose. The caption is supplied outside the image, so do not render the full caption.
