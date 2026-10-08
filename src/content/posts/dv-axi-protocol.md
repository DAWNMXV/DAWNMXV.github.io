---
title: "数字验证问答（五）：AXI 协议"
pubDatetime: 2026-10-08T14:00:00+08:00
tags: ["数字验证","AXI"]
description: "通道与 Burst、地址与 WSTRB、Outstanding、顺序与原子访问。"
---

这篇是数字验证问答系列的第五篇，整理自我的复习笔记。通道与 Burst、地址与 WSTRB、Outstanding、顺序与原子访问。

[查看系列目录](/series/digital-verification/)

## 目录

## AXI：通道、Burst 与事务属性

握手、beat/transaction、响应、AXI4-Lite 与边界。
### AXI 协议与 SoC 互联拓扑有什么区别？
AXI 本质上是**点到点接口协议**，规定的是两个接口之间的信号含义、VALID/READY 握手和时序，而不是整个 SoC 的互联拓扑。多个 Master/Slave 如何仲裁、地址译码、路由，是 Interconnect/Crossbar/NoC 的职责。AXI 的高性能来自通道解耦和 outstanding：读写通道彼此独立，多笔 transaction 可以同时未完成；协议通过 ID 区分不同逻辑事务流。可以把一个物理 AXI Port 看成多个由 ID 划分的 logical ports：**同一 ID 的事务存在 ordering 约束，不同 ID 的事务通常允许乱序完成**。乱序指 transaction 之间的完成顺序，不代表一个 burst 内部的 beat 可以任意乱序。
### 读写为什么分别需要两条与三条通道？
AXI 读事务使用 **AR 读地址通道 + R 读数据通道**，写事务使用 **AW 写地址通道 + W 写数据通道 + B 写响应通道**。读操作中 Master 只需要通过 AR 告诉 Slave“从哪里、以什么 burst 和 size 读取”，数据由 Slave 从 R 通道返回；写操作则既要告诉 Slave“写到哪里”，又要提供“写什么数据”，所以地址和数据分别使用 AW、W 两个独立通道。AXI 各通道都采用 VALID/READY 握手：只有时钟沿上二者同时为 1 才完成一次传输；**VALID 不能依赖 READY**，否则双方都等待对方先拉高信号时可能产生死锁，而 READY 可以依赖 VALID。VALID 拉高后，在握手完成前 VALID 以及对应的地址、数据等 payload 必须保持稳定。
### Beat、Burst 和 Transaction 是什么关系？
AXI 中最容易混淆的是 `burst`、`beat`、`transaction` 和 `outstanding`。一笔完整 AXI 读/写 transaction 可以包含一个或多个数据 beat；完整 AXI 用 burst 机制描述这些 beat，因此 `AxLEN + 1` 就是该事务包含的 beat 数。`AxLEN=0` 表示只有 1 beat，可以理解为长度为 1 的 burst；`AxLEN=7` 表示 8-beat burst。`FIXED / INCR / WRAP` 描述的是同一 burst 内各 beat 地址如何变化。由此要特别注意：一个 16-beat burst 仍然只是一笔 transaction，并不是 16 笔 transaction。
Outstanding 统计未完成的 transaction，与一笔 burst 的 beat 数是不同维度。一个 256-beat burst 仍只算一笔事务；详细计数、ID 和乱序关系见第 08 页。
AXI4-Lite 则取消了 burst 能力，每笔 transaction 固定只有一个 data beat，所以没有 `AxLEN`、`AxBURST` 以及用于标识多 beat 结束的 `WLAST/RLAST`，通常称为 single-beat transfer / single-beat transaction，主要用于 CSR、控制寄存器等低带宽访问。完整 AXI 中则可以把单 beat 看作 burst length=1 的特殊情况。还要区分“没有 burst”和“没有并发能力”：burst 讨论的是“一笔事务内部有几个 beat”，outstanding 讨论的是“同时挂着几笔未完成事务”，两者不是同一概念。对于 AXI4-Lite，由于没有 AXI ID，若实现允许存在多笔未完成访问，也必须保证响应的顺序能够被正确对应，不能像完整 AXI 那样依赖 ID 进行任意乱序匹配。
### AxLEN、AxCACHE 与 AxPROT 分别表示什么？
AxLEN 使用的是 **N−1 编码**，实际 burst beat 数为 `AxLEN+1`，对 AXI4 INCR burst，8-bit AxLEN 用 `0~255` 正好表示 `1~256 beats`，既不浪费 0 编码，也便于硬件使用减计数器和零检测判断 burst 结束。AxCACHE 和 AxPROT 都属于地址通道上的事务属性：AxCACHE 描述缓存、buffer、allocate 等内存访问属性，AxPROT 描述特权/非特权、Secure/Non-secure、指令/数据访问等保护属性。单纯进行数据位宽转换并不会改变这些事务语义，因此 Bridge 通常直接继承或透传；只有跨协议、安全域或下游不支持相应属性时才需要映射。
### AW/W 解耦后，Slave 怎样关联数据？
AW 和 W 是独立通道，独立的是握手时序，不是事务逻辑。Master 内部生成一笔写事务时，本身已经知道地址、SIZE、LEN、BURST，因此即使 W 通道先于 AW 通道完成传输，它也已经能够根据地址计算出正确的 WDATA 布局和 WSTRB。问题只在于 Slave 此时可能还没通过 AW 通道拿到地址。Slave 可以选择暂时拉低 `WREADY`，等 AW 握手、拿到地址后再接收 W；也可以先把 WDATA/WSTRB 缓存在 FIFO 中，等 AW 到来后再匹配处理。因此不能理解成“W 先来了就没人知道它属于哪个地址”，而应理解成“Master 知道，只是 Slave 可能尚未收到对应 AW 信息”。
在 AXI4 中，W 通道没有 WID，因此不同写事务的 W burst 主要依靠事务顺序关联。假设先后接受 `AW1、AW2、AW3`，W 通道必须按对应事务顺序发送完整的 `W1 burst、W2 burst、W3 burst`，用 WLAST 标识每个 burst 的最后一个 beat，不能把不同写事务的数据 beat 任意穿插。AXI3 则曾经存在 WID，因此支持一定程度的 write data interleaving。写响应通道仍有 BID，用于把 BRESP 对应回 AWID。读通道则通过 `ARID→RID` 关联请求和返回数据，因此不同 ID 的读事务可以更灵活地乱序返回。
### 为什么写响应按事务返回，读响应逐 Beat 返回？
AXI 中写事务和读事务的响应机制并不对称。一次 write burst 是一个完整 transaction：`AW + N 个 W beat + 1 个 B response`，因此无论有多少个 W beat，整个 burst 最终只有一个 `BRESP`；B 表示的是整笔 write transaction 的完成状态，而不是某一个 W beat 的状态。读事务则是 `AR + N 个 R beat`，每个 R beat 本来就必须从 Slave 返回给 Master，因此可以直接在 `RDATA` 旁边携带 `RRESP`，每拍都给出该 beat 的读状态。B 如果设计成每 beat 返回并非做不到，也不一定直接降低吞吐；真正原因是 AXI 选择了 **write response 为 transaction-level completion** 的抽象，而 per-beat B 会额外增加反向 transfer、response buffer、beat tracking 和关联状态。RRESP 则是附着在本来就存在的 RDATA transfer 上，几乎不需要额外的传输机制。
### AXI 允许提前结束 Burst 吗？
关于 burst 提前结束，AXI 不支持 Early Burst Termination：`AxLEN` 在地址阶段已经声明了整笔 transaction 的 beat 数，后续必须按该长度完整完成，不能中途用 `WLAST` 提前结束。写事务如果后面不想真正修改数据，可以继续发送剩余 beat 并使用 `WSTRB=0` 屏蔽写入，但协议流程仍要走完。AHB 的 burst 模型不同，它是以连续 `NONSEQ/SEQ` transfer 组成 burst，并存在规范定义的 EBT 场景，例如 ERROR 或 interconnect 仲裁导致的提前终止；但这不等于固定长度的 `INCR4/8/16`、`WRAP4/8/16` 可以由 Master 任意中途停止。AHB 的 `INCR` 是不定长 burst，本身没有预先固定 beat 数。
### FIXED、INCR、WRAP 和提前终止
- FIXED：每拍地址不变，适合 FIFO/外设端口；写普通内存时可能反复覆盖同一位置。
- INCR：按传输大小推进地址；非对齐首拍的后续推进见第 07 页。
- WRAP：在对应 wrap 边界回绕，需满足协议对起始地址、长度和大小的限制。
AXI burst 不能跨 4KB 边界，不能用提前 WLAST 缩短已声明长度。后续写 beat 若不想修改数据，可在符合接口语义时以 WSTRB=0 继续完成剩余流程。
### 补充：WRAP 的长度、对齐与地址计算
WRAP burst 长度为 2、4、8 或 16 beats，首地址必须按每 beat 的传输大小对齐；首地址不必等于整个 wrap 窗口的起点。
```text
B = 2^AxSIZE                    // Byte/beat
N = AxLEN + 1
Window = B × N
WrapBase = floor(Start / Window) × Window
Addr(i) = WrapBase + ((Start - WrapBase + i×B) mod Window)

Start=0x1038，B=4，N=4，Window=16
WrapBase=0x1030
四拍：0x1038 → 0x103C → 0x1030 → 0x1034
```

