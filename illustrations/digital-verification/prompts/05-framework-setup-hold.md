---
illustration_id: 05
type: framework
style: minimal-flat-technical
language: zh-CN
---

Use case: scientific-educational
Asset type: explanatory raster illustration embedded in a Chinese digital verification blog.
STYLE: Precise, restrained flat technical diagram. Pure white background, fine dark slate linework, a small number of softly filled boxes. Crisp computer typeset simplified Chinese headings and sans-serif labels; English signal names use a legible technical font. Large labels, strong hierarchy, clean composition with generous white space. No photorealistic objects, people, decoration, gradients, shadows, watermark, logo, or code screenshot. The final image is a finished raster diagram, not SVG source or a mockup. Keep all labels readable when displayed at 736px width.
COLORS: White #FFFFFF; dark ink #29343A; semantic blue #3B708E and teal #397F79; pale blue #EDF4F7 and pale teal #EDF6F3; muted amber #B17A30 only for risks. Color names and hex values are rendering guidance only: NEVER print them on the canvas.
ASPECT: landscape 3:2, aim for 1536×1024 pixels. Use 5–7% outer margins. All content inside the frame.

TITLE (verbatim): 建立时间与保持时间看两条路径

ZONES / STRUCTURE:
上部为 Launch DFF→组合逻辑→Capture DFF，两个时钟支路分别标 t_launch、t_capture。下部两张简洁公式卡：Setup 使用最大延迟，t_cq,max + t_pd,max + t_setup ≤ T + t_skew；Hold 使用最小延迟，t_cq,min + t_cd,min ≥ t_hold + t_skew。底部 t_skew = t_capture − t_launch，正 skew 对 setup 有利、对 hold 不利。

LABELS:
Launch DFF；组合逻辑；Capture DFF；Setup 最大路径；Hold 最小路径；t_skew = t_capture − t_launch；Setup；Hold
Only use these exact concise labels, plus the explicitly specified formulas and byte labels; do not invent additional technical claims.

TECHNICAL ACCURACY:
严格保持公式符号和 max/min。不要把两个条件画成同一个周期窗口。公式可用清晰数学排版，下标正确。图明确省略 uncertainty 等额外裕量。

Render the complete diagram with exact arrows, counts, values, and legible Chinese. Avoid dense prose. The caption is supplied outside the image, so do not render the full caption.
