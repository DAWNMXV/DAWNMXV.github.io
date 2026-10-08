---
title: "数字验证问答（七）：NoC、CHI 与接口带宽"
pubDatetime: 2026-10-08T14:00:00+08:00
modDatetime: 2026-10-08T11:25:02.206Z
tags: ["数字验证","NoC","CHI"]
description: "路由、Flit、Credit、VC、一致性互联与高速接口的带宽和分层。"
ogImage: "https://dawnmxv.github.io/images/digital-verification/dv-noc-chi-bandwidth/noc-router.webp"
---

这篇是数字验证问答系列的第七篇，整理自我的复习笔记。路由、Flit、Credit、VC、一致性互联与高速接口的带宽和分层。

[查看系列目录](/series/digital-verification/)

<!-- dv-illustration-hint -->
<p class="technical-figure-hint">文中示意图可点击放大。</p>
<!-- /dv-illustration-hint -->

## 目录

## NoC、CHI 与一致性互联

Router、Flit、Credit、VC、前进性、乱序检查和原子事务。
### NoC、CHI 与 AMBA 的关系
从体系结构演进上看，可以把 AHB 理解成共享总线/逐 beat 流水思维，AXI 转向明确事务边界、独立通道和 outstanding，CHI 则进一步进入 packet 化、分布式 cache coherence 和 NoC 场景。CHI 不是 NoC 的替代品，NoC 也不是 CHI/AXI/PCIe 的替代品：AXI/CHI 更偏事务语义，NoC 更偏片上传输、路由和流控基础设施。现代 NoC 常见拓扑包括 Ring、Mesh、Torus、Tree/Fat-tree、Crossbar、Clos/Butterfly 和各种 Hybrid；真正的设计难点集中在 routing、credit/backpressure、buffer/VC、HOL blocking、deadlock/livelock、QoS/starvation、ordering/coherence、CDC、时序和 PPA，而不只是“把 packet 从 A 转到 B”。
### Endpoint、Router、坐标、Hop 与 Floor
在 NoC 中，`SRCCOORD` 表示源节点坐标，`DSTCOORD/DSCOORD` 表示目的节点坐标，用于描述 packet 从哪里发出、要送到哪里。Router 会根据目的坐标执行路由选择，例如二维 Mesh 中常见的 XY Routing。规则 Mesh 采用最短路径时，Hop 数通常为 `|src_x-dst_x| + |src_y-dst_y|`。
`Router` 是 NoC 中负责转发 packet/flit 的交换节点，典型功能包括路由计算、缓存/虚通道管理、仲裁和 Crossbar 转发；`Endpoint` 则是真正产生或消费事务的端点，例如 CPU、GPU、DMA、DDR Controller、NPU 等。两者要区分：Endpoint 是通信源/目的，Router 是中间转发节点，Endpoint 与 NoC Router 之间通常还会通过 Network Interface 进行协议转换。
`Hop` 表示 packet 从一个 Router 到相邻 Router 的一次跳转，是衡量 NoC 路径长度的基本单位。Hop 越多，通常意味着路径更长，并可能带来更高延迟和更多网络资源占用。
`Floor` 不是所有 NoC 都统一定义的标准术语，需要结合具体项目判断。它通常表示比 Router 坐标更高一级的拓扑层级、物理区域或 3D NoC 中的层，例如一个节点可以用 `{floor, router_coord, endpoint_id}` 来定位；也可能只是与芯片 floorplan 相关的物理区域概念。因此看到 `floor_id/src_floor/dst_floor` 等字段时，应以项目中的 packet header、拓扑定义或 RTL 代码为准。
### 一笔 Flit 穿过 Router 的完整过程
NoC 可以理解为片上“分组交换网络”：上层 AXI/CHI 等事务进入 Network Interface 后被封装成 Packet，再拆成 Flit，通过多个 Router 转发，最后在目的端重组。理解 NoC 时最重要的主线是：**一笔事务如何经过 Packetization → Routing → VC/Buffer → Flow Control → Arbitration → Crossbar/Link → Reassembly，最终正确到达目的端。** Router 是核心，典型内部过程包括输入缓存、路由计算、VC 分配、交换仲裁和 Crossbar 转发。确定性路由如 XY Routing 路径唯一，参考模型容易预测；自适应路由可能存在多个合法下一跳，因此验证时通常检查“实际选择是否属于合法集合”，而不是强制预测唯一输出。

