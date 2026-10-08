---
illustration_id: 09
type: framework
style: minimal-flat-technical
language: zh-CN
---

Use case: scientific-educational
Asset type: explanatory raster illustration embedded in a Chinese digital verification blog.
STYLE: Precise, restrained flat technical diagram. Pure white background, fine dark slate linework, a small number of softly filled boxes. Crisp computer typeset simplified Chinese headings and sans-serif labels; English signal names use a legible technical font. Large labels, strong hierarchy, clean composition with generous white space. No photorealistic objects, people, decoration, gradients, shadows, watermark, logo, or code screenshot. The final image is a finished raster diagram, not SVG source or a mockup. Keep all labels readable when displayed at 736px width.
COLORS: White #FFFFFF; dark ink #29343A; semantic blue #3B708E and teal #397F79; pale blue #EDF4F7 and pale teal #EDF6F3; muted amber #B17A30 only for risks. Color names and hex values are rendering guidance only: NEVER print them on the canvas.
ASPECT: landscape 3:2, aim for 1536×1024 pixels. Use 5–7% outer margins. All content inside the frame.

TITLE (verbatim): AXI 的五条通道

ZONES / STRUCTURE:
左为 Manager/Master，右为 Subordinate/Slave。恰好五条 payload 箭头，顺序 AW、W、B、AR、R。AW/W/AR 指向右；B/R 指向左。AW 标写地址，W 标写数据，B 标写响应，AR 标读地址，R 标读数据。用线颜色分写事务与读事务。底部独立小格：传输成立 VALID && READY；等待时 VALID 与 payload 保持。

LABELS:
Manager / Master；Subordinate / Slave；AW 写地址；W 写数据；B 写响应；AR 读地址；R 读数据；VALID && READY；通道独立握手
Only use these exact concise labels, plus the explicitly specified formulas and byte labels; do not invent additional technical claims.

TECHNICAL ACCURACY:
恰好五条通道，payload 箭头方向必须正确。箭头仅表示 payload 方向，不意味着 READY 同向，脚注写 READY 反向。AW 与 W 的相对到达顺序不固定。不要画 WID，题目为 AXI4。

Render the complete diagram with exact arrows, counts, values, and legible Chinese. Avoid dense prose. The caption is supplied outside the image, so do not render the full caption.
