---
title: "数字验证问答（二）：仿真调度、并发与 SVA"
pubDatetime: 2026-10-08T14:00:00+08:00
tags: ["数字验证","SystemVerilog","SVA"]
description: "事件区域、断言采样、并发进程、Clocking Block 与 Driver 复位。"
---

这篇是数字验证问答系列的第二篇，整理自我的复习笔记。事件区域、断言采样、并发进程、Clocking Block 与 Driver 复位。

[查看系列目录](/series/digital-verification/)

## 目录

## SystemVerilog：仿真调度与 SVA

事件区域、NBA、采样值、时序窗口及 assert/assume。
### 一个仿真时间片包含哪些区域？
SystemVerilog 仿真中的“时间片”不是简单的一个瞬间，而是同一个仿真时间点内部按固定顺序处理的一系列 event region。经典 Verilog 常用“四区模型”来理解：`Active → Inactive → NBA → Monitor/Postponed`。这个模型足以解释大多数 `=`、`#0`、`<=`、`$display/$strobe` 的行为，但严格的 SystemVerilog 调度模型更细，完整 time slot 包含更多 region，其中 RTL/UVM/SVA 最需要掌握的是 `Preponed、Active、Inactive、NBA、Observed、Reactive、Re-Inactive、Re-NBA、Postponed`。
### 阻塞赋值和 NBA 分别何时生效？
最核心的区别是：`Active` 用于执行当前被触发的过程、阻塞赋值以及非阻塞赋值 RHS 的计算；`Inactive` 主要处理 `#0` 事件，它不会让仿真时间前进，只是把执行推迟到当前时间片稍后；`NBA` 才真正更新 `<=` 的左值。因此非阻塞赋值应理解为“Active 区读取 RHS，NBA 区更新 LHS”。这正是时序逻辑使用 `<=` 的根本原因：同一时钟沿触发的寄存器先基于旧状态统一计算，再在 NBA 区统一更新，从而模拟真实触发器同时采样的行为。若在时序逻辑中使用阻塞赋值 `=`，后续语句可能立即看到刚更新的新值，形成仿真中的级联穿透。
### #0 能消除竞争吗？延迟赋值何时采样？
同一 `Active` 区中多个并行进程的先后顺序通常不能依赖，因此如果两个 `always/initial` 在同一时刻访问同一信号，可能出现 race condition。`#0` 只是把操作移到 `Inactive`，并不是可靠的通用消除竞争手段。类似地，`a <= #5 b` 应区分“何时采样 RHS”和“何时更新 LHS”：通常当前时刻就计算 `b`，5 个时间单位后再更新 `a`，不能简单理解成 5ns 后才读取 `b`。
### SVA 在哪里采样、在哪里求值？
对于 SVA，最重要的是 `Preponed` 和 `Observed`。Concurrent assertion 通常在 `Preponed` 区采样相关信号，在 `Observed` 区进行 property 求值。因此即使 `Observed` 位于 `NBA` 之后，assertion 判断使用的仍主要是之前采样到的值，而不是简单读取 NBA 后的新值。理解 `$rose/$fell/$past` 以及“断言看到哪一拍数据”时，必须以这种 sampled-value 语义为基础，而不是只看当前变量表面上的实时值。
### Reactive、Postponed 与 UVM 有什么关系？
`Reactive` 主要属于 testbench/program/assertion action 一侧，设计目的之一是让测试平台在 DUT 的主要设计更新之后再作响应，从而减少 testbench 与 DUT 之间的竞争；`Re-Inactive`、`Re-NBA` 可以看作 Reactive 域对应的 Inactive 和 NBA。现代 UVM 一般不依赖 `program block`，而更多通过 `interface` 和 `clocking block` 明确采样和驱动时序。最后的 `Postponed` 用于观察当前时间片已经稳定后的结果，典型是 \$strobe、\$monitor；因此 \$display往往能看到 NBA 更新前的旧值，而 \$strobe 能看到当前时间片最终稳定后的值。
### 如何记住主要调度顺序？
实际工程中可以优先记住这一条主链：
```text
Preponed
  SVA/采样
    ↓
Active
  RTL执行、阻塞赋值、计算NBA的RHS
    ↓
Inactive
  #0
    ↓
NBA
  非阻塞赋值真正更新
    ↓
Observed
  concurrent assertion求值
    ↓
Reactive
  testbench / assertion action响应
    ↓
Re-Inactive / Re-NBA
  Reactive域中的延迟和非阻塞更新
    ↓
Postponed
  观察当前时间片最终稳定状态
```

