---
illustration_id: 15
type: framework
style: minimal-flat-technical
language: zh-CN
---

Use case: scientific-educational
Asset type: explanatory raster illustration embedded in a Chinese digital verification blog.
STYLE: Precise, restrained flat technical diagram. Pure white background, fine dark slate linework, a small number of softly filled boxes. Crisp computer typeset simplified Chinese headings and sans-serif labels; English signal names use a legible technical font. Large labels, strong hierarchy, clean composition with generous white space. No photorealistic objects, people, decoration, gradients, shadows, watermark, logo, or code screenshot. The final image is a finished raster diagram, not SVG source or a mockup. Keep all labels readable when displayed at 736px width.
COLORS: White #FFFFFF; dark ink #29343A; semantic blue #3B708E and teal #397F79; pale blue #EDF4F7 and pale teal #EDF6F3; muted amber #B17A30 only for risks. Color names and hex values are rendering guidance only: NEVER print them on the canvas.
ASPECT: landscape 3:2, aim for 1536×1024 pixels. Use 5–7% outer margins. All content inside the frame.

TITLE (verbatim): 参考模型如何参与结果比较

ZONES / STRUCTURE:
左侧只有一个“输入接口”节点。主线：输入接口 → DUT → Output Monitor → Actual → Scoreboard。独立上支路：Input Monitor 以虚线观测输入接口，随后 Input Monitor → Reference Model → Expected → Scoreboard。Expected 与 Actual 是进入 Scoreboard 的两条不同箭头，不互相连接。Scoreboard 右侧只有一个 Match / Mismatch 结果框。底部三个可选精度标签：功能级、位精确、周期精确，并写按验证目标选择。Input Monitor 没有到 DUT 的驱动箭头。

LABELS:
输入事务；Input Monitor；Reference Model；Expected；DUT；Output Monitor；Actual；Scoreboard；Match / Mismatch；功能级；位精确；周期精确
Only use these exact concise labels, plus the explicitly specified formulas and byte labels; do not invent additional technical claims.

TECHNICAL ACCURACY:
参考模型必须独立从输入和规格生成期望，不从 DUT 输出反推出期望。DUT 的真实激励来自输入接口，Input Monitor 只是观测，不能画Monitor驱动DUT；下路起点明确画输入接口节点直接到DUT，上路从输入接口旁被Input Monitor观测到模型。

Render the complete diagram with exact arrows, counts, values, and legible Chinese. Avoid dense prose. The caption is supplied outside the image, so do not render the full caption.