<!-- dv-illustration: 13 -->
<figure class="technical-figure" data-illustration="13">
<img src="/images/digital-verification/dv-noc-chi-bandwidth/noc-router.webp" alt="一笔 Flit 如何穿过 Router" width="1536" height="1024" loading="lazy" decoding="async" />
<figcaption>Packet 拆成 Flit 后，经过缓存、路由计算、VC 分配、交换仲裁和转发。图为典型流程，实际实现可以合并流水级。</figcaption>
</figure>
<!-- /dv-illustration: 13 -->

### VALID/READY 与 Credit 为什么适用场景不同？
`VALID/READY` 和 Credit 是两种不同的流控模型。AXI 的 `VALID/READY` 是逐拍握手：发送方用 `VALID` 表示当前数据有效，接收方用 `READY` 表示当前能够接收，二者同时为 1 时完成一次 transfer。它并不低效；只要双方连续保持 `VALID=READY=1`，AXI 同样可以做到每周期一个 beat。AXI 之所以采用这种方式，是因为它主要定义通用的点到点接口，机制简单、灵活，接收端可以随时通过 `READY` 施加 backpressure；实际 SoC 还会通过 FIFO、register slice、skid buffer 等切断过长的握手路径，并不是让一根 READY 信号跨越整个系统。
Credit 流控则是接收端提前告诉发送端“我还有 N 个 Buffer，可以再收 N 个 flit”。发送方维护 `credit_count`，每发送一个消耗一个 credit，接收端释放 Buffer 后再返还 credit。它的核心是**资源预授权**，而不是逐拍询问是否可接收，因此更适合 CHI/NoC 这种多 Router、长流水、高频、packetized 的互连。Credit 与 VALID 也并不矛盾：Credit 决定“有没有资格发送”，VALID 仍可以表示“这一拍是否真的有有效 flit”；与 AXI 的区别主要是没有依赖远端 `READY` 对每一拍进行实时许可。可以概括为：**AXI 的 VALID/READY 更适合局部接口级流控，CHI 的 Credit 更适合网络级 Buffer 资源管理。**
### VC、Wormhole 与 Buffer 流控
NoC 的流控重点是 Buffer、Backpressure 和 Credit。Credit 本质上表示**下游还能接收多少个 Flit 的可用缓存额度**：发送一个 Flit 消耗一个 credit，下游释放 Buffer 后返回 credit；验证时不仅要检查 `0 <= credit <= depth` 和无 credit 时禁止发送，还要考虑 Flit 与 credit 的链路传播延迟，否则可能出现吞吐下降、重复/漏返 credit、Buffer overflow/underflow 等问题。Virtual Channel 是在同一物理链路上建立多个独立逻辑队列，并不是增加物理带宽；它可以降低 Head-of-Line Blocking，也可用于 QoS 和打破死锁。Wormhole Switching 允许一个 Packet 的不同 Flit 同时分布在多个 Router 中，因此缓存需求低、延迟小，但头 Flit 一旦阻塞，可能连带占用沿途资源。
### Deadlock、Livelock、Starvation 与 Forward Progress
NoC 的三个易混淆异常必须区分：**Deadlock** 是多个 Packet 占有资源并循环等待，根源是 Channel Dependency Graph 出现环；**Livelock** 是 Packet 一直移动但始终到不了目的地；**Starvation** 是网络整体仍在运行，但某条流长期抢不到资源。XY Routing 通过固定 X→Y 的资源依赖顺序避免形成循环依赖；自适应路由则常通过 Turn Restriction、Virtual Channel、Escape VC 等方法保证最终存在无死锁路径。因此 NoC 验证不仅要证明数据正确，还要验证 **forward progress**。
### NoC Scoreboard 如何处理合法乱序？
NoC 验证最大的特点是**不能把所有事务简单放进一个 FIFO scoreboard 顺序比较**。不同源、目的、ID、VC 或 ordering domain 的事务可能合法乱序，因此期望数据通常需要按 flow/ID/src/dst 等维度管理，只对规格要求有序的事务检查顺序。Packet/Flit 格式检查与端到端功能检查也应分层：局部 assertion/checker 检查 Head/Body/Tail、合法路由、grant/request、credit、overflow 等；end-to-end scoreboard 负责检查事务是否丢失、重复、数据错误或送错目的端。这样出现问题时能够定位到具体 Router/VC，而不是等最终 Packet 丢失后才报错。
### 流量场景、交叉覆盖与性能饱和
真正困难的 NoC 场景来自**并发和网络状态组合**。验证不能只发随机 Packet，而应主动制造 many-to-one、all-to-all、热点流量、多个输入竞争同一出口、长时间或随机 backpressure、多 VC 竞争、不同 priority/QoS 等情况。仲裁验证需要检查 grant one-hot、grant 必须对应有效请求、公平性和 starvation；若协议规定一个 Packet 获得通道后不可被其他 Packet 插入，还必须检查 Packet ownership。Coverage 也不能只覆盖 src、dst、packet length，而应重点做 `src×dst`、`input_port×output_port`、`VC×priority`、`packet_length×backpressure`、`route×congestion` 等状态交叉。
最终可以用三个层次概括 NoC 验证目标：**Correctness**——路由、数据、ordering 是否正确；**Safety**——不能丢包、重包、非法发送、Buffer 溢出或 credit 失衡；**Liveness**——不能 deadlock、livelock 或长期 starvation，事务最终必须能够前进。在这三项成立后，再验证 Latency、Throughput、QoS 和网络饱和特性。性能上要特别理解 injection rate 增大后，网络会从低负载的稳定延迟进入拥塞区，并在 saturation point 后出现排队和延迟快速上升。对验证工程师而言，最核心的学习重点是彻底理解 **Router 内一个 Flit 的完整生命周期，以及 Routing、VC、Buffer、Credit、Arbiter 之间如何共同决定它什么时候、从哪里被发送出去**。
### CHI Atomic 与 Far Atomic
CHI 的原子事务本质上是把一组 **Read-Modify-Write** 操作作为不可分割的整体执行，用于多个 RN/CPU/DMA 并发访问共享状态时避免竞争和更新丢失。CHI 没有“只读不改”的 `AtomicRead`；`AtomicLoad` 也不是普通原子读，而是“修改数据并返回修改前的旧值”。`AtomicStore` 修改但不返回旧值，`AtomicLoad` 修改并返回旧值，`AtomicSwap` 无条件替换并返回旧值，`AtomicCompare` 实现 CAS：只有原值等于 CompareData 时才写入 SwapData，否则不修改。因此严格说原子事务都具有修改意图，但 `AtomicCompare` 比较失败时实际不会产生修改。典型应用包括锁/信号量、共享计数器、引用计数、状态位 SET/CLR、任务队列索引和无锁数据结构等；判断是否需要原子操作的关键是：**多个请求者共享某个状态，并且后续修改依赖读取到的旧值。**
CHI 的 Far Atomic 进一步把这种操作“送到数据附近执行”。它不是把 CPU 的 CAS 指令发送给另一颗 CPU，而是 RN 发出包含地址、Atomic opcode、CompareData/SwapData 等信息的 CHI transaction，由靠近数据的 HN/SN/SLC 完成比较、修改和写回，再把旧值或完成响应返回 RN。传统做法更像“把数据取到 CPU → 本地计算 → 再写回”，Far Atomic 则是“把简单操作送到数据处”。这样在多个核频繁修改同一共享 Cache Line 时，可以减少 Cache Line 在各私有 Cache 间来回迁移以及 Exclusive 操作失败重试造成的一致性流量。需要注意，软件执行一条 CAS 指令并不保证微架构一定一一映射成一笔 CHI `AtomicCompare`，具体映射属于处理器实现。
### 安全属性为什么不能当作一致性属性？
安全属性和缓存一致性有关，但不是同一种属性。CHI 中 Secure/Non-secure 可近似理解为地址的一部分，即 `{Address, Security}` 共同决定访问的是哪个逻辑地址空间；缓存一致性在各自安全地址空间内部维护，而不能简单认为同一物理地址的 Secure 与 Non-secure 副本天然互相一致。因此 `NS` 是安全/地址空间属性，`MemAttr`、`SnpAttr` 等才描述内存和一致性相关行为，不要把“安全属性”直接等同于“缓存一致性属性”。
### 各种协议中的边界是不是同一种约束？
AHB、AXI、CHI、PCIe、DDR 中所谓的“边界”并不完全是同一种概念。AHB 规定 burst 不能跨 1KB，AXI 和 PCIe 常见的是 4KB 边界，本质上都是为了避免单个事务跨越地址译码、Slave 或页面边界，使互连、解码和资源管理更简单。CHI 已经转向面向 cache line 和一致性事务的 packet 化设计，通常以 64B cache line 等粒度工作，不再强调 AXI 那种长 burst；DDR 则是存储器接口，重点是 Channel/Rank/Bank/Row/Column、burst length、row boundary、bank conflict 等，不能简单问“DDR 是多少 KB 边界”。
### 路由无死锁结论的前提
XY 的无循环依赖结论依赖相应拓扑与资源模型；协议级资源还可能引入额外依赖，不能仅凭“使用 XY”宣称整个系统无死锁。
### 补充：公平性和 Forward Progress 的结论需要什么前提？
若目的端永远不接收，任何仲裁器都无法保证请求最终完成。因此检查“持续请求者在K周期内获服务”时，必须明确下游可接收、包长/占用有上限、优先级策略等前提。Round-Robin公平通常针对成功的服务机会，不自动等于固定墙钟周期上限。
仿真timeout可以发现当前场景停滞，但单次长时间未超时不能证明全状态空间无死锁。应结合资源依赖分析、局部assertion、压力场景，以及适用范围内的Formal性质。

