---
illustration_id: 02
type: comparison
style: minimal-flat-technical
language: zh-CN
---

Use case: scientific-educational
Asset type: explanatory raster illustration embedded in a Chinese digital verification blog.
STYLE: Precise, restrained flat technical diagram. Pure white background, fine dark slate linework, a small number of softly filled boxes. Crisp computer typeset simplified Chinese headings and sans-serif labels; English signal names use a legible technical font. Large labels, strong hierarchy, clean composition with generous white space. No photorealistic objects, people, decoration, gradients, shadows, watermark, logo, or code screenshot. The final image is a finished raster diagram, not SVG source or a mockup. Keep all labels readable when displayed at 736px width.
COLORS: White #FFFFFF; dark ink #29343A; semantic blue #3B708E and teal #397F79; pale blue #EDF4F7 and pale teal #EDF6F3; muted amber #B17A30 only for risks. Color names and hex values are rendering guidance only: NEVER print them on the canvas.
ASPECT: landscape 3:2, aim for 1536×1024 pixels. Use 5–7% outer margins. All content inside the frame.

TITLE (verbatim): 句柄、浅拷贝与深拷贝

ZONES / STRUCTURE:
横向三个分隔栏。句柄赋值：src、dst 两个箭头指向同一个 packet，packet 指向一个 header。浅拷贝：src 指向 packet1，dst 指向 packet2，两 packet 箭头指向同一个 header。深拷贝：两条独立链 src→packet1→header1 和 dst→packet2→header2。用颜色区分句柄、外层对象、内层对象。

LABELS:
句柄赋值；浅拷贝；深拷贝；src；dst；packet；packet1；packet2；header；header1；header2
Only use these exact concise labels, plus the explicitly specified formulas and byte labels; do not invent additional technical claims.

TECHNICAL ACCURACY:
必须是三个对照栏；句柄赋值只有一个 packet 对象；浅拷贝有两个 packet 但只有一个共享 header；深拷贝两 packet 两 header。连线不能跨错栏。

Render the complete diagram with exact arrows, counts, values, and legible Chinese. Avoid dense prose. The caption is supplied outside the image, so do not render the full caption.
