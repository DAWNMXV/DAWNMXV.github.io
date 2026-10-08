---
illustration_id: 10
type: infographic
style: minimal-flat-technical
language: zh-CN
---

Use case: scientific-educational
Asset type: explanatory raster illustration embedded in a Chinese digital verification blog.
STYLE: Precise, restrained flat technical diagram. Pure white background, fine dark slate linework, a small number of softly filled boxes. Crisp computer typeset simplified Chinese headings and sans-serif labels; English signal names use a legible technical font. Large labels, strong hierarchy, clean composition with generous white space. No photorealistic objects, people, decoration, gradients, shadows, watermark, logo, or code screenshot. The final image is a finished raster diagram, not SVG source or a mockup. Keep all labels readable when displayed at 736px width.
COLORS: White #FFFFFF; dark ink #29343A; semantic blue #3B708E and teal #397F79; pale blue #EDF4F7 and pale teal #EDF6F3; muted amber #B17A30 only for risks. Color names and hex values are rendering guidance only: NEVER print them on the canvas.
ASPECT: landscape 3:2, aim for 1536×1024 pixels. Use 5–7% outer margins. All content inside the frame.

TITLE (verbatim): 128-bit AXI：非对齐的五拍字节映射

ZONES / STRUCTURE:
一张易读 5 行×16 列 byte lane 矩阵，列从左到右 lane0 至 lane15，每四列一组。每行前有地址，后有 WSTRB。第1行 0x1001：仅 lane1,2,3 着色，WSTRB 000E；第2行 0x1004：lane4,5,6,7 着色，WSTRB 00F0；第3行 0x1008：lane8,9,10,11 着色，WSTRB 0F00；第4行 0x100C：lane12,13,14,15 着色，WSTRB F000；第5行 0x1010：lane0,1,2,3 着色，WSTRB 000F。顶端条件 128-bit bus / AWSIZE=2 / INCR。不要在格内挤小字。

LABELS:
128-bit bus；AWSIZE=2；INCR；lane0–15；0x1001；0x1004；0x1008；0x100C；0x1010；000E；00F0；0F00；F000；000F；WSTRB
Only use these exact concise labels, plus the explicitly specified formulas and byte labels; do not invent additional technical claims.

TECHNICAL ACCURACY:
第一拍只有 3 个有效字节，之后每拍 4 字节。第5拍已是下一个 16-byte 总线字。着色格和十六进制掩码必须一一对应；列的左右顺序必须 lane0 在左，图说明是 lane 索引图，不是二进制数字书写顺序。

Render the complete diagram with exact arrows, counts, values, and legible Chinese. Avoid dense prose. The caption is supplied outside the image, so do not render the full caption.
