---
illustration_id: 12
type: flowchart
style: minimal-flat-technical
language: zh-CN
---

Use case: scientific-educational
Asset type: explanatory raster illustration embedded in a Chinese digital verification blog.
STYLE: Precise, restrained flat technical diagram. Pure white background, fine dark slate linework, a small number of softly filled boxes. Crisp computer typeset simplified Chinese headings and sans-serif labels; English signal names use a legible technical font. Large labels, strong hierarchy, clean composition with generous white space. No photorealistic objects, people, decoration, gradients, shadows, watermark, logo, or code screenshot. The final image is a finished raster diagram, not SVG source or a mockup. Keep all labels readable when displayed at 736px width.
COLORS: White #FFFFFF; dark ink #29343A; semantic blue #3B708E and teal #397F79; pale blue #EDF4F7 and pale teal #EDF6F3; muted amber #B17A30 only for risks. Color names and hex values are rendering guidance only: NEVER print them on the canvas.
ASPECT: landscape 3:2, aim for 1536×1024 pixels. Use 5–7% outer margins. All content inside the frame.

TITLE (verbatim): APB：Setup 与 Access

ZONES / STRUCTURE:
三个大状态框：IDLE、SETUP、ACCESS。IDLE→SETUP→ACCESS。ACCESS 有等待自环 PREADY=0；PREADY=1 时有两条离开箭头：无后续访问→IDLE，有后续访问→SETUP。SETUP 框内 PSEL=1 / PENABLE=0；ACCESS 框内 PSEL=1 / PENABLE=1；IDLE 框内 PSEL=0 / PENABLE=0。底部在 ACCESS 内高亮完成条件 PSEL && PENABLE && PREADY。

LABELS:
IDLE；SETUP；ACCESS；PSEL=0；PSEL=1；PENABLE=0；PENABLE=1；PREADY=0 等待；PREADY=1 完成；无后续访问；有后续访问
Only use these exact concise labels, plus the explicitly specified formulas and byte labels; do not invent additional technical claims.

TECHNICAL ACCURACY:
所示是本次被选中的目标接口的状态。SETUP 恰好一周期，ACCESS 可持续多周期。连续访问仍必须经过 SETUP，不能ACCESS直接跳下一笔ACCESS。地址/控制在等待期间稳定。

Render the complete diagram with exact arrows, counts, values, and legible Chinese. Avoid dense prose. The caption is supplied outside the image, so do not render the full caption.
