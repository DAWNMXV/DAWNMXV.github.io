---
illustration_id: 14
type: infographic
style: minimal-flat-technical
language: zh-CN
---

Use case: scientific-educational
Asset type: explanatory raster illustration embedded in a Chinese digital verification blog.
STYLE: Precise, restrained flat technical diagram. Pure white background, fine dark slate linework, a small number of softly filled boxes. Crisp computer typeset simplified Chinese headings and sans-serif labels; English signal names use a legible technical font. Large labels, strong hierarchy, clean composition with generous white space. No photorealistic objects, people, decoration, gradients, shadows, watermark, logo, or code screenshot. The final image is a finished raster diagram, not SVG source or a mockup. Keep all labels readable when displayed at 736px width.
COLORS: White #FFFFFF; dark ink #29343A; semantic blue #3B708E and teal #397F79; pale blue #EDF4F7 and pale teal #EDF6F3; muted amber #B17A30 only for risks. Color names and hex values are rendering guidance only: NEVER print them on the canvas.
ASPECT: landscape 3:2, aim for 1536×1024 pixels. Use 5–7% outer margins. All content inside the frame.

TITLE (verbatim): 从理论峰值到实际带宽

ZONES / STRUCTURE:
上部三个因子组成等式：128 bit × 500 MHz × 1 transfer/cycle ÷ 8 = 8 GB/s，单方向 SDR AXI 数据通道。中部10个等宽周期格，8个着色并标握手，2个灰色标空闲，表达80%有效周期示例。下部大数字 8 GB/s × 80% = 6.4 GB/s。脚注：十进制 GB/s；每次握手传满128 bit；不含有效字节减少等额外影响。

LABELS:
128 bit；500 MHz；1 transfer/cycle；8 GB/s；80% 有效握手；6.4 GB/s；单方向；VALID && READY
Only use these exact concise labels, plus the explicitly specified formulas and byte labels; do not invent additional technical claims.

TECHNICAL ACCURACY:
8GB/s和6.4GB/s必须准确。80%是有效握手比例，不等于所有协议固定开销。图只计算满宽传输的单方向payload通道，不把读写带宽直接相加。10格恰好8实色2灰色。

Render the complete diagram with exact arrows, counts, values, and legible Chinese. Avoid dense prose. The caption is supplied outside the image, so do not render the full caption.