## 速率、带宽与高速接口分层

单位换算、有效吞吐、SerDes、HBM、UCIe 与互联层级。
### 频率、传输率、bit/s 与 Byte/s 有什么区别？
高速接口中的“速率”和“带宽”本质上是在描述两个不同层次：**速率描述每秒发生多少次传输，带宽描述每秒真正能搬多少数据**。常见单位里，`MHz/GHz` 表示时钟周期数，`MT/s、GT/s` 表示每秒多少次 Transfer，`Gb/s、Tb/s` 表示每秒多少 bit，`GB/s、TB/s` 表示每秒多少 Byte。必须注意大小写：`1 Byte = 8 bit`，因此 `8 Gb/s = 1 GB/s`，`8 Tb/s = 1 TB/s`。其中 `MT/s` 的 `T` 是 **Transfer**，不是 Tera，例如 `3200 MT/s = 3.2×10^9 transfers/s`。
### 并行接口的峰值与实际带宽如何计算？
对于并行接口，理论峰值带宽的核心公式是：
`Bandwidth (bit/s) = Transfer Rate (transfer/s) × 每次传输位宽 (bit)`
若结果要换算成 Byte/s，再除以 8。例如 128-bit 总线、1000 MT/s：
`1000 × 10^6 × 128 / 8 = 16 × 10^9 Byte/s = 16 GB/s`
如果接口是“每个时钟传一次”，也可以写成：
`Bandwidth (bit/s) = Clock Frequency × 每周期传输次数 × Data Width`
例如 128-bit AXI、500 MHz，每周期最多完成一次数据握手，单方向理论峰值为 `8 GB/s`；若只有 80% 的周期发生有效 `VALID && READY` 握手，则实际数据带宽约为 `6.4 GB/s`。

