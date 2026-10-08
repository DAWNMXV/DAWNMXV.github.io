---
illustration_id: 16
type: flowchart
style: minimal-flat-technical
language: zh-CN
---

Use case: scientific-educational
Asset type: explanatory raster illustration embedded in a Chinese digital verification blog.
STYLE: Precise, restrained flat technical diagram. Pure white background, fine dark slate linework, a small number of softly filled boxes. Crisp computer typeset simplified Chinese headings and sans-serif labels; English signal names use a legible technical font. Large labels, strong hierarchy, clean composition with generous white space. No photorealistic objects, people, decoration, gradients, shadows, watermark, logo, or code screenshot. The final image is a finished raster diagram, not SVG source or a mockup. Keep all labels readable when displayed at 736px width.
COLORS: White #FFFFFF; dark ink #29343A; semantic blue #3B708E and teal #397F79; pale blue #EDF4F7 and pale teal #EDF6F3; muted amber #B17A30 only for risks. Color names and hex values are rendering guidance only: NEVER print them on the canvas.
ASPECT: landscape 3:2, aim for 1536×1024 pixels. Use 5–7% outer margins. All content inside the frame.

TITLE (verbatim): RTL 通过、FPGA 失败：怎样分层定位

ZONES / STRUCTURE:
顶部问题框：RTL PASS / FPGA FAIL。下方第一步检查输入与配置一致，随后一个菱形 RTL↔网表等价？。左分支不通过：索引/X→综合语义→约束/工具；右分支通过：时序→CDC→复位/初始化→板级接口。底部两分支汇聚：最小复现 + 波形/日志 + 回归验证。每个分支是排查清单，不强制固定时序因果。

LABELS:
RTL PASS；FPGA FAIL；输入与配置一致；RTL↔网表等价？；不通过；通过；索引 / X；综合语义；约束 / 工具；时序；CDC；复位 / 初始化；板级接口；最小复现；回归验证
Only use these exact concise labels, plus the explicitly specified formulas and byte labels; do not invent additional technical claims.

TECHNICAL ACCURACY:
等价性通过不等于时序/CDC正确；不通过不自动证明工具bug。箭头仅排查路径，列表平行项，不应将所有故障当必然因果链。两个分支保持逻辑明确。

Render the complete diagram with exact arrows, counts, values, and legible Chinese. Avoid dense prose. The caption is supplied outside the image, so do not render the full caption.
