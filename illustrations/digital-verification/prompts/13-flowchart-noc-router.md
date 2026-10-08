---
illustration_id: 13
type: flowchart
style: minimal-flat-technical
language: zh-CN
---

Use case: scientific-educational
Asset type: explanatory raster illustration embedded in a Chinese digital verification blog.
STYLE: Precise, restrained flat technical diagram. Pure white background, fine dark slate linework, a small number of softly filled boxes. Crisp computer typeset simplified Chinese headings and sans-serif labels; English signal names use a legible technical font. Large labels, strong hierarchy, clean composition with generous white space. No photorealistic objects, people, decoration, gradients, shadows, watermark, logo, or code screenshot. The final image is a finished raster diagram, not SVG source or a mockup. Keep all labels readable when displayed at 736px width.
COLORS: White #FFFFFF; dark ink #29343A; semantic blue #3B708E and teal #397F79; pale blue #EDF4F7 and pale teal #EDF6F3; muted amber #B17A30 only for risks. Color names and hex values are rendering guidance only: NEVER print them on the canvas.
ASPECT: landscape 3:2, aim for 1536×1024 pixels. Use 5–7% outer margins. All content inside the frame.

TITLE (verbatim): 一笔 Flit 如何穿过 Router

ZONES / STRUCTURE:
上部短主线 Transaction→Packet→Flit。中部一个 Router 大框，内部左到右：Input Buffer→Route Compute→VC Allocation→Switch Allocation→Crossbar→Link。主线穿过 Router，右端为下一跳 Router。底部一条由下游返回上游的细线标 Credit，明确箭头反向。小脚注：典型流程，实际流水级可合并。

LABELS:
Transaction；Packet；Flit；Input Buffer；Route Compute；VC Allocation；Switch Allocation；Crossbar；Link；下一跳；Credit；典型 Router 流程
Only use these exact concise labels, plus the explicitly specified formulas and byte labels; do not invent additional technical claims.

TECHNICAL ACCURACY:
这是常见VC路由器示意，不声称所有Router固定六级。Credit 指下游空闲 buffer 信息反馈上游，与 flit 传输方向相反，不代表数据响应。主线上每阶段单向无乱连。

Render the complete diagram with exact arrows, counts, values, and legible Chinese. Avoid dense prose. The caption is supplied outside the image, so do not render the full caption.
