---
illustration_id: 11
type: comparison
style: minimal-flat-technical
language: zh-CN
---

Use case: scientific-educational
Asset type: explanatory raster illustration embedded in a Chinese digital verification blog.
STYLE: Precise, restrained flat technical diagram. Pure white background, fine dark slate linework, a small number of softly filled boxes. Crisp computer typeset simplified Chinese headings and sans-serif labels; English signal names use a legible technical font. Large labels, strong hierarchy, clean composition with generous white space. No photorealistic objects, people, decoration, gradients, shadows, watermark, logo, or code screenshot. The final image is a finished raster diagram, not SVG source or a mockup. Keep all labels readable when displayed at 736px width.
COLORS: White #FFFFFF; dark ink #29343A; semantic blue #3B708E and teal #397F79; pale blue #EDF4F7 and pale teal #EDF6F3; muted amber #B17A30 only for risks. Color names and hex values are rendering guidance only: NEVER print them on the canvas.
ASPECT: landscape 3:2, aim for 1536×1024 pixels. Use 5–7% outer margins. All content inside the frame.

TITLE (verbatim): 128 → 64：全宽传输的字节守恒

ZONES / STRUCTURE:
上部一条 16 格源数据条，按低地址到高地址从左到右标 b0 到 b15，分两色。中部 Bridge。下部两条 8 格输出，Beat 0 是 b0…b7，Beat 1 是 b8…b15。每个输出地址分别 0x1000 与 0x1008。上部条件对齐 16B 全宽写；下部条件 8B/beat。底部注记：窄传输不一定需要拆成两拍。

LABELS:
128-bit；64-bit；Bridge；16B 全宽写；8B/beat；Beat 0；Beat 1；0x1000；0x1008；b0–b15；窄传输另行判断
Only use these exact concise labels, plus the explicitly specified formulas and byte labels; do not invent additional technical claims.

TECHNICAL ACCURACY:
只演示对齐完整 16-byte full-width INCR 数据被转换为两个8-byte beat，不泛化所有128→64都拆拍。字节顺序保持。不要误示剩余 unused lane 必须写入，窄传输要看实际范围/WSTRB。

Render the complete diagram with exact arrows, counts, values, and legible Chinese. Avoid dense prose. The caption is supplied outside the image, so do not render the full caption.
