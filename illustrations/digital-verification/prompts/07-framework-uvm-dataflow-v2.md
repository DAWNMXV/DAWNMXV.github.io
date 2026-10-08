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
Main path on top: Sequence → Sequencer → Driver → Interface → DUT.
Put Sequence at far left. A thin dashed Agent rectangle encloses ONLY Sequencer, Driver, and Monitor. Interface is explicitly outside the Agent boundary on the right, adjacent to DUT. Place Monitor on a second row inside Agent. Interface signal observation is a clearly labeled connector from Interface DOWN and LEFT into Monitor. From Monitor exactly TWO outgoing transaction arrows go to Scoreboard and Coverage on the lower right, with one branching connector. Do NOT include a Reference Model or Expected/Actual arrows in this simplified diagram: these are explained separately in another illustration.
Use a two-row spacious architecture, with no overlapping boxes or arrows.

LABELS:
UVM：从事务到引脚，再回到事务
Sequence; Sequencer; Driver; Agent; Interface; DUT; Monitor; Scoreboard; Coverage; 事务; 接口信号; 观测

TECHNICAL ACCURACY:
Agent contains only the 3 UVM components Sequencer, Driver, Monitor. Interface is a statically instantiated SV interface, outside the UVM Agent rectangle. Monitor observes interface signals, does not drive DUT. Scoreboard and Coverage are parallel consumers, not a pipeline. Exactly two Monitor outgoing branches, no duplicates. Driver-to-DUT path goes through Interface. No other components, no extra connections, no Reference Model.
