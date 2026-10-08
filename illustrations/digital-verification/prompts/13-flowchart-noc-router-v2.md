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
Two clean rows, with EXACTLY one single directed data path, no extra arrows.
TOP ROW: Transaction → Packet → Flit.
BOTTOM ROW, inside a thin rectangular Router boundary: Input Buffer → Route Compute → VC Allocation → Switch Allocation → Crossbar → Link.
Draw ONE bent connector from the top-row Flit, around the outside left margin, directly into Input Buffer. The flow exits Link on the right to a single next-hop Router box.
No credits, no return paths, no arrows to any other stage. The only diagram contents are the specified conversion and router path.

LABELS:
一笔 Flit 如何穿过 Router
Transaction; Packet; Flit; Router; Input Buffer; Route Compute; VC Allocation; Switch Allocation; Crossbar; Link; 下一跳; 典型 Router 流程

TECHNICAL ACCURACY:
This is a simplified typical VC router pipeline. Stages may be combined in actual implementations. Exactly one input into Input Buffer from Flit, and exactly one next-stage arrow between adjacent stages. No duplicated paths. No credit-feedback arrow: this diagram focuses only on forward data processing. Do not add unsupported annotations or hardware schematic pins.