<!-- dv-illustration: 14 -->
<figure class="technical-figure" data-illustration="14">
<img src="/images/digital-verification/dv-noc-chi-bandwidth/bandwidth.webp" alt="从理论峰值到实际带宽" width="1536" height="1024" loading="lazy" decoding="async" />
<figcaption>128-bit、500 MHz、每周期最多一拍时，单方向峰值为 8 GB/s；若满宽有效握手占 80%，带宽为 6.4 GB/s。</figcaption>
</figure>
<!-- /dv-illustration: 14 -->

### DDR 的 MT/s 为什么不等于时钟 MHz？
**时钟频率和 Transfer Rate 不一定相等。**典型例子是 DDR：DDR 在一个时钟周期的上升沿和下降沿各传一次，因此 `1600 MHz` 时钟对应 `3200 MT/s`。DDR4-3200 的“3200”表示 `3200 MT/s`，不是 3200 MHz。对于 64-bit 单通道：
`3200 MT/s × 64 bit / 8 = 25.6 GB/s`
### 串行接口为什么还要考虑调制和编码？
高速串行接口要区分 transfer rate、symbol rate（baud）和 bit rate。GT/s 的具体计数含义应按协议定义，不能一概当成 Gbaud，也不能仅看到 PAM4 就把标称 GT/s 再乘 2。NRZ 每符号携带 1 bit、PAM4 每符号携带 2 bit，是调制层面的关系；协议标称 transfer rate 可能已经按其定义计入这种差别。
例如 PCIe 6.0 使用 PAM4 达到 64 GT/s，其标称速率不能再因为 PAM4 而额外翻倍。参见 [PCI-SIG 对 PAM4 的说明](https://pcisig.com/blog/why-did-pcie%C2%AE-60-specification-adopt-pam4-there-are-many-reasons)。
计算有效载荷带宽时，先由具体规范确定每 lane 的原始 bit rate，再考虑 lane 数、编码、FEC、包头和实际利用率，最后换算 Byte/s。
### 多 lane 与全双工带宽如何计算？
另一个易混淆点是多 lane 和双向带宽。比如 16 lane、每 lane 单方向 `32 Gb/s`，聚合后的单方向原始带宽是：
`16 × 32 Gb/s = 512 Gb/s = 64 GB/s`
如果接口是全双工，收、发方向可以同时各达到 `64 GB/s`，有些资料会把两方向相加称为 `128 GB/s aggregate bandwidth`，但这并不意味着单方向可以达到 128 GB/s。因此看到“接口带宽”时，应确认它描述的是**单 lane 还是所有 lane、单方向还是双向汇总、理论物理速率还是有效载荷带宽**。
### SerDes：高速串行物理层技术
高速接口需要先按层级区分。**SerDes（Serializer/Deserializer）不是协议，而是一类高速串行物理层技术**：发送端把并行数据串行化，经少量高速差分 Lane 发送，接收端再完成均衡、CDR 时钟恢复和解串。PCIe、Ethernet、USB、SATA、CXL 等都大量依赖 SerDes。它的核心价值是用“少量引脚 + 极高单 Lane 速率”替代大量高速并行线，关键技术包括 PLL、CDR、FFE/Pre-emphasis、CTLE、DFE、Eye Diagram、Jitter 和 BER。Lane 可以理解为一条高速串行通道，PCIe x4/x8/x16 就是并行使用多条 Lane 增加总带宽。
### HBM：超宽并行接口与堆叠存储
**HBM（High Bandwidth Memory）与 PCIe/SerDes 的思路相反。** HBM 是 JEDEC 定义的高速存储器接口和堆叠 DRAM 技术，属于 DDR/LPDDR 一类，而不是普通高速串行协议。它通过 TSV、micro-bump、interposer 等 2.5D/3D 封装技术，用上千根短距离并行 I/O 获得巨大带宽，即“单 pin 速率不极端，但总线极宽”。不同代际的每 pin 速率与总线宽度不同，应按具体器件计算总带宽。不能拿 HBM 的 Gb/s/pin 和 PCIe 的 GT/s/lane 直接比较数字大小。
### UCIe、PCIe/CXL 与片内互联的层级
**UCIe（Universal Chiplet Interconnect Express）解决的是封装内 Chiplet 之间的 Die-to-Die 互联。** 可以粗略建立层级关系：AXI/CHI/NoC 主要负责一个 Die 内部的 IP 和缓存一致性互联；UCIe 负责一个 Package 内不同 Die/Chiplet 之间的连接；PCIe/CXL 更多负责芯片、设备或系统之间的高速互联；HBM 则负责 Memory Controller 与 HBM DRAM Stack 之间的高速存储连接。HBM 和 UCIe 可以同时出现在一个系统中，例如 `Compute Chiplet → UCIe → Memory/I/O Chiplet → HBM Controller/PHY → HBM Stack`，但这不等于“HBM 协议跑在 UCIe 上”。
速率应按所用标准版本查询，再区分每 lane/pin 速率、编码开销和总宽度。AXI、CHI、NoC 没有统一的固定协议速率，吞吐取决于频率、位宽、并发能力和利用率。
最容易混淆的一点是：**协议、PHY 技术、存储接口和片上互联不是同一层概念。** PCIe/CXL/UCIe 是互联标准，SerDes 是底层高速串行实现技术，HBM 是超宽并行高速存储接口，AXI/CHI/NoC 是片内互联体系。把它们放在“片内互联 → Chiplet 互联 → 芯片外互联 → 高速存储”这条层级链上理解，会比统一称为“高速接口”更准确。
### 带宽不足有哪些硬件和软件方案？
带宽不足时有两类基本解法：硬件上增加 DDR 带宽、增加片上 SRAM/cache/line buffer、优化 NoC/DDR QoS，让 ISP/NPU 少访问 DDR，代价是面积、功耗和复杂度增加；软件上通过 tiling、double buffering、DMA 调度和错峰访问削峰，成本低但可能增加 latency、降低峰值吞吐。

## 系列其他文章

- [第一篇：SystemVerilog 语言基础](/posts/dv-sv-basics/)
- [第二篇：仿真调度、并发与 SVA](/posts/dv-simulation-concurrency-sva/)
- [第三篇：数字设计、时序与 CDC](/posts/dv-rtl-timing-cdc/)
- [第四篇：UVM 验证平台](/posts/dv-uvm-platform/)
- [第五篇：AXI 协议](/posts/dv-axi-protocol/)
- [第六篇：Bridge 验证与 AHB/APB](/posts/dv-bridge-ahb-apb/)
- [第八篇：SoC 验证与工程工具](/posts/dv-soc-engineering/)
