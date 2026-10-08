---
illustration_id: 01
type: comparison
style: minimal-flat-technical
language: zh-CN
---

Use case: scientific-educational
Asset type: explanatory raster illustration embedded in a Chinese digital verification blog.
STYLE: Precise, restrained flat technical diagram. Pure white background, fine dark slate linework, a small number of softly filled boxes. Crisp computer typeset simplified Chinese headings and sans-serif labels; English signal names use a legible technical font. Large labels, strong hierarchy, clean composition with generous white space. No photorealistic objects, people, decoration, gradients, shadows, watermark, logo, or code screenshot. The final image is a finished raster diagram, not SVG source or a mockup. Keep all labels readable when displayed at 736px width.
COLORS: White #FFFFFF; dark ink #29343A; semantic blue #3B708E and teal #397F79; pale blue #EDF4F7 and pale teal #EDF6F3; muted amber #B17A30 only for risks. Color names and hex values are rendering guidance only: NEVER print them on the canvas.
ASPECT: landscape 3:2, aim for 1536×1024 pixels. Use 5–7% outer margins. All content inside the frame.

TITLE (verbatim): 四态逻辑与未知态检查

ZONES / STRUCTURE:
左右两栏。左栏四个大格标记 0、1、X、Z；0/1 是确定逻辑，X 是未知，Z 是高阻。右栏用两条判断路径比较：a > b 得到 X 时，if 条件走 else；使用 (a > b) !== 1'b0 时，X 明确进入 error。图内不排长代码。

LABELS:
四态逻辑；0；1；X 未知；Z 高阻；a > b；X；if(X)；else；!==；error
Only use these exact concise labels, plus the explicitly specified formulas and byte labels; do not invent additional technical claims.

TECHNICAL ACCURACY:
X 和 Z 不要混为一谈。仅显示给定比较示例，不概括成所有 X 都走 error。普通 if(X) 不进 true 分支。

Render the complete diagram with exact arrows, counts, values, and legible Chinese. Avoid dense prose. The caption is supplied outside the image, so do not render the full caption.
