---
illustration_id: 07
type: framework
style: minimal-flat-technical
language: zh-CN
---

Use case: scientific-educational
Asset type: explanatory raster illustration embedded in a Chinese digital verification blog.
STYLE: Precise, restrained flat technical diagram. Pure white background, fine dark slate linework, a small number of softly filled boxes. Crisp computer typeset simplified Chinese headings and sans-serif labels; English signal names use a legible technical font. Large labels, strong hierarchy, clean composition with generous white space. No photorealistic objects, people, decoration, gradients, shadows, watermark, logo, or code screenshot. The final image is a finished raster diagram, not SVG source or a mockup. Keep all labels readable when displayed at 736px width.
COLORS: White #FFFFFF; dark ink #29343A; semantic blue #3B708E and teal #397F79; pale blue #EDF4F7 and pale teal #EDF6F3; muted amber #B17A30 only for risks. Color names and hex values are rendering guidance only: NEVER print them on the canvas.
ASPECT: landscape 3:2, aim for 1536×1024 pixels. Use 5–7% outer margins. All content inside the frame.

TITLE (verbatim): UVM：从事务到引脚，再回到事务

ZONES / STRUCTURE:
主驱动路径向右：Sequence→Sequencer→Driver→DUT。Driver 与 DUT 之间的小连接块为 Interface。DUT 输出另一路到 Monitor，再由 Monitor 广播到 Scoreboard 和 Coverage 两个分支。输入观测事务另一路到 Reference Model，Reference Model 的 Expected 和输出 Monitor 的 Actual 都进入 Scoreboard。Agent 用细虚线边框包住 Sequencer、Driver、Monitor，不包住 Sequence 或 DUT。布局宽松，最多两层连线。

LABELS:
Sequence；Sequencer；Driver；Interface；DUT；Monitor；Scoreboard；Coverage；Reference Model；Expected；Actual；Agent
Only use these exact concise labels, plus the explicitly specified formulas and byte labels; do not invent additional technical claims.

TECHNICAL ACCURACY:
Monitor 只观测接口，不驱动 DUT。Scoreboard 与 Coverage 是 Monitor 广播的并列消费者。Expected 来自 Reference Model，Actual 来自输出观测。不要把 Reference Model 画成输出 Monitor 的下游；输入观测到模型的线明确标输入事务。

Render the complete diagram with exact arrows, counts, values, and legible Chinese. Avoid dense prose. The caption is supplied outside the image, so do not render the full caption.
