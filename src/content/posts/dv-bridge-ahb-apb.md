---
title: "数字验证问答（六）：Bridge 验证与 AHB/APB"
pubDatetime: 2026-10-08T14:00:00+08:00
tags: ["数字验证","AXI","AHB","APB"]
description: "位宽转换、VIP 验证、检查与覆盖，以及 AHB、AHB-Lite 和 APB。"
---

这篇是数字验证问答系列的第六篇，整理自我的复习笔记。位宽转换、VIP 验证、检查与覆盖，以及 AHB、AHB-Lite 和 APB。

[查看系列目录](/series/digital-verification/)

## 目录

## AXI Bridge 与 VIP 验证

位宽转换、缓存、Slave responder、数据组织与交叉覆盖。
### 128→64 位宽转换是否一定拆拍？
AXI 窄传输的本质是：**总线物理位宽不变，但每个 transfer 的有效数据宽度由 **`AxSIZE`** 决定，再由地址决定有效数据落在哪些 byte lane 上。** 例如 Master 数据总线 128 bit、`AWADDR=0x04`、`AWSIZE=2`（4 Byte/beat）、`AWLEN=3`、INCR burst，则一共 4 个 transfer，地址依次为 `0x04、0x08、0x0C、0x10`。虽然每拍只传 32 bit 有效数据，但 `WDATA`仍然是 128 bit，分别落在 `[63:32]、[95:64]、[127:96]、[31:0]`，对应 `WSTRB=00F0、0F00、F000、000F`。如果经过 128→64 bit width converter，由于原 transfer 只有 32 bit，小于 64 bit Slave 总线宽度，所以**不需要拆拍，仍然是 4 个 32-bit transfer**，只是重新映射到 64-bit 总线的上下半部分，`WSTRB` 交替为 `F0、0F、F0、0F`。只有当单个 transfer 本身宽于 Slave 总线，例如 128-bit transfer 进入 64-bit Slave，才需要拆成多个 beat。这里最容易混淆的是：**窄传输 ≠ WDATA 物理位宽变窄，也 ≠ width converter 必然拆拍。**
### Narrow transfer 的 WSTRB 如何跨位宽重映射？
AXI 的 **narrow transfer** 是 `2^AxSIZE` 小于总线字节宽度的传输。例如 128-bit 总线有 16 个 byte lane，`AxSIZE=2` 表示每 beat 只有 4 Byte 有效，WDATA 仍然是 128 bit，但具体有效字节由 WSTRB 指示。例如地址 `0x1004` 时，有效的是 lane 4\~7，因此 `WSTRB=16'h00F0`。经过 128→64 Bridge 后，WSTRB 从 16 bit 变成 8 bit，但不能简单截取，而要根据**地址、AxSIZE 和下游总线宽度重新映射 byte lane**；同一例子在 64-bit 总线上对应 `WSTRB=8'hF0`。核心关系是：**AxSIZE 决定每 beat 有多少有效字节，地址决定这些字节所在的 lane，WSTRB 在写操作中进一步指示哪些 byte lane 真正写入。**
### 写拆分是否必须使用内部数据缓存？
Bridge 位宽转换需要明确“上游何时完成握手”与“数据由谁保持”。对 128→64 的拆分，如果 Bridge 已经接受上游 128-bit beat，上游之后可以更换数据，Bridge 就必须保存尚未送出的部分，或使用其他可靠存储。
如果设计把上游 READY 保持为低，直到两个下游 beat 都完成，则可以依靠上游在 VALID 未握手期间保持 WDATA/WSTRB，配合内部半拍进度状态完成拆分，不一定需要内部数据寄存器。代价是上下游耦合更强，吞吐和时序收敛可能更差，且必须检查 VALID/READY 依赖、重复发送和死锁。
因此，协议要求数据在被需要时保持有效，并不强制某一种缓存微架构。FIFO、skid buffer 或寄存器缓存常用于接收后解耦和处理 backpressure。该结论依据 [Arm AXI 的握手与信息保持规则](https://developer.arm.com/-/media/Arm%20Developer%20Community/PDF/IHI0022H_amba_axi_protocol_spec.pdf)，是否需要数据寄存器还取决于具体接收策略。
### 读合并为什么不能机械拼接高低半字？
64→128 读方向的合并原则同样是**按地址映射 byte lane，而不是机械地按“第一拍低 64、第二拍高 64”拼接**。16 Byte 对齐时，例如 `0x1000~0x1007` 通常进入 `RDATA[63:0]`，`0x1008~0x100F` 进入 `RDATA[127:64]`；如果起始地址存在 offset，则 Bridge 必须根据地址低位判断返回的 64-bit 数据属于哪个 128-bit 数据窗口、落在哪些 lane。特别是非对齐访问时，不能仅根据返回顺序拼接；读通道没有 RSTRB，有效 byte lane 需要根据 ARADDR、ARSIZE 和 burst 地址序列推导。
### VIP 的 outstanding 能力应如何配置？
验证 DUT 的 outstanding 能力时，Master VIP 的 outstanding 上限应至少覆盖 DUT 的设计上限。例如 DUT 支持 4 笔，而 VIP 最多只能产生 2 笔，那么 DUT 永远无法进入 3～4 笔未完成事务同时存在的状态，内部 FIFO 深度、ID 上下文保存、同 ID 顺序、不同 ID 乱序、满状态 backpressure、计数器边界等逻辑都会形成覆盖空洞。通常更合理的做法是让 VIP 能力 **≥ DUT 能力**，甚至略高，让 DUT 自己通过 READY/内部流控暴露其真实容量限制。
### 为什么单项覆盖率满了仍需要 cross coverage？
功能覆盖率中，普通 coverpoint 只确认单个变量的取值是否出现，而 **cross coverage 检查多个特征的组合是否出现**。即使 AxLEN 和地址对齐方式各自都是 100%，也可能从未测试过“长 burst + 非对齐地址”。在 AXI Bridge 中，这类交叉场景尤其容易暴露地址递增错误、byte lane/WSTRB 映射错误、64/128-bit 拆分与合并错位、少发或多发 beat、WLAST/RLAST 位置错误，以及接近 4KB 边界时的 burst 拆分问题。核心思想是：**单项覆盖证明功能点分别测过，cross 覆盖证明关键功能组合真正测过。**
### 二维 32-bit 数组怎样组织 64-bit Beat？
`data_array` 定义为二维的 32-bit 动态数组，而实际 AXI transaction 设置的是 64-bit/beat：
```system-verilog
rand bit [31:0] data_array[][];

tr.burst_size = svt_axi_transaction::BURST_SIZE_64BIT;
```

因此每一个 64-bit beat 需要两个 32-bit 的 `data_array` 元素拼接：
```text
tr.data[j][63:32] = data_array[i][j*2 + 1];
tr.data[j][31:0]  = data_array[i][j*2 + 0];
```

所以约束：
```text
foreach (data_array[i])
    data_array[i].size() == length_array[i] * 2;
```

表示第 `i` 笔 burst 如果有 `length_array[i]` 个 64-bit beat，就必须准备 `2 × length_array[i]` 个 32-bit 数据。例如 burst length=4，就需要 8 个 32-bit 元素。外层 `data_array.size()==sequence_length` 表示一共有多少笔事务，内层 `data_array[i].size()` 表示某一笔事务需要多少数据。
### Slave VIP 的响应字段是怎样变成总线信号的？
下面是简化 responder 的示意，其中 EXCLUSIVE→EXOKAY 不能代替 reservation 检查，完整 Exclusive 场景需要按第 08 页实现成功与失败路径：
```text
case (req_resp.atomic_type)
  NORMAL:    req_resp.bresp = OKAY;
  EXCLUSIVE: req_resp.bresp = EXOKAY;
  LOCKED:    req_resp.bresp = OKAY;
endcase
```

不是在“额外约束”响应，而是在告诉 Slave VIP 最终应该在 AXI B/R 通道上驱动什么。Slave monitor 取得 Master 请求后形成 `req_resp`，Slave sequence 决定 `BRESP/RRESP/RDATA`，然后 Slave driver 再把这些 transaction 字段转换成接口信号。协议本身无法根据请求自动判断一笔访问究竟应该返回 `OKAY`、`SLVERR`、`DECERR` 还是 `EXOKAY`，因为这些结果取决于 Slave 模型和测试场景，所以必须由 responder/sequence 明确设置。对于普通和 Locked transaction 返回 `OKAY` 是正常的；`EXOKAY` 是 Exclusive access 成功时使用的响应，不是 Locked transaction 的响应。
### FIXED Burst 的地址约束与 Reference Model
对于 FIXED burst，起始地址当然可以随机，VIP 也能正常发送，但应限制在 DUT 的合法地址空间，通常还要考虑传输大小对应的对齐要求。例如 64-bit beat 可以约束：
```text
foreach (addr_array[i]) {
    addr_array[i] inside {[32'h1000:32'h1FF8]};
    addr_array[i][2:0] == 3'b000;
}
```

不要简单把 32 位地址完全无约束随机，否则大量事务可能进入未映射区域而返回 `DECERR/SLVERR`。FIXED burst 的关键语义是每一个 beat 都访问同一个地址：
```text
FIXED，addr=0x1000，length=4

beat0 → 0x1000
beat1 → 0x1000
beat2 → 0x1000
beat3 → 0x1000
```

所以普通内存模型中，多拍 FIXED 写可能不断覆盖同一个位置，最后留下最后一拍的数据；它更典型的应用场景是 FIFO 或外设数据端口，而不是连续 RAM 地址访问。验证时 scoreboard/reference model 必须按照 FIXED 的同地址语义处理，不能把它当成 INCR。
### 检查与覆盖的分工
协议 checker 检查握手保持、beat 数、LAST、合法 lane、边界和 response 关联；reference model 按 byte 地址和写掩码建立期望值；scoreboard 检查转换后数据及顺序。
重点交叉：LEN×对齐、SIZE×位宽转换、WSTRB×地址低位、burst×背压、ID×outstanding、接近 4KB 边界×拆分。不能仅以“发送了这些参数”替代“总线实际达到场景”。
### 补充：覆盖率应采请求参数，还是实际总线行为？
两者用途不同。Sequence 参数覆盖回答“打算发什么”，monitor 基于真实握手的覆盖回答“DUT 实际接收和执行了什么”。例如目标是8 outstanding，就应覆盖监测到的pending峰值或状态，不能只覆盖max_outstanding配置等于8。
Cross 也要先定义合法组合。没有硬件支持的组合不应靠随机碰撞“补满”；确认规格后再说明排除理由。ignore_bins 用于不计入目标的组合，不能拿来掩盖仍需验证的场景。
一次覆盖缺口的处理顺序可以是：确认可达性→确认采样事件和bins正确→检查激励约束/流控→增加针对性测试→检查覆盖命中时功能checker是否通过。覆盖100%不能代替数据正确性、协议断言和异常恢复检查。

## AHB、AHB-Lite 与 APB

协议定位、流水、burst 边界、两拍 ERROR 和写掩码。
### APB、AHB、AXI：简单访问、流水与事务并发
APB、AHB、AXI 可以理解为 AMBA 体系中从“简单外设访问”到“高性能并发互连”的三个层次。APB 面向 UART、GPIO、Timer 等低速外设，一次传输主要经历 Setup 和 Access 两阶段，结构简单、功耗和面积低；AHB 面向 SRAM、DMA 等较高性能模块，核心改进是地址阶段和数据阶段流水，例如同一周期可以出现“上一笔的数据 + 下一笔的地址”，但对同一笔 transfer 永远是地址阶段先于数据阶段，不能先写数据再发地址；AXI 则进一步把读写拆成 AW、W、B、AR、R 五个独立 VALID/READY 通道，并支持 ID、multiple outstanding 和一定范围内的乱序，更适合 CPU、DDR、GPU、NPU、NoC 等高并发系统。最核心的演进主线可以概括为：**APB 强调简单，AHB 强调流水吞吐，AXI 强调事务并发和通道解耦。**
### AHB-Lite 相对 AHB 简化了什么？
AHB-Lite 可以看成 **AHB 的单 Master 简化版**。AHB 和 AHB-Lite 都保留地址/数据阶段流水、`HTRANS`、`HSIZE`、`HBURST`、`HREADY` 等核心传输机制；主要区别是 AHB-Lite 只允许一个 Master，因此删除了多 Master 仲裁相关的 `HBUSREQ/HGRANT/HMASTER` 等机制，同时不支持传统 AHB 中为多 Master 总线利用率服务的 `SPLIT/RETRY`，响应主要就是 `OKAY/ERROR`。所以 AHB-Lite 的“Lite”主要是**去掉多 Master 仲裁复杂度，而不是去掉 burst 或流水传输能力**。
### AHB INCR 为什么不需要预先声明长度？
AHB 的 `HBURST=INCR` 是未定长度 burst，Master 不需要事先声明总 beat 数。第一拍通常是 `NONSEQ`，后续是 `SEQ`；想结束时，在当前有效传输完成后把 `HTRANS` 切到 `IDLE`，或者直接用新的 `NONSEQ` 开始下一笔事务。`BUSY` 只表示暂时暂停，之后仍可继续当前 burst。AHB 能这么做，是因为它更接近逐 beat 推进的流水总线，每拍都有地址/控制信息。AXI 则要求事务开始时就通过 `AxLEN/AxSIZE/AxBURST` 明确长度和形式，因为 AXI 支持独立通道、多个 outstanding、ID、乱序等机制，互连和 Slave 需要提前知道事务边界，以便分配 buffer、维护 ordering、判断何时结束和何时返回 response。因此 AXI 不支持 AHB 那种“不知道什么时候结束”的 INCR，但支持单拍传输：`AxLEN=0` 就是一拍，不需要单独的 `SINGLE` 类型。
### AHB 的 ERROR 为什么需要两拍？
AHB 的 `ERROR` 响应需要占两个周期，核心原因是 AHB 采用地址阶段和数据阶段重叠的流水线结构：当前传输进入数据阶段时，Master 往往已经把下一笔传输的地址放到总线上。如果 Slave 此时才发现当前传输出错，就必须给 Master 留出一个周期来取消或改变已经提前发出的下一笔传输，否则可能在 Master 得知错误之前，下一笔地址就已经被接受。
两拍 ERROR 的含义不同。第一拍为 `HRESP=ERROR, HREADY=0`：Slave 已经通知 Master 当前传输出错，但由于 `HREADY=0`，这笔传输在协议意义上还没有结束，流水线被暂停，Master 可以据此把后续的 `HTRANS` 改成 `IDLE` 等，从而取消原本已经进入地址阶段的下一笔传输。第二拍为 `HRESP=ERROR, HREADY=1`：仍然表示当前传输的最终结果是 ERROR，同时 `HREADY=1` 表示当前数据阶段正式完成，因此这笔错误传输在这一拍才真正结束，总线之后才能继续处理新的有效传输。
最容易混淆的一点是：“两拍 ERROR”并不是错误被报告了两次，也不是第二拍重新执行一次数据传输。应把 `HRESP` 和 `HREADY` 分开理解：`HRESP` 表示“这笔传输的结果是什么”，`HREADY` 表示“当前数据阶段是否已经完成”。因此第一拍是“已经知道出错，但暂不结束”，第二拍才是“以 ERROR 结果正式结束当前传输”。正常 `OKAY` 不需要这种两拍处理，因为正常情况下允许流水线中的下一笔传输继续进行。
### AXI、AHB 与 APB 的写掩码有何区别？
写掩码要区分“地址/传输大小决定有效 lane”和“真正的 byte strobe”。传统 AHB/AHB-Lite 没有类似 AXI `WSTRB` 的任意字节掩码，只能通过 `HADDR + HSIZE` 选择连续有效 byte lane；较新的 AHB5 规范增加了可选 `HWSTRB`，才能进一步支持 byte-level sparse write。APB 则从 **APB4** 开始引入 `PSTRB`，一个 bit 对应 `PWDATA` 的一个 byte，因此可实现部分字节写和稀疏写；读操作不需要类似 strobe。可以统一记成：**AXI 有 **`WSTRB`**，APB4+ 有 **`PSTRB`**，较新的 AHB5 可选 **`HWSTRB`**。**
### 边界与提前结束
AHB burst 不应跨 1KB 边界。固定长度 burst 的提前结束必须符合规范定义的场景，不能因未定长 INCR 能灵活结束，就让 INCR4/8/16 或 WRAP4/8/16 任意停止。与 AXI 的比较详见第 06 页。

## 系列其他文章

- [第一篇：SystemVerilog 语言基础](/posts/dv-sv-basics/)
- [第二篇：仿真调度、并发与 SVA](/posts/dv-simulation-concurrency-sva/)
- [第三篇：数字设计、时序与 CDC](/posts/dv-rtl-timing-cdc/)
- [第四篇：UVM 验证平台](/posts/dv-uvm-platform/)
- [第五篇：AXI 协议](/posts/dv-axi-protocol/)
- [第七篇：NoC、CHI 与接口带宽](/posts/dv-noc-chi-bandwidth/)
- [第八篇：SoC 验证与工程工具](/posts/dv-soc-engineering/)
