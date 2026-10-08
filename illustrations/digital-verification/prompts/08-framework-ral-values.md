---
illustration_id: 08
type: framework
style: minimal-flat-technical
language: zh-CN
---

Use case: scientific-educational
Asset type: explanatory raster illustration embedded in a Chinese digital verification blog.
STYLE: Precise, restrained flat technical diagram. Pure white background, fine dark slate linework, a small number of softly filled boxes. Crisp computer typeset simplified Chinese headings and sans-serif labels; English signal names use a legible technical font. Large labels, strong hierarchy, clean composition with generous white space. No photorealistic objects, people, decoration, gradients, shadows, watermark, logo, or code screenshot. The final image is a finished raster diagram, not SVG source or a mockup. Keep all labels readable when displayed at 736px width.
COLORS: White #FFFFFF; dark ink #29343A; semantic blue #3B708E and teal #397F79; pale blue #EDF4F7 and pale teal #EDF6F3; muted amber #B17A30 only for risks. Color names and hex values are rendering guidance only: NEVER print them on the canvas.
ASPECT: landscape 3:2, aim for 1536×1024 pixels. Use 5–7% outer margins. All content inside the frame.

TITLE (verbatim): RAL 的三个值，分别在哪里

ZONES / STRUCTURE:
三个清晰分区：DUT 内一个 Actual 真实寄存器；软件模型内 Mirrored 认为的当前值、Desired 希望达到的值。set() 箭头仅指向 Desired，不穿过 DUT。update() 由模型向 DUT 的总线访问路径，标“按访问策略写入”。从 DUT 实际读取/总线观测经 Prediction 箭头更新 Mirrored。底部小注：普通 RW 字段示意；特殊访问策略需单独处理。

LABELS:
DUT；Actual 真实值；RAL 模型；Mirrored 记录值；Desired 目标值；set()；update()；Prediction；普通 RW 字段示意
Only use these exact concise labels, plus the explicitly specified formulas and byte labels; do not invent additional technical claims.

TECHNICAL ACCURACY:
set() 不访问 DUT。update() 不先读取 actual 比较。模型镜像不保证自动等于真实值；Prediction 才更新记录。用普通 RW 示意限定，不误导 W1C。不要画镜像值直接驱动硬件。

Render the complete diagram with exact arrows, counts, values, and legible Chinese. Avoid dense prose. The caption is supplied outside the image, so do not render the full caption.