### 两个并发时序块为什么使用非阻塞赋值？
阻塞赋值 `=` 会在当前 procedural thread 中立即更新左值，所以同一个 `begin...end` 中后续语句能读到新值；组合逻辑通常使用阻塞赋值。非阻塞赋值 `<=` 则先计算 RHS，再在 NBA region 更新 LHS，因此非常适合描述多个触发器在同一时钟沿同时采样旧状态的行为，时序逻辑通常使用非阻塞赋值。特别容易混淆的是：
```text
always @(posedge clk) q   = d;
always @(posedge clk) out = q;
```

两个 `always` 是独立并发进程，同一个时钟沿进入 Active region 后执行顺序没有保证。如果第一个先执行，`out` 可能读到新 `q=d`；如果第二个先执行，`out` 读到旧 `q`，所以仿真存在 race。改成：
```text
always @(posedge clk) q   <= d;
always @(posedge clk) out <= q;
```

后，两个 RHS 都在时钟沿读取旧状态，随后 NBA 更新，稳定得到 `q(n)=d(n)`、`out(n)=q(n-1)`。真实综合出来的两个触发器也是在同一边沿采样旧状态，所以“RTL 时序逻辑用阻塞赋值”容易产生仿真与硬件语义不一致的问题。
### Assert 与 Assume：检查设计和约束环境
`assert` 和 `assume` 都属于 SystemVerilog Assertion（SVA），并不是 UVM 专有机制。核心区别是：`assert` 用来检查或证明 DUT 必须满足某个性质，性质失败通常表示 DUT 行为不符合预期；`assume` 用来约束验证环境，表示“只考虑满足这个前提的输入或环境行为”，主要用于 Formal Verification。典型关系是：环境输入用 `assume` 描述合法前提，DUT 输出和内部行为用 `assert` 检查。例如验证 AXI Slave 时，可以 `assume` Master 在 `VALID=1 && READY=0` 时保持协议要求的信号稳定，同时 `assert` Slave 自己输出的 `BVALID`、`RVALID` 等满足协议要求。
需要特别区分 Formal 和普通 UVM 仿真。在 Formal 中，`assume property` 会真正限制状态空间，工具只探索满足 assumption 的场景；而在普通 VCS/UVM 动态仿真中，`assume` 并不会像 `constraint` 一样控制 sequence 的随机激励，实际输入仍由 sequence、constraint 和 driver 决定，仿真器对 `assume` 的检查和报告方式还可能受工具选项影响。因此动态仿真中主要使用 `assert`，Formal 中才会大量组合使用 `assume + assert`。
最重要的风险是 Formal 的过度约束（over-constraint）。如果 `assume` 写得过强，可能把本来需要验证的异常或边界场景全部排除，导致大量 assertion“证明通过”，但这个通过并不能说明 DUT 真正可靠。因此可以把两者概括为：`assert` 是“这个性质必须成立，我要检查/证明它”；`assume` 是“先把这个性质作为前提，只在该前提下分析系统”。
### Within、采样边沿与参数化延迟
SVA 中 `A within B` 表示 **A 这个 sequence 的整个匹配区间必须包含在 B 的匹配区间内部**。`$rose(a)` 检测的是采样意义上的上升沿，不是高电平保持；`1 -> 1` 不算 \$rose。严格按 SVA 四态语义，前一采样值为 `0/X/Z`、当前为 `1` 时也可判定 \$rose。`##N` 的延迟通常必须是编译/elaboration 时可确定的常量，因此 `parameter int B=4; a ##B c` 可以，而普通运行时变量 `int b=4; a ##b c` 不能直接作为标准 SVA 延迟；动态延迟需要用其他 sequence/repetition 写法实现。
### \$fell 在哪一拍成立？
在 SVA 中，`$fell(sig)` 不是“实时监听信号下降沿”，而是在 property 指定的采样事件到来时，比较“上一次采样值”和“当前采样值”。例如：
```text
@(posedge clk)
$fell(reset_b) |-> (full == 0);
```