这个例子说明“按 beat 对齐”和“从 wrap 边界起步”是两个要求，不能混为一谈。规则参考：[Arm AXI 规范](https://developer.arm.com/-/media/Arm%20Developer%20Community/PDF/IHI0022H_amba_axi_protocol_spec.pdf)。
### 补充：怎样检查 INCR 的 4KB 边界？
对合法的 INCR burst，先按传输大小对齐首地址，再算最后一拍可能覆盖的末字节：
```text
B = 2^AxSIZE，N = AxLEN+1
AlignedStart = floor(Start / B) × B
LastByte = AlignedStart + N×B - 1
要求 floor(Start / 4096) == floor(LastByte / 4096)
```

这里使用 AlignedStart 是为了处理非对齐首拍，不能无条件写 Start+N×B−1。例如 Start=0xFFF、B=4、N=1，只访问当前自然边界内剩余的0xFFF，不会因 SIZE=4Byte 就自动跨到下一页；若 N=2，后续拍到0x1000～0x1003，就跨界了。
Checker 的中间运算要扩位，避免地址溢出后错误判成同页。FIXED、WRAP 要按各自地址范围判断，不能套用 INCR 末地址公式。WSTRB=0 不会取消已声明的 burst 边界要求。

## AXI：地址、窄传输与 WSTRB

自然对齐、有效 byte lane、非对齐算例和部分读写。
### 地址的自然对齐边界如何计算？
AXI 地址是 **byte address**，对齐边界取决于每个 transfer 的字节数：`Bytes = 2^AxSIZE`，要求 `AxADDR % Bytes == 0` 才是自然对齐。例如 32-bit transfer = 4 Byte，因此 `0x1000/0x1004/...` 对齐，`0x1001/0x1002/0x1003` 非对齐。之前文档里“32-bit 地址边界要求能被 `0x20` 整除”的表述应理解为笔误，32 bit 应转换成 4 Byte，而不是 32 Byte。
### 物理位宽、传输大小与有效字节
AXI 的窄传输（Narrow Transfer）指的是：物理数据总线很宽，但一次 beat 实际只传其中一部分字节。真正决定“每个 beat 传多少字节”的不是 `WDATA` 位宽，而是 `AxSIZE`，每拍传输字节数为 `2^AxSIZE`。例如数据总线是 128 bit，即 16 Byte，如果 `AWSIZE=2`，每拍只传 4 Byte，因此这是 128-bit 总线上的 32-bit 窄传输。对于 INCR burst，beat 地址按传输大小递增，所以地址依次为 `0x1000、0x1004、0x1008、0x100C、0x1010...`，而不是因为总线是 128 bit 就每次加 `0x10`；只有 `AWSIZE=4`、每拍完整传 16 Byte 时，地址才会 `0x1000→0x1010`。
128-bit 总线包含 16 个 byte lane，`WSTRB[15:0]` 每一位对应 `WDATA` 中一个字节。窄传输时，当前 beat 地址落在哪些 byte lane，就决定数据放在 `WDATA` 的哪一段。以 `AWSIZE=2`、从 `0x1000` 开始的 INCR burst 为例：`0x1000~0x1003` 使用 lane0\~3，典型 `WSTRB=16'h000F`；下一拍地址 `0x1004`，使用 lane4\~7，`WSTRB=16'h00F0`；再下一拍 `0x1008` 使用 lane8\~11，`WSTRB=16'h0F00`；`0x100C` 使用 lane12\~15，`WSTRB=16'hF000`；到了 `0x1010` 进入下一个 16-Byte 总线字，重新回到 lane0\~3。也就是说，WSTRB 的“移动”本质上来自 beat 地址在物理总线 byte lane 中的位置变化。WSTRB 不是一个 burst 只发送一次，而是和 `WDATA` 一样，每个 W beat 都有一个独立的 WSTRB。需要注意，地址和 `AWSIZE` 决定本拍“允许使用”的 byte lane，而 WSTRB 决定其中哪些字节实际写入，因此部分写时 WSTRB 可以只使能合法 lane 中的一部分。读通道没有 RSTRB，因为 Master 可以由 `ARADDR + ARSIZE + ARBURST` 自己推导每拍哪一部分 `RDATA` 有效。
### WSTRB 与地址信息各负责什么？
`WSTRB` 的本质是写数据的 byte enable：`WSTRB[n]` 对应 `WDATA[8n+7:8n]`，为 1 表示该 byte lane 真正参与写入。它不是用来告诉 W 通道“这笔数据对应哪个地址”的。AXI 的 AW 和 W 是独立通道，AW 通道传输 `AWADDR/AWSIZE/AWLEN/AWBURST` 等地址和事务属性，W 通道只传 `WDATA/WSTRB/WLAST`。Master 在内部已经根据地址和 burst 信息计算好了每一拍应使用哪些 byte lane，再通过 `WSTRB` 告诉 Slave 哪些字节有效。因此应理解为“地址控制信息决定理论上的传输位置，WSTRB 表示这一拍实际写哪些字节”，而不是“W 通道根据 WSTRB 推算地址”。由于两个通道独立，W 甚至可能先于 AW 到达，Slave 或 Interconnect 需要负责正确缓冲和关联。
### 非对齐首拍为什么可能只有一个有效字节？
非对齐传输是指起始地址没有按照传输大小自然对齐，即 `AWADDR % (2^AWSIZE) != 0`。例如 `AWSIZE=2` 表示 4 Byte transfer，则 `0x1000/0x1004` 是对齐地址，`0x1001/0x1002/0x1003` 都是非对齐地址。非对齐与窄传输是两个不同概念：窄传输描述“每拍传输大小小于总线宽度”，非对齐描述“首地址没有落在该传输大小的自然边界上”，二者可以同时出现。
非对齐时尤其要注意：`AWSIZE=2` 并不意味着每个 beat 的 `WSTRB` 一定恰好有 4 个 `1`。例如 128 bit 总线、`AWADDR=0x1003`、`AWSIZE=2`、INCR burst，首拍从非对齐地址 `0x1003` 开始，到下一个 4 Byte 自然边界 `0x1004` 前只剩 1 Byte，因此首拍可能只有 byte lane 3 有效；之后地址进入对齐状态，下一拍从 `0x1004` 开始，可正常使用 4 个 byte lane。也就是说，`AWSIZE` 表示该 transfer 的最大字节跨度/传输规格，而 `WSTRB` 才表示这一拍实际写入的字节集合，非对齐首拍可能只使用其中一部分。
### 128-bit 总线上，五拍非对齐传输如何映射？
对于 `128-bit bus + 32-bit transfer + INCR + 起始地址 0x1001 + 5 beats`，这是同时具有 **narrow + unaligned**的传输。32-bit 即每拍最多 4 Byte，第一拍由于从 `0x1001` 开始，只能访问当前 4-Byte natural boundary 剩余的 `0x1001~0x1003`；之后恢复到自然边界，因此五拍分别为 `0x1001~0x1003`、`0x1004~0x1007`、`0x1008~0x100B`、`0x100C~0x100F`、`0x1010~0x1013`。在 128-bit 总线的 16 个 byte lane 上，对应 WSTRB 依次为 `16'h000E → 16'h00F0 → 16'h0F00 → 16'hF000 → 16'h000F`。所谓“WSTRB 滑动”，本质不是 WSTRB 自己存在特殊移位机制，而是随着 INCR 地址递增，有效 4-byte 窗口依次落到不同 byte lane，到 128-bit word 边界后重新回到低 lane。
### FIXED 和 INCR 的非对齐有什么区别？
`FIXED` burst 也存在对齐与非对齐的概念。是否非对齐取决于 `AxADDR` 是否满足 `2^AxSIZE` 的自然对齐，而不是取决于总线总宽度。例如 32-bit 总线，`AWADDR=0x02, AWSIZE=1` 表示 2 Byte/beat，0x02 对 2 Byte 是对齐的，可以使用 lane2\~3；若 `AWADDR=0x03, AWSIZE=1`，才是非对齐。FIXED 的关键是每个 beat 地址都不变，因此有效 byte lane 的范围也不随 beat 移动；非对齐 FIXED 并不是“什么都写不进去”，而是可能只能使用剩余的部分 byte lane，效率较低。与之相比，INCR burst 的第一拍可以非对齐，后续 beat 会进入相应的递增地址。FIXED 常见于 FIFO 等固定地址端口。
### 为什么部分写不应简单替换为多笔窄写？
AXI 写通道有 `WSTRB`，其本质是 **byte write enable**。`AWADDR + AWSIZE` 定义当前 beat 所覆盖的传输范围，而 `WSTRB` 可以在这个合法范围内进一步指定哪些 byte 真正被修改。例如 32-bit 总线、4B 写，`WSTRB=1010` 表示只更新其中两个 byte，另外两个保持原值。没有 `WSTRB` 并不是 Slave“不知道数据是不是填充”，而是默认该 transfer 范围内的 byte 都应当写入，无法表达“一拍宽数据中只修改部分 byte”。部分写当然也能拆成多笔 narrow write，例如两个独立的 1B 写，但这样会增加地址、响应、仲裁和 outstanding 资源开销，而且多笔事务和“一笔事务内部分写”在有副作用的 MMIO 场景下未必语义等价，所以 AXI 专门保留了 `WSTRB`。
### 为什么没有稀疏读掩码？MMIO 又有什么限制？
AXI 读则没有与 `WSTRB` 对称的 sparse-read mask。`ARADDR + ARSIZE` 描述的是一个连续的地址范围，AXI 本身不能表达“1010 这种只读间隔 byte”的单笔读事务。如果 Master 只关心其中部分数据，而目标是普通 RAM/DDR，可以直接读一个更宽的连续范围，例如读 `1111`，收到 `RDATA` 后在 Master 内部只取需要的 byte，其余丢弃；如果要求总线上真的不能访问其他 byte，例如 MMIO 中某些寄存器具有 read-clear、FIFO pop 等读副作用，就必须拆成多笔 narrow read。严格来说，如果 AXI 要支持稀疏读，理论上更像需要一个请求侧的 `ARSTRB`，而不是返回侧的 `RSTRB`，但 AXI 没有设计这种机制。

## AXI：Outstanding、顺序与原子访问

ID、乱序与交织、跨读写依赖、Exclusive 和 AXI3 Locked。
### Outstanding 统计 transaction 还是 beat？
AXI 中的 **Outstanding** 指“请求已经被对端接受，但事务尚未完成”的 transaction 数量。读事务通常以 `ARVALID && ARREADY` 计入 outstanding，以 `RVALID && RREADY && RLAST` 完成；写事务常以 AW 握手计入、以 `BVALID && BREADY` 完成。注意 outstanding 统计的是 **transaction/burst**，不是其中的 data beat。比如一笔 `ARLEN=3` 有 4 个 R beat，但直到 `RLAST` 握手才减少 1 个 read outstanding。
### 如何形成多笔 outstanding 并自动计数？
制造 outstanding 的本质是让“请求进入速度 \> 响应完成速度”：Master 连续快速发送多笔 AR/AW，同时 Slave 延迟 R/B response，就会积压多笔未完成事务。VIP 中配置 `max_outstanding=8` 通常表示最多允许同时存在 8 笔未完成 transaction；response delay 再大也不会无限增加，达到上限后 VIP 会通过停止继续发请求、降低 READY 或内部阻塞等方式限制深度，具体行为取决于 VIP 实现。波形上可直接统计：
`read_outstanding = AR握手次数 - RLAST握手次数`；
`write_outstanding ≈ AW握手次数 - B握手次数`。
验证环境中最好由 monitor/scoreboard 自动维护计数器并记录最大值，而不是只靠看波形。
### Outstanding、乱序与交织有什么区别？
**Outstanding、乱序和交织是三个不同概念。** Outstanding 表示同时挂着多少笔未完成事务；Out-of-order 表示不同 transaction 的完成顺序是否可以与请求顺序不同；Interleaving 表示不同 transaction 的 data beat 是否可以穿插。不同 ID 的事务可以乱序返回，例如请求顺序 `ID0→ID1→ID2`，返回可以是 `ID2→ID0→ID1`；同一 ID 也可以有多笔 outstanding，但必须保持该 ID 内的事务顺序。读通道可以利用 `RID` 区分不同事务的数据并进行不同 ID 间的数据交织。AXI3 写通道还有 `WID`，因此支持 write-data interleaving；AXI4 删除了 `WID`，不再支持 AXI3 式的写数据交织。所以“8 outstanding、write interleave depth=1”完全合理：可以挂 8 笔写事务，但一旦开始发送某一笔的 W 数据，就要把该 burst 发完再切换下一笔。
### ARID、RID、AWID、WID、BID 如何关联？
ID 标识的是一整笔 transaction 所属的逻辑流，同一 transaction 的所有 transfer 都必须归属于同一个 ID。读事务中 `ARID` 对应返回的 `RID`；AXI3 写事务中，同一事务的 `AWID = WID = BID`，其中 WID 表示当前 W beat 属于哪笔 AW，因此 AXI3 可以进行 write-data interleaving；AXI4 删除了 WID，也取消了写数据交织。注意 WID 并不是简单等于“最近一次 AWID”，而是等于**该 WDATA 所属事务的 AWID**。
### AXI3 与 AXI4 的写响应依赖有何差异？
AXI3 与 AXI4 写响应的关键差异是 B 通道的依赖关系。AXI3 要求写数据最后一拍已经完成后才能产生写响应，但协议并不强制 AW 地址此前已经握手；AXI4 则明确要求 **AW 已完成 + 所有 W 数据已完成**，之后才能产生 `BVALID`。因此 AXI4 中用 `AW handshake → outstanding++`、`B handshake → outstanding--` 很自然；AXI3 如果要严格统计协议意义上的 active write transaction，则不能无条件只看 AW/B，因为 write 可以从 leading W 或 AW 中先发生的那个开始，理论上 B 甚至可能早于 AW。实际 DUT 若额外保证 AW 一定先于 B，则仍然可以采用 AW/B 计数。无论 AXI3 还是 AXI4，都不能按每个 W beat 增加 outstanding，因为一个多拍 burst 仍然只是一笔 transaction。
### Outstanding 为什么不能忽略数据依赖？
Outstanding 的本质是允许多笔“已发出但尚未完成”的 transaction 同时存在，但 **outstanding 不等于可以忽略数据依赖**。RAR 通常没有数据 hazard；WAW、RAW、WAR 如果访问相同或重叠地址，就可能存在顺序依赖。AXI 的同 ID 顺序规则主要解决同方向事务的 ordering，例如同 ID 的 Read→Read、Write→Write；但读通道和写通道彼此独立，即使 `ARID == AWID`，也不能据此保证 Write→Read 或 Read→Write 的先后关系。因此 RAW 若要求“写完后再读到新值”，通常要等前一笔 B response 后再发 Read；WAR 若要求先完成读再覆盖，则等 `RLAST` 对应的最后一个 R beat 完成后再发 Write。高性能 Master 通常维护 outstanding table，记录 ID、读写类型、地址范围、burst 长度和状态，对新的 transaction 检查地址范围是否 overlap：有 RAW/WAR/WAW 依赖就 stall 或保序，没有依赖就继续 outstanding。真正高性能的原则不是“全部并发”，而是 **只序列化有依赖的 transaction，无依赖事务尽可能并发**。
### Master 用什么硬件维护多笔未完成事务？
真实 AXI Master 实现这些能力，核心依靠内部的 **transaction tracking**。支持 8 outstanding，意味着硬件必须有资源保存最多 8 笔未完成事务的上下文，例如 ID、地址、LEN、当前 beat、目标 buffer、完成状态等。请求发出后，AR/AW engine 不等待 response，而是继续处理下一笔；R/B engine 独立接收响应，再根据 `RID/BID` 找到对应 transaction。不同 ID 可以独立完成；同 ID 多笔 outstanding 时，通常按该 ID 维护 FIFO，利用 AXI 的同 ID ordering 保证返回属于队首事务。因此，真正决定 Master outstanding 能力的不是协议本身，而是内部 outstanding table/FIFO 的深度以及调度逻辑。
可以把核心关系记成：
```text
Outstanding能力
= 保存多笔未完成事务的资源 + 请求/响应解耦

乱序能力
= 多ID + 根据RID/BID匹配transaction

同ID多Outstanding
= per-ID FIFO + 同ID顺序保证

AXI3写交织
= WID + W-channel scheduler

AXI4
= 无WID，不支持AXI3式write-data interleaving
```

### 连续启动 sequence 就能形成 outstanding 吗？
最容易混淆的一点是：**连续发了 8 笔 sequence 不等于总线上形成了 8 outstanding**。只有前面的事务已经完成请求握手、且尚未完成响应，同时 VIP/DUT 的 outstanding 窗口又允许继续接收后续事务，才真正形成多笔 outstanding。
### Exclusive 如何维护 reservation？
Exclusive access 可以并发存在多笔，但通常依靠**不同 ID 维护不同 reservation**。Slave 的 Exclusive Monitor 可以理解为按 ID 保存 `valid + address + transaction attributes`。同一笔 exclusive sequence 的 Exclusive Read 和 Exclusive Write 必须使用相同 ID，并匹配地址、size、length 等属性；Exclusive Write 必须在对应 Exclusive Read 完成后再发。如果同一 ID 又执行新的 Exclusive Read，通常会覆盖原来的 reservation，因此一个 ID 不适合同时维护多个独立 exclusive sequence。多个 ID 可以同时监控不同甚至相同地址；若某 reservation 对应的地址在期间被其他写操作修改，该 Exclusive Write 失败，返回 `OKAY` 且不能真正写入；若 reservation 仍有效，则返回 `EXOKAY`并完成写入。这正是 Exclusive 用于 semaphore、atomic update 等场景的基础机制。
### Locked 与 Exclusive：锁住资源还是检查 Reservation？
AXI3 的 Locked transaction 和 Exclusive access 都可用于解决原子访问，但机制完全不同。Locked 相当于悲观锁：一个 Manager 建立 locked sequence 后，相关目标资源会被限制给它使用，其他 Manager 的访问受到阻塞，直到最后一笔 normal transaction 完成并释放锁；锁属性在 `ARLOCK/AWLOCK` 地址通道上，而不在 W 通道。Locked 会降低并发度、影响 QoS 并增加 interconnect 实现复杂度，因此主要用于兼容 legacy AXI3 设备；AXI4 已经取消真正的 Locked transaction，只保留 Normal 和 Exclusive。Exclusive 更类似乐观并发：先做 Exclusive Read，Exclusive Monitor 记录 reservation；期间其他 Manager 仍然可以正常访问 Subordinate；最后 Exclusive Write 时检查 reservation 是否仍有效，未被破坏则写成功并返回 `EXOKAY`，若期间相关位置被其他访问破坏，则 Exclusive Write 失败，软件可以重试。这使得 semaphore、spinlock、atomic read-modify-write 等操作无需长期锁住总线。
### AXI3 Locked Sequence 为什么要用 NORMAL 事务解锁？
AXI3 Locked sequence 中连续发送一笔 `LOCKED` 写和一笔 `NORMAL` 写并不是重复操作。Locked transaction 会使 interconnect 锁住目标 Slave region，使其他 Master 暂时不能访问；Locked sequence 必须以一笔非 Locked 的事务结束，这最后一笔 Normal transaction 本身也属于这个 Locked sequence，并在完成后解除锁。发送最终解锁事务之前，前面的 Locked transaction 必须已经完成；最终解锁事务也必须完成以后才能继续发新的事务，因此代码中两次 `get_response(rsp)` 是有意义的。AXI4 已取消 Locked transaction，但 AXI3 支持。[文档服务](https://documentation-service.arm.com/static/67ab5a186dbc975ccea91734?utm_source=chatgpt.com)
Locked sequence 有一个非常重要的强制条件：整个 sequence 中所有 transaction 必须使用相同的 `AxID`。因此类似：
```system-verilog
tr.atomic_type  = LOCKED;
tr.id           = 1;
`uvm_send(tr)
get_response(rsp);

trn.atomic_type = NORMAL;
trn.id          = 1;
`uvm_send(trn)
get_response(rsp);
```

是典型的两事务 Locked sequence。协议并没有要求解锁事务的地址、`AxSIZE`、`AxLEN`、`AxBURST` 必须和之前完全相同；强制要求的是同一个 Master、同一个 Locked sequence 使用相同 `AxID`，并满足前后事务完成顺序。规范推荐但不强制整个 Locked sequence 保持在同一个 4KB region，并推荐最多两笔 transaction。因此实际验证中通常仍让前后两笔事务访问相同或至少同一 Slave 地址区域，这样更符合锁定目标 Slave region 的测试目的。[文档服务](https://documentation-service.arm.com/static/67ab5a186dbc975ccea91734?utm_source=chatgpt.com)
最容易混淆的三点是：`NORMAL` 解锁事务不是一个纯粹的“解锁命令”，它本身仍然是一笔真实 AXI transaction；Locked sequence 强制保持一致的是 `AxID`，不是必须把地址、size、length 全部复制；以及 `req_resp.bresp = OKAY` 不是多余约束，而正是 Slave VIP 获得“应该返回什么响应”的方式。
### Exclusive Responder 不能无条件返回 EXOKAY
这里还要区分 Locked 和 Exclusive。Locked 是由 interconnect 阻止其他 Master 访问目标 Slave region，直到解锁；Exclusive 则依赖 exclusive monitor 判断 Exclusive Read/Write 是否仍然有效。因此简单写成：
```text
EXCLUSIVE -> EXOKAY
```

只适合作为简化 responder。如果要真正验证 exclusive 语义，还需要检查 Exclusive Read/Write 的配对、ID/地址等属性，以及期间是否有其他写操作破坏独占状态。
### 统计和独占访问的适用条件
AW/B 计数是以地址接受为起点的口径，AW 前已接受的 W 数据需另外跟踪。Exclusive 失败不写入的规则要在支持 Exclusive 的目标及对应操作语义下理解；目标不支持 Exclusive 时不能仅凭 OKAY 推断相同副作用。多 Master、缓存和可缓冲目标还需遵循系统可见性与同步规则。

## 系列其他文章

- [第一篇：SystemVerilog 语言基础](/posts/dv-sv-basics/)
- [第二篇：仿真调度、并发与 SVA](/posts/dv-simulation-concurrency-sva/)
- [第三篇：数字设计、时序与 CDC](/posts/dv-rtl-timing-cdc/)
- [第四篇：UVM 验证平台](/posts/dv-uvm-platform/)
- [第六篇：Bridge 验证与 AHB/APB](/posts/dv-bridge-ahb-apb/)
- [第七篇：NoC、CHI 与接口带宽](/posts/dv-noc-chi-bandwidth/)
- [第八篇：SoC 验证与工程工具](/posts/dv-soc-engineering/)
