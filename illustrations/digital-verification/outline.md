# 数字验证问答配图

每篇 2 张，共 16 张。使用内置 imagegen，白底与蓝绿强调色，全部为原创的解释示意。PNG 原图保存在本地 output/illustrations/digital-verification/，网站使用 WebP。

## 01 · 四态逻辑与未知态检查
文章：`dv-sv-basics`。插入「如何避免把 X/Z 误判为检查通过？」的答案之后。

四态比较可能得到 X；用 case inequality 可以把未知结果明确判为检查失败。

- [提示词](prompts/01-comparison-four-state.md)
- [网站图片](https://dawnmxv.github.io/images/digital-verification/dv-sv-basics/four-state.webp)

## 02 · 句柄、浅拷贝与深拷贝
文章：`dv-sv-basics`。插入「句柄赋值、浅拷贝和深拷贝的区别」的答案之后。

判断深浅拷贝，要看内部对象是否共享，不能只看外层对象有没有重新创建。

- [提示词](prompts/02-comparison-object-copy.md)
- [网站图片](https://dawnmxv.github.io/images/digital-verification/dv-sv-basics/object-copy.webp)

## 03 · 同一时间槽里的关键调度区
文章：`dv-simulation-concurrency-sva`。插入「SVA 在哪里采样、在哪里求值？」的答案之后。

SVA 的采样和求值分处不同区域，NBA 更新不会改变本次已采样的值。图中省略了部分区域及迭代。

- [提示词](prompts/03-timeline-event-regions.md)
- [网站图片](https://dawnmxv.github.io/images/digital-verification/dv-simulation-concurrency-sva/event-regions.webp)

## 04 · Fork 的三种等待方式
文章：`dv-simulation-concurrency-sva`。插入「Fork/Join 的进程语义」的答案之后。

join、join_any、join_none 改变父进程的等待条件；join_any 本身不会终止其余子进程。

- [提示词](prompts/04-comparison-fork-join.md)
- [网站图片](https://dawnmxv.github.io/images/digital-verification/dv-simulation-concurrency-sva/fork-join.webp)

## 05 · 建立时间与保持时间看两条路径
文章：`dv-rtl-timing-cdc`。插入「Setup/Hold 的完整约束、Skew 与修复」的答案之后。

Setup 看最大路径，Hold 看最小路径；图中采用 t_skew = t_capture − t_launch，省略 uncertainty 等裕量。

- [提示词](prompts/05-framework-setup-hold.md)
- [网站图片](https://dawnmxv.github.io/images/digital-verification/dv-rtl-timing-cdc/setup-hold.webp)

## 06 · CDC 结构按信号类型选择
文章：`dv-rtl-timing-cdc`。插入「不同类型的 CDC 应该采用什么结构？」的答案之后。

跨域方案取决于传递的是电平、事件还是多 bit 数据。两级同步器不能代替总线握手或异步 FIFO。

- [提示词](prompts/06-framework-cdc-selection.md)
- [网站图片](https://dawnmxv.github.io/images/digital-verification/dv-rtl-timing-cdc/cdc-selection.webp)

## 07 · UVM：从事务到引脚，再回到事务
文章：`dv-uvm-platform`。插入「SV、UVM 与平台组件的完整关系」的答案之后。

Driver 把事务转换为接口时序，Monitor 将实际信号还原为事务，再广播给 Scoreboard 与 Coverage。Interface 属于静态 SV 结构。

- [提示词](prompts/07-framework-uvm-dataflow-v2.md)
- [网站图片](https://dawnmxv.github.io/images/digital-verification/dv-uvm-platform/uvm-dataflow.webp)

## 08 · RAL 的三个值，分别在哪里
文章：`dv-uvm-platform`。插入「Actual、Mirrored、Desired 与 RAL API」的答案之后。

Actual 属于 DUT，Mirrored 与 Desired 属于模型。set() 改模型，update() 再按字段访问策略决定是否写入。

- [提示词](prompts/08-framework-ral-values.md)
- [网站图片](https://dawnmxv.github.io/images/digital-verification/dv-uvm-platform/ral-values.webp)

## 09 · AXI 的五条通道
文章：`dv-axi-protocol`。插入「读写为什么分别需要两条与三条通道？」的答案之后。

读事务使用 AR/R，写事务使用 AW/W/B。箭头表示 payload 方向，各通道的 READY 沿相反方向返回。

- [提示词](prompts/09-framework-axi-channels.md)
- [网站图片](https://dawnmxv.github.io/images/digital-verification/dv-axi-protocol/axi-channels.webp)

## 10 · 128-bit AXI：非对齐的五拍字节映射
文章：`dv-axi-protocol`。插入「128-bit 总线上，五拍非对齐传输如何映射？」的答案之后。

起始地址 0x1001 的第一拍只写 lane1～3；随后按 4 Byte 递增，跨过 16 Byte 总线字后回到低 lane。

- [提示词](prompts/10-infographic-axi-byte-lanes.md)
- [网站图片](https://dawnmxv.github.io/images/digital-verification/dv-axi-protocol/axi-byte-lanes.webp)

## 11 · 128 → 64：全宽传输的字节守恒
文章：`dv-bridge-ahb-apb`。插入「128→64 位宽转换是否一定拆拍？」的答案之后。

这是对齐全宽写的拆分示例；是否拆拍还取决于传输大小、地址和 WSTRB，不能只看物理总线位宽。

- [提示词](prompts/11-comparison-width-conversion.md)
- [网站图片](https://dawnmxv.github.io/images/digital-verification/dv-bridge-ahb-apb/width-conversion.webp)

## 12 · APB：Setup 与 Access
文章：`dv-bridge-ahb-apb`。插入「APB、AHB、AXI：简单访问、流水与事务并发」的答案之后。

SETUP 只持续一周期；ACCESS 中 PREADY 为 0 时继续等待，完成后下一笔访问仍要经过 SETUP。

- [提示词](prompts/12-flowchart-apb-states.md)
- [网站图片](https://dawnmxv.github.io/images/digital-verification/dv-bridge-ahb-apb/apb-states.webp)

## 13 · 一笔 Flit 如何穿过 Router
文章：`dv-noc-chi-bandwidth`。插入「一笔 Flit 穿过 Router 的完整过程」的答案之后。

Packet 拆成 Flit 后，经过缓存、路由计算、VC 分配、交换仲裁和转发。图为典型流程，实际实现可以合并流水级。

- [提示词](prompts/13-flowchart-noc-router-v2.md)
- [网站图片](https://dawnmxv.github.io/images/digital-verification/dv-noc-chi-bandwidth/noc-router.webp)

## 14 · 从理论峰值到实际带宽
文章：`dv-noc-chi-bandwidth`。插入「并行接口的峰值与实际带宽如何计算？」的答案之后。

128-bit、500 MHz、每周期最多一拍时，单方向峰值为 8 GB/s；若满宽有效握手占 80%，带宽为 6.4 GB/s。

- [提示词](prompts/14-infographic-bandwidth.md)
- [网站图片](https://dawnmxv.github.io/images/digital-verification/dv-noc-chi-bandwidth/bandwidth.webp)

## 15 · 参考模型如何参与结果比较
文章：`dv-soc-engineering`。插入「参考模型应该做到什么精度？」的答案之后。

参考模型根据输入和规格生成 Expected，输出观测提供 Actual；模型精度应由本次验证目标决定。

- [提示词](prompts/15-framework-reference-model.md)
- [网站图片](https://dawnmxv.github.io/images/digital-verification/dv-soc-engineering/reference-model.webp)

## 16 · RTL 通过、FPGA 失败：怎样分层定位
文章：`dv-soc-engineering`。插入「RTL 仿真通过但 FPGA 原型失败，怎么定位？」的答案之后。

先对齐输入与配置，再按等价检查结果缩小范围；等价通过后仍需检查时序、CDC、复位和实现条件。

- [提示词](prompts/16-flowchart-fpga-debug.md)
- [网站图片](https://dawnmxv.github.io/images/digital-verification/dv-soc-engineering/fpga-debug.webp)