含义是：每个 `posedge clk` 都采样一次 `reset_b`；如果上一拍采到 `1`、当前拍采到 `0`，那么 `$fell(reset_b)` 就在当前这个时钟沿成立。由于使用的是重叠蕴含 `|->`，右侧 `(full == 0)` 也在同一个采样周期检查；若改成 `|=>`，则在下一拍检查右侧。
最容易混淆的是“信号恰好在当前时钟沿由时序逻辑更新”的情况。SVA 会在时钟沿的 Preponed 区域先采样，而 `always_ff @(posedge clk)` 中的非阻塞赋值要到后面的 NBA 区域才更新。例如：
```system-verilog
always_ff @(posedge clk)
    reset_b <= 0;
```

若 `reset_b` 是在 A 时钟沿由这句代码从 `1` 更新成 `0`，那么 A 点 assertion 采样时仍看到旧值 `1`，A 点之后信号才变为 `0`，因此到 B 时钟沿才采到 `0`，此时 `$fell(reset_b)` 才成立。反之，如果 `reset_b` 在 A 沿采样之前就已经变为 `0`，那么 \$fell 就在 A 沿成立。
因此不要简单记成“同步信号 \$fell 下一拍触发”。准确规则是：**\$fell 比较相邻采样值；对单 bit，前值为 1/X/Z、当前为 0 都可构成下降；到底是 A 拍还是 B 拍成立，取决于新值在 A 拍 SVA 采样之前是否已经可见。**
### 延迟窗口与连续重复有什么区别？
SVA 中，如果要求“A 成立后的第 1～4 个时钟周期内，B 至少有一次为 1”，典型写法是 `A |-> ##[1:4] B`；如果要求后面连续 4 个周期 `B` 都为 1，则应使用类似 `A |=> B[*4]`。两者的本质区别是“时间窗口内出现一次”与“连续保持若干周期”。
### 同一时间槽内的 NBA 与采样打印
SystemVerilog/UVM 中，并发断言通常在时钟事件处对信号进行采样，并按断言调度区域求值；`$sampled()` 可在 assertion 的 action block 中取得本次断言实际采样到的值，适合调试打印。时序逻辑应使用非阻塞赋值 `<=`；同一过程在同一时间槽内对同一变量多次 NBA 赋值时，最终通常由最后一次赋值决定，其更新发生在该时间槽的 NBA 区域，而不是“等到下一个时钟沿”。
调度主链是教学简化，同一时间槽可能经历多轮区域调度。普通 UVM class 不会仅因属于 testbench 就自动在 Reactive 执行，实际取决于启动上下文与同步机制。
\$rose/\$fell 对多 bit 表达式需注意最低有效位语义。以上复位例子按正常的 1→0 转换解释。
### 补充：Disable iff、空成功与握手断言
并发断言中的 disable iff 用于在复位等条件下中止当前断言尝试。它通常使用非采样的条件，具有异步禁用语义；不能把它当成普通的、只在 property 时钟沿判断的前件。用它屏蔽复位期间的协议检查，并不等于验证了复位本身正确。
下面检查单通道的 valid/payload 在背压后仍保持：
```text
assert property (@(posedge clk) disable iff (!rst_n)
  (valid && !ready) |=> (valid && $stable(payload)));

cover property (@(posedge clk) disable iff (!rst_n)
  valid && !ready);

cover property (@(posedge clk) disable iff (!rst_n)
  (valid && !ready) ##1 (valid && ready));
```

payload 应包含该通道所有要求稳定的字段，例如数据、掩码和 LAST。若接口允许握手取消，需按该协议另写条件。X/Z 检查也要单独考虑，不能依赖普通真假判定发现全部未知态。
A \|-\> B 在 A 不成立时可能“空成功”（vacuous success）。因此 assertion 没报错，不代表触发条件真的测过；需要覆盖前件、完整响应场景，并检查是否被 reset 长期禁用。Formal 中同样要确认 assumption 没把触发场景排除。
参考：[Doulos SVA 问答：disable iff 与 vacuity](https://www.doulos.com/media/whbl2ydq/2409-27-qalog_sva_expert_in_one_hour.pdf)。

## SV 并发、Interface 与 Driver 复位

fork、同步原语、clocking block、事件等待和复位中断。
### Fork/Join 的进程语义
`fork...join` 的核心是“父进程创建并发子进程”。`fork` 中直接出现的每一条 statement 都是一个独立子进程；如果用 `begin...end` 包住多条语句，那么整个 `begin...end` 只算一个子进程，内部仍顺序执行。`join` 会等待所有子进程结束，`join_any` 只等任意一个子进程结束，剩余子进程仍继续运行；`join_none` 完全不等待，父进程继续向后执行。对于 `join_none`，创建出的子进程要等父进程发生阻塞或结束后才获得执行机会，因此在 `for` 循环里尤其容易出现“循环已经跑完，子线程才开始读变量”的问题。`wait fork` 用来等待当前进程仍未结束的直接子进程；`disable fork` 会终止当前进程仍存活的子进程，复杂环境中要注意误杀其他后台线程。
经典问题是：
```system-verilog
for (int i = 0; i < 3; i++) begin
    fork
        $display("%0d", i);
    join_none
end
wait fork;
```

这里会创建 3 个 \$display 子线程，所以一定打印 3 次；但它们共享同一个循环变量 `i`，等真正执行时循环已经结束，`i == 3`，因此通常打印 `3 3 3`。解决方法是每轮保存一份独立快照：
```system-verilog
for (int i = 0; i < 3; i++) begin
    fork
        automatic int k = i;
        $display("%0d", k);
    join_none
end
wait fork;
```

每次进入该 `fork` 作用域都会产生独立的 automatic `k`，分别保存 `0、1、2`，因此三个子线程最终分别打印这三个值，顺序不保证。这里 `automatic` 的本质是“每次作用域激活拥有独立存储”，不是让代码并行。还要特别注意：若改成 `fork begin automatic int k=i; ... end join_none`，`k=i` 位于子进程内部，要等子进程真正开始执行时才初始化，此时 `i` 可能已经变成 3，因此作用不同。
`for + fork` 的组合要看谁包谁。`fork` 里放一个完整 `for`，只是“整个循环”与其他 fork 分支并行，循环内部仍顺序；`for` 每轮里使用 `fork...join`，每轮都会等子线程结束后才进入下一轮，因此通常没有跨迭代并行；只有 `for + fork...join_none` 才会快速创建多轮并发线程，这也是最需要 `automatic` 保存循环变量快照的场景。`join_any` 在 fork 中只有一个子线程时与 `join` 效果相同；有多个子线程时，任意一个结束父线程就继续，如果希望“谁先结束就终止其他分支”，常见模式是 `join_any` 后接 `disable fork`。
### Semaphore 与 Mailbox：资源控制和事务传递
`semaphore`（旗语/信号量）和 `mailbox` 都用于 SystemVerilog 并发线程之间的同步，但解决的问题不同。`semaphore` 解决“共享资源访问控制”，本质是一个可计数的许可证池：`new(N)` 表示初始有 N 个 key，线程通过 `get(n)` 获取 key，资源不足时会阻塞；使用结束后通过 `put(n)` 归还。`try_get(n)` 是非阻塞版本，拿不到立即返回失败。`new(1)` 时可当作互斥锁使用，保证同一时刻只有一个线程进入临界区；`new(N)` 则可限制最多 N 个线程同时使用某类资源。要注意 semaphore 本质是计数型信号量，不只是 mutex。
`mailbox` 解决“线程间数据传递”，本质是线程安全、支持阻塞操作的 FIFO，典型用于 producer-consumer 模型。`put()` 将数据放入 mailbox，`get()` 取出并删除最前面的数据；若 mailbox 为空，`get()` 会阻塞等待数据。`peek()` 只读取最前面的数据但不删除。`try_get()`、`try_put()`、`try_peek()` 是对应的非阻塞版本。`mailbox mbx = new()` 为不限容量，`new(N)` 为有界 mailbox；有界 mailbox 满时，`put()` 会阻塞，因此可以自然形成 backpressure。实际验证中优先使用类型化邮箱，如 `mailbox #(transaction)`，可避免错误类型的数据进入邮箱。
两者最核心的判断方式是：如果问题是“谁能访问共享资源、同时允许几个线程访问”，用 `semaphore`；如果问题是“transaction 怎样从一个线程传给另一个线程”，用 `mailbox`。例如多个线程竞争同一资源时用 semaphore；monitor 向 scoreboard 传 transaction 时可用 mailbox。mailbox 与普通 queue 也不同：queue 只是数据结构，本身没有阻塞等待和线程同步语义，而 mailbox 同时承担数据存储和线程同步。
在 UVM 中通常不会大量直接使用 mailbox 完成组件通信，而更多使用 TLM，例如 monitor 通过 `analysis_port.write()` 向 scoreboard 发送 transaction，sequence/sequencer/driver 之间也通过 TLM 接口通信。理解 mailbox 的 producer-consumer、阻塞/非阻塞语义，是理解 UVM TLM 通信机制的重要基础。
### 原生 Event 与 UVM Event
UVM 事件机制中，SystemVerilog 原生 `event` 与 `uvm_event` 要严格区分：原生 `event` 用 `-> ev` 触发、`@ev` 等待，本身不能携带对象数据；`uvm_event` 是类对象，通过 `ev.trigger(data)` 触发，通过 `wait_trigger()`、`wait_trigger_data()` 等等待，并且 `trigger()` 可携带一个 `uvm_object`。因此“用 `->` 触发 `uvm_event`”是错误的。`uvm_event` 还提供 `wait_ptrigger()` 等更丰富的同步语义，可减少同一时间片内先触发、后等待导致错失事件的问题。
### Module、Interface 与 Virtual Interface 的层次关系
核心关系可以直接记为：**module 可以例化 interface，interface 不能例化 module。** SystemVerilog 的 `interface` 主要用于封装一组相关信号、时序和协议行为，作为模块之间或 DUT 与验证环境之间的连接抽象。标准明确允许 interface 在 module 中声明和例化，但不允许 module 在 interface 中声明或例化。[Eda Twiki](https://www.eda-twiki.org/sv-ec/3.0_LRM.pdf?utm_source=chatgpt.com)
在 UVM 中，真实的 interface 通常仍然是在 `tb_top` 这类静态 `module` 中例化，然后通过 `uvm_config_db` 把它的 **virtual interface 句柄**传给 driver、monitor 等 class。需要特别区分：`virtual axi_if vif;` 并没有创建一个 interface 实例，只是声明了一个指向已有 interface 实例的句柄。典型关系是：
```text
tb_top (module)
├── DUT (module)
└── axi_if (interface)
       ↑
       │ virtual interface
       │
   UVM driver / monitor
```

因此 UVM 可以理解为两个世界：`module/interface` 属于仿真开始前建立好的**静态层次结构**，UVM component、sequence、transaction 等属于运行时创建的 **class 动态对象体系**；两者最常用的桥梁就是 `virtual interface`。另外，interface 本身可以包含信号、task/function、clocking block、modport、断言以及一定的过程逻辑，甚至可以包含其他 interface，但它并不是用来替代 module 作为普通设计层次容器的。[Verification Academy](https://verificationacademy.com/forums/t/embeding-sva-modules-inside-interfaces/27897?utm_source=chatgpt.com)
### Clocking Block 的 Input/Output Skew
Clocking block 的核心作用是把 testbench 对 DUT 的“采样”和“驱动”在时间上错开，从而减少与 DUT 时序逻辑之间的 race。最重要的规律是：**input skew 表示在 clocking event 之前采样，output skew 表示在 clocking event 之后驱动。**例如：
```text
clocking cb @(posedge clk);
    default input #1ps output #1ps;
    input  rdata;
    output valid;
endclocking
```

若 `posedge clk` 发生在 100 ps，则 `input #1ps` 表示在 99 ps 对 `rdata` 取样，并把这个 sampled value 保存到 clocking variable 中；到 100 ps clocking event 发生、monitor 被唤醒时，读取 `cb.rdata` 得到的是刚才 99 ps 已经采好的值。这里容易混淆的是：**“提前采样”不代表 monitor 的代码提前执行**，只是采样动作提前完成，testbench 仍在 clocking event 时使用这个值。相反，`output #1ps` 表示 testbench 在 100 ps 通过 `cb.valid` 提交要驱动的值，但真正的 interface/DUT 信号要到 101 ps 才改变。
因此 clocking block 中可以直接记住：**Input 往时钟沿左边采，Output 往时钟沿右边驱动。**例如：
```text
99 ps              100 ps              101 ps
  |                   |                   |
input #1ps         posedge clk        output #1ps
  ↑                   ↑                   ↓
提前采样          TB 被唤醒/使用值       DUT 信号改变
```

常见的 `default input #1step output #0;` 也是同一逻辑：`input #1step` 在当前 clocking event 前一个最小仿真时间步采样 DUT 信号，避免和 DUT 在该沿上的更新竞争；`output #0` 则表示不增加实际的 ps/ns 物理延迟，而是在该 clocking event 对应的 clocking block 输出调度区域驱动。`#1step` 和 `#1ps` 不同，前者表示一个仿真精度步长，后者是明确的物理时间。
另一个常见误区是把波形中的 `cb.signal` 和真实 interface 信号 `signal` 当成同一个对象。它们语义不同：`cb.signal` 是 clocking variable，代表 clocking block 已经采样到或准备驱动的值；真实 `interface.signal` 才是 DUT 实际看到的信号。因此使用 `output #1ps` 时，波形中可能先看到 `cb.valid` 改变，之后 1 ps 才看到真正的 `valid` 改变，这不是“CB 提前驱动”，而是 **clocking variable 先得到待驱动值，再经过 output skew 作用到真实信号上**。
最后，`#1` 本身不一定等于 1 ps，它取决于当前作用域的 `timeunit` 或 `timescale`。例如 `timeunit 1ns` 时，`output #1` 就是 1 ns。若希望明确表示 1 ps，应直接写 `input #1ps`、`output #1ps`。总体上，Clocking block 的设计思想可以概括为：**边沿前采 DUT，边沿处或边沿后驱 DUT，用明确的采样/驱动时序消除 testbench 与 DUT 之间的竞争。**
### 为什么 @cb 可能没有让 \$time 变化？
`repeat(1) @(event)` 与 `@(event)` 完全等价，`repeat(1)` 不会额外增加一个周期。例如 `repeat(1) @(posedge clk)` 就是等待下一次 `posedge clk`。事件控制会阻塞当前线程，但“阻塞”不等于一定推进一个完整时钟周期；真正推进多少物理时间取决于下一次目标事件什么时候发生。
对于普通的 `@(posedge clk)`，如果执行到这句时当前上升沿已经发生，那么只能等下一个上升沿。但 `@(vif.mst.cb_o)` 有一个容易混淆的特殊点。若 `cb_o` 定义为 `clocking cb_o @(posedge clk)`，那么 `@(cb_o)` 等待的是 **clocking block 自己的 named event**，而不是直接等待 `posedge clk`。SystemVerilog 会先处理该 clocking block 的采样值，然后触发这个 named event；因此存在这种情况：`posedge clk` 已经在当前 time slot 发生，但 `cb_o` 的 named event 尚未触发，此时代码执行到 `@(cb_o)`，仍然能在同一个 `$time/$realtime` 内被唤醒，只是跨过了仿真调度 region，而没有推进到下一拍。[Verification Academy](https://verificationacademy.com/forums/t/input-sampling-for-clocking-blocks/41134?utm_source=chatgpt.com)
因此下面这种现象是合法的：
```text
$display("%0t A", $time);
@(vif.mst.cb_o);
$display("%0t B", $time);
```

可能看到：
```text
100ns A
100ns B
```

这并不意味着 `@(cb_o)` 被忽略了，而是 A 执行时当前 100ns 对应的 clocking-block event 尚未触发，线程随后在同一 time slot 被该 event 唤醒。反过来，如果代码执行到 `@(cb_o)` 时本次 named event 已经发生，就只能等待下一次 clocking event，此时 \$time 才会推进到下一拍。
这不会导致“有时多一拍、有时少一拍而乱套”，因为行为由仿真调度顺序确定，并非随机。真正容易制造混乱的是**混用不同同步事件**，例如：
```text
@(posedge vif.clk);
...
@(vif.mst.cb_o);
```

由于 `posedge clk` 与 `cb_o` 属于同一时钟沿的不同调度阶段，第二个 `@(cb_o)` 有可能继续捕获当前这一拍的 clocking-block event。也正因此，使用 clocking block 后，通常应统一使用 `@(cb_o)` 作为 testbench 的同步事件，而不要在同一驱动流程里混用 `@(posedge clk)`、`wait(...)` 等同步方式。[Verification Academy](https://verificationacademy.com/forums/t/clocking-block-in-interface/29291/3?utm_source=chatgpt.com)
反之，**连续两个 **`@(cb_o)`** 是明确相隔一拍的**：
```text
@(vif.mst.cb_o);  // 第 N 次 cb_o event 唤醒
@(vif.mst.cb_o);  // 第 N+1 次 cb_o event 才能唤醒
```

第一个 `@(cb_o)` 被第 N 次 event 唤醒后，第 N 次 event 已经过去，第二个不可能再次消费同一个 event，所以必须等下一次。因此 driver 中最好统一管理时钟同步，例如外层已经：
```text
@(vif.mst.cb_o);
drive_metadata(req);
```

那么 `drive_metadata()` 内部就不要无意间再写：
```text
@(vif.mst.cb_o);
```

否则就是真正明确地又等待了一次 clocking event，通常会多一拍。
最后，clocking block 中：
```text
clocking cb_o @(posedge clk);
    default input #1step output #1;
endclocking
```

`input #1step` 和 `output #1` 是**采样/驱动 skew**，不能理解成 `@(cb_o)` 自己增加了这些延迟。尤其 `output #1` 表示通过 clocking block 写输出后，实际输出相对于 clocking event 的驱动偏移，而不是 `@(cb_o)` 会额外等待 1 个时间单位。
最值得记住的一句话是：**`@(posedge clk)`** 等底层时钟边沿；**`@(cb_o)`** 等 clocking block 的 named event。使用 clocking block 后尽量始终用 **`@cb_o`** 做同步，不要把 **`@posedge clk`** 和 **`@cb_o`** 混在同一套 driver 时序里。
### If 与事件等待为什么不能互换？
在 SystemVerilog 中，`if (@(negedge clk))` 是非法语法。原因是 `if (...)` 中必须放一个能够求值得到真/假的表达式，而 `@(negedge clk)` 属于事件控制语句，用于“等待某个事件发生”，本身不是布尔条件。
如果需求是“等待 `clk` 的下降沿到来后执行操作”，应直接写：
```text
@(negedge clk);
driver = 0;
```

也可以写成：
```text
@(negedge clk) begin
    driver = 0;
end
```

若需要持续在每个下降沿执行，可使用：
```text
forever begin
    @(negedge clk);
    driver = 0;
end
```

需要特别区分事件检测和电平判断。`@(negedge clk)` 表示等待 `clk` 从高电平跳变到低电平，是“边沿事件”；而：
```text
if (!clk)
    driver = 0;
```

只是检查执行到该语句时 `clk` 当前是否为 0，并不能判断刚刚是否发生了下降沿。
因此可以记住：`if` 用来判断“当前条件是否成立”，`@(...)` 用来等待“某个事件何时发生”。需要检测时钟上升沿、下降沿等事件时，应使用 `@(posedge clk)`、`@(negedge clk)`，而不是把事件控制写进 `if` 条件中。
### Reset 后 Driver 为什么仍可能多发一笔？
在 SystemVerilog 中，`@(negedge vif.rst_n)` 是合法事件控制，等待执行到此处之后的下降沿。在正常二态复位波形中就是 1→0；四态语义还包括 1→X/Z、X/Z→0，不能假定只会由干净的 1→0 触发。它与 `if (vif.rst_n == 0)` 不同：if 检查当前电平，事件控制等待后续事件。如果进入等待时 rst_n 已为 0，不会立即通过。因此不能把下面的 if/else：
```text
if (vif.rst_n == 0) begin
    ...
end
else begin
    ...
end
```

简单替换成
```text
@(negedge vif.rst_n) begin
    ...
end
else begin
    ...
end
```

因为 `else` 必须与 `if` 对应，而且这样还会让整个 task 卡在等待 reset 下降沿，正常 driver 流程无法继续。
如果需求是“发送过程中 reset 异步拉低后立即停止驱动”，需要并发监听复位，并协调正常发送线程的退出与输出驱动所有权。若只要求在发送时钟点响应复位，也可以在每个 drive 点后检查 rst_n，但这是同步检查，不能替代异步立即响应。
两种方案都必须阻止正常发送线程在清零后继续写出数据，否则 reset 分支刚清零，正常分支又执行一次 \<= data，波形就会出现复位后多发一笔。下面代码仅示意“发送点检查后退出当前 task”的方案：
```text
@(vif.mst.cb_o);

if (!vif.rst_n) begin
    vif.mst.cb_o.strb_o       <= 0;
    vif.mst.cb_o.long_data_o  <= 0;
    vif.mst.cb_o.short_data_o <= 0;
    // 其他输出清零
    drive_invalid(trans);
    return;
end

// 只有 reset 未生效时才继续正常发送
vif.mst.cb_o.strb_o      <= 1;
vif.mst.cb_o.long_data_o <= ...;
```

比较稳妥的完整思路是：task 刚进入时先用 `if (!rst_n)` 处理“已经处于 reset”的情况；正常运行期间再监控下降沿或在每个发送点检查 reset；一旦 reset 生效，清零输出并终止当前 drive 流程。还要注意，如果这些信号是通过 clocking block（如 `vif.mst.cb_o.xxx <= ...`）驱动的，实际 DUT 引脚何时变化还受 clocking block 的 `output skew` 影响。即使 reset 下降沿已经出现，如果上一笔赋值此前已经被 clocking block 调度出去，也可能在波形上看到 reset 后仍出现最后一拍。因此分析这类“reset 后多一笔”的问题时，要同时检查两点：正常 driver 是否在 reset 后仍继续执行，以及 `cb_o` 的 `default output #...` / output skew 设置。
### 复位代码的工程边界
逐时钟发送点检查只能在该采样粒度响应，不能保证异步立即清零。上面的代码是局部控制流程示意，省略号不能直接编译；实际还需协调 item_done、已接受事务、输出驱动所有权和待生效的 clocking drive。disable fork 会影响当前进程的活动后代，应隔离作用域，避免误杀其他后台线程。

## 系列其他文章

- [第一篇：SystemVerilog 语言基础](/posts/dv-sv-basics/)
- [第三篇：数字设计、时序与 CDC](/posts/dv-rtl-timing-cdc/)
- [第四篇：UVM 验证平台](/posts/dv-uvm-platform/)
- [第五篇：AXI 协议](/posts/dv-axi-protocol/)
- [第六篇：Bridge 验证与 AHB/APB](/posts/dv-bridge-ahb-apb/)
- [第七篇：NoC、CHI 与接口带宽](/posts/dv-noc-chi-bandwidth/)
- [第八篇：SoC 验证与工程工具](/posts/dv-soc-engineering/)
