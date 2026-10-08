---
title: "数字验证问答（一）：SystemVerilog 语言基础"
pubDatetime: 2026-10-08T14:00:00+08:00
modDatetime: 2026-10-08T11:25:02.199Z
tags: ["数字验证","SystemVerilog"]
description: "类型、四态逻辑、面向对象、对象复制、数组与随机约束。"
ogImage: "https://dawnmxv.github.io/images/digital-verification/dv-sv-basics/four-state.webp"
---

这篇是数字验证问答系列的第一篇，整理自我的复习笔记。类型、四态逻辑、面向对象、对象复制、数组与随机约束。

[查看系列目录](/series/digital-verification/)

<!-- dv-illustration-hint -->
<p class="technical-figure-hint">文中示意图可点击放大。</p>
<!-- /dv-illustration-hint -->

## 目录

## SystemVerilog：RTL、类型与四态逻辑

类型与驱动方式、可综合语义、位宽、X/Z 和 case。
### wire、reg、logic 与驱动方式有什么区别？
SystemVerilog 里要把几个层次分开理解：`wire/reg/logic` 是“信号/变量类型”，`assign/always` 是“驱动方式”，`=/<=` 是“过程块中的赋值语义”，组合逻辑/时序逻辑才是“最终描述出的硬件”。传统 Verilog 中，`wire` 通常由 `assign` 或模块连接驱动，`reg` 用于 `always/initial` 中的过程赋值，但 `reg` 不等于物理寄存器；例如 `reg y; always @(*) y = a & b;` 综合出来仍只是组合门。SystemVerilog 中一般优先用 `logic`，组合逻辑推荐 `always_comb`，时序逻辑推荐 `always_ff @(posedge clk)`。`assign y = ...` 是连续赋值，RHS 变化时持续驱动 LHS；`always @(*)`/`always_comb` 是过程式描述组合逻辑。组合块必须保证所有路径都给输出赋值，否则输出需要保持旧值，会推导出 latch。
### 阻塞与非阻塞赋值决定硬件类型吗？
阻塞赋值 `=` 是“当前语句先更新完，再执行下一句”，适合表达组合逻辑内部逐级数据传播；非阻塞赋值 `<=` 是“当前时刻计算 RHS，稍后统一更新 LHS”，对应真实触发器在同一个时钟边沿并行采样的行为，因此时序逻辑通常使用 `<=`。不过 `=`/`<=` 本身并不决定硬件类型，真正决定组合还是时序的是描述语义：`always @(posedge clk)` 本质上描述边沿触发存储，即使用 `=` 仍会综合成触发器，只是容易产生仿真竞争；`always @(*)` 即使用 `<=` 通常仍描述组合逻辑，只是不推荐。最实用的编码准则就是“组合用 `always_comb + =`，时序用 `always_ff + <=`”。
### 怎样判断 Latch、敏感列表与可综合语义？
Verilog/SystemVerilog 中，组合逻辑产生 latch 的根本原因不是简单的“没有 `else`”或“`case` 没写全”，而是某个输出在部分执行路径上没有被赋值。如果提前提供默认赋值，即使没有 `else/default` 也可以避免 latch。编码上通常遵循“时序逻辑用非阻塞 `<=`，组合逻辑用阻塞 `=`”；组合敏感列表漏信号会造成 RTL 仿真与真实组合逻辑不一致，而多写冗余信号通常只会增加无意义触发。SystemVerilog 中更推荐 `always_ff` 和 `always_comb`。综合能力方面，`always`、`function`、`generate` 本身都可以综合；`#delay`、\$time 等仿真时间控制不可综合。`initial` 在传统 ASIC RTL 语境下通常按不可综合处理，但某些 FPGA 工具允许用它初始化寄存器或 ROM。
### 寄存器能由两个时钟驱动吗？
Verilog/SystemVerilog 中，时序触发器通常由单一功能时钟边沿驱动，例如 `always @(posedge clk)`；`always @(posedge clk or negedge rst_n)` 是合法且常见的可综合写法，因为 `rst_n` 是异步复位，不是第二个功能时钟。若同一寄存器同时由 `clk1`、`clk2` 两个独立时钟边沿触发，通常不能映射为普通触发器，因此一般不可综合。还要区分“`reg`/变量类型”和“硬件寄存器”：变量也可以在 `always @(*)` 中描述组合逻辑，并不一定需要时钟。
### 枚举类型如何声明和复用？
SystemVerilog 枚举中，枚举值默认从 `0` 开始依次递增，但完全可以显式指定，例如 `typedef enum {A=1, B=5, C=6} state_t;`。匿名枚举如 `enum {IDLE, RUN, DONE} state;` 没有类型名，因此通常只能在定义时直接声明一个或多个变量，后续无法像 `typedef enum` 那样复用这个类型；如果需要多处声明同类变量，应使用 `typedef` 定义命名枚举类型。
### 二态、四态和表达式位宽
bit 只保存 0/1；logic 可保存 0/1/X/Z。硬件字段按接口位宽声明；delay/count 等非负验证参数可用 int unsigned。
signed 扩位做符号扩展，unsigned 扩位做零扩展。混合运算先统一符号和位宽；对关键中间结果显式扩位，避免移位、乘法和截断造成溢出。算术右移用 \>\>\>，且左操作数必须具有期望的 signed 属性。
4'bx、4'bz 分别填满 4 位 X/Z；'x、'z 按上下文宽度填满。越界读取的结果取决于数组和元素类型，不能一概认为都会返回 X；应显式检查索引范围。
### 如何避免把 X/Z 误判为检查通过？
在 SystemVerilog 四态逻辑中，关系运算如 `a > b`、`a <= b` 遇到参与比较的 `X/Z` 时，结果可能是 `X`。而 `if` 只有在条件明确为 `1` 时才进入 true 分支；条件为 `0/X/Z` 都会走 else。因此下面这种写法有风险：
```system-verilog
if (a > b)
    `uvm_error(...)
else
    // pass
```

如果 `a` 为 `X`，`a > b` 可能得到 `X`，最终反而进入 `else`，把未知态误判为通过。
如果需求是“只有明确满足条件才 pass，其余情况都 error”，推荐用四态不等运算符 `!==` 对比较结果再做一次判定：
```system-verilog
if ((a > b) !== 1'b0) begin
    `uvm_error("DELAY_CHECK", "delay check failed")
end
else begin
    // pass
end
```

这里的含义是：只有 `a > b` 明确等于 `0` 才 pass；如果结果为 `1` 或 `X`，都报错。等价地也可以写成：
```system-verilog
if ((a <= b) !== 1'b1)
    `uvm_error(...)
```

关键区别是：`!=` 属于普通四态逻辑比较，遇到 `X` 后结果仍可能是 `X`；而 `!==` 是 case inequality，最终结果一定是明确的 `0/1`，因此适合这种“未知态也应视为失败”的验证判定。若希望单独区分“超限”和“出现 X/Z”两类问题，则使用 `$isunknown()` 更利于定位；但如果只是要求 error 分支在前、且不想显式写 X 检查，`!==` 是更简洁的写法。

<!-- dv-illustration: 1 -->
<figure class="technical-figure" data-illustration="1">
<img src="/images/digital-verification/dv-sv-basics/four-state.webp" alt="四态逻辑与未知态检查" width="1536" height="1024" loading="lazy" decoding="async" />
<figcaption>四态比较可能得到 X；用 case inequality 可以把未知结果明确判为检查失败。</figcaption>
</figure>
<!-- /dv-illustration: 1 -->

### Case、Casez、Casex 有什么不同？
`case`、`casez`、`casex` 的关键区别在通配规则：普通 `case` 不把任何状态当通配；`casez` 将 `Z/?` 当作 don't-care；`casex` 将 `X/Z/?` 都当作 don't-care。由于 `casex` 可能把真实的 `X` 异常掩盖掉，因此 RTL 设计中一般应谨慎使用，优先考虑普通 `case` 或合适的 `casez`。
### 四态逻辑有哪些易错点？
- 0 && X = 0；1 && X = X；1 \|\| X = 1；0 \|\| X = X；!X = X。
- ==、!= 可能返回 X；===、!== 做四态精确比较，返回确定的 0/1。
- if 仅在条件判为真时进入分支。单 bit 条件为 X/Z 时不会进入 true 分支，因此未知态可能被错误地当成通过。
- case 精确匹配；casez 把 Z/? 当通配；casex 把 X/Z/? 当通配，容易掩盖未知态。
- 遇到混合运算符时加括号。相关优先级为 ! 高于 ==，再高于 \|、&&、\|\|。
### 流操作符怎样反转字节？
\{\>\>\{data\}\} 按相应流方向排列；\{\<\<\{data\}\} 默认按 bit 反转。指定 8-bit slice 后，\{\<\<8\{32'h12345678\}\} 的结果是 32'h78563412，相当于反转四个 byte 的顺序。

## SystemVerilog OOP 与 UVM 对象复制

句柄、virtual/static、浅深拷贝、clone 和 field automation。
### 继承、重写与多态分别解决什么问题？
面向对象部分同样要区分继承、重写和多态。`class B extends A` 表示 B 继承 A 的成员；若 B 重新定义父类方法，就是 override，函数原型应保持匹配。父类函数中的局部变量只在该函数调用期间存在，不是类成员，子类不能直接访问。多态的关键是“父类句柄可以指向子类对象 + 父类方法声明为 `virtual`”：例如 `A a; B b = new(); a = b; a.mul()`，若 `mul()` 是 virtual，则运行时根据实际对象类型调用 `B::mul()`；如果不是 virtual，则通常按句柄声明类型解析。可以概括为：继承解决“B 拥有 A 的能力”，重写解决“B 提供自己的实现”，多态解决“用 A 类型的统一接口操作不同派生对象”。这正是 UVM 中大量父类句柄、factory 和虚函数机制的基础。
### Static 方法为什么没有 This？
在 SystemVerilog/UVM 的 class 中，`static` 方法属于类本身，而不是某个具体对象，因此它没有隐含的 `this` 句柄。正因为没有 `this`，静态方法不能直接访问类中的非静态成员变量或非静态方法，因为这些成员必须依附于某个具体对象；而静态成员属于整个类共享，所以静态方法可以直接访问静态成员。
例如，`static function void func(); a = 1; endfunction` 中，如果 `a` 是普通成员变量，则非法，因为无法确定这里的 `a` 属于哪个对象；如果 `a` 是 `static` 成员，则合法。普通非静态方法则不同，它运行在某个对象上，隐含拥有 `this`，因此既可以直接访问非静态成员，也可以访问静态成员。
需要注意的是，“静态方法不能访问非静态成员”更准确的说法是：**静态方法不能直接访问非静态成员**。如果静态方法显式拿到了某个对象句柄，例如参数 `obj`，那么完全可以通过 `obj.a` 访问这个对象的非静态成员。也就是说，限制的根本原因不是 static 代码本身不能操作对象数据，而是 static 方法没有默认的当前对象。
可概括为：普通方法有 `this`，因此可以直接访问 static 和 non-static 成员；static 方法没有 `this`，所以只能直接访问 static 成员，但可以通过显式对象句柄访问 non-static 成员。UVM 中常见的 `uvm_config_db#(...)::set()`、`get()` 等就是典型的类级静态方法调用形式。
### Virtual Class、Virtual Method 与 Virtual Interface
SystemVerilog 中几个 `virtual` 的含义要区分。`virtual interface` 是指向已经存在的 interface 实例的句柄，主要解决 UVM class 如何访问 DUT/interface 信号；interface 本身是 elaboration 阶段确定的静态结构。`virtual class` 是抽象基类，不能直接实例化，适合定义框架和公共接口；`pure virtual function/task` 只声明接口，强制派生类实现。`virtual function/task` 则用于多态：父类句柄指向子类对象时，调用 virtual 方法会根据实际对象类型动态绑定；不带 virtual 时则属于静态绑定。Class object 是通过 `new()` 动态创建的，但不能简单说“class 就是 automatic”。
### 句柄赋值、浅拷贝和深拷贝的区别
SV 类变量本质上是“对象句柄”，不是对象本身。`packet p;` 只是声明句柄，`p = new();` 才创建对象。`p2 = p1` 只复制句柄，因此两个句柄指向同一个对象，这甚至不能算真正的对象拷贝；修改 `p2` 就是在修改 `p1` 指向的同一个对象。SV 的 `p2 = new p1;` 会创建新的外层对象，并逐成员复制，这属于浅拷贝：`int`、`bit` 等值类型成员得到独立副本，但如果成员本身也是 class 句柄，那么复制的仍只是该句柄，两个外层对象仍会共享同一个内部对象。深拷贝则要求把嵌套对象也重新创建并递归复制，最终形成完全独立的对象树。因此判断深浅拷贝的关键不是“外层对象是否新建”，而是“内部对象句柄指向的对象是否也被复制”。
例如 `packet` 中包含 `header hdr` 时，浅拷贝相当于：
```text
dst = new src;
```

结果概念上是：
```text
src ──> packet1 ──┐
                  ├──> 同一个 header
dst ──> packet2 ──┘
```

深拷贝则应当重新创建 `header`：
```text
dst = new();
dst.data = src.data;

if (src.hdr != null) begin
    dst.hdr = new();
    dst.hdr.id = src.hdr.id;
end
```

结果变成：
```text
src ──> packet1 ──> header1
dst ──> packet2 ──> header2
```

这一区别在验证平台中非常重要。例如 monitor 如果不断复用同一个 transaction，再把它通过 analysis port 发给 scoreboard，那么 scoreboard 保存下来的可能只是同一个对象句柄；后续 monitor 修改 transaction 时，以前保存的数据也会“跟着变化”。常见做法是每笔事务重新创建对象，或者在需要保存独立快照时进行深拷贝/克隆。

<!-- dv-illustration: 2 -->
<figure class="technical-figure" data-illustration="2">
<img src="/images/digital-verification/dv-sv-basics/object-copy.webp" alt="句柄、浅拷贝与深拷贝" width="1536" height="1024" loading="lazy" decoding="async" />
<figcaption>判断深浅拷贝，要看内部对象是否共享，不能只看外层对象有没有重新创建。</figcaption>
</figure>
<!-- /dv-illustration: 2 -->

### Copy、Do_copy、Clone 各负责哪一层？
UVM 中的 `copy()`、`do_copy()`、`clone()` 不应简单理解成“一个浅拷贝、一个深拷贝”。三者职责不同。`dst.copy(src)` 是标准复制入口，要求 `dst` 已经存在；它内部最终会调用对象的 `do_copy()`。`do_copy()` 是子类真正定义“哪些成员怎么复制”的地方，所以最终是深拷贝还是浅拷贝，主要由这里决定。例如：
```system-verilog
virtual function void do_copy(uvm_object rhs);
    packet rhs_pkt;

    super.do_copy(rhs);

    if (!$cast(rhs_pkt, rhs))
        `uvm_fatal("COPY", "type mismatch")

    data = rhs_pkt.data;
    hdr  = rhs_pkt.hdr;
endfunction
```

其中 `hdr = rhs_pkt.hdr` 只是复制句柄，所以内部对象是浅拷贝。若改成：
```text
if (rhs_pkt.hdr == null)
    hdr = null;
else begin
    if (hdr == null)
        hdr = header::type_id::create("hdr");
    hdr.copy(rhs_pkt.hdr);
end
```

则对 `hdr` 继续递归复制，可以实现深拷贝。一般不直接调用 `do_copy()`，而应调用标准入口 `copy()`；`do_copy()` 是给派生类重写复制行为用的。
`clone()` 可以近似理解为“创建新对象 + `copy()`”：
```text
src.clone()
    ↓
create()
    ↓
new destination object
    ↓
destination.copy(src)
    ↓
destination.do_copy(src)
```

所以 `copy()` 和 `clone()` 最核心的区别是：`copy()` 把内容复制到一个已经存在的对象中，而 `clone()` 会先创建新的外层对象。由于 `clone()` 最终仍然依赖 `copy()/do_copy()`，它并不天然保证嵌套对象是深拷贝。如果 `do_copy()` 中对内部对象仍写 `hdr = rhs.hdr`，那么 clone 后虽然两个外层 `packet` 不同，但它们依然共享同一个 `header`。因此最准确的记忆方式是：
```text
p2 = p1
    → 句柄赋值，根本没有新对象

p2 = new p1
    → SV 浅拷贝，外层对象新建，内部对象句柄可能共享

dst.copy(src)
    → 复制到已有 UVM 对象，深浅由 do_copy 决定

do_copy()
    → 真正定义各字段如何复制，是决定深浅拷贝的核心

src.clone()
    → 创建新外层对象后执行 copy，内部是否深拷贝仍由 do_copy 决定
```

如果使用 UVM field automation，普通对象字段通常会递归参与复制，例如 `uvm_field_object(hdr, UVM_ALL_ON)`；若明确指定 `UVM_REFERENCE`，则该对象字段按引用处理，只复制句柄，相当于共享内部对象。实践中应始终先明确“我需要共享这个对象，还是需要一个独立快照”，再决定使用引用、浅拷贝还是深拷贝。
### Transaction 字段类型与 Field Automation
`uvm_sequence_item` 中的 transaction 字段通常分为两类：一类是与 DUT 接口直接对应的数据字段，如 `addr/data/write`，通常按真实硬件位宽声明为 `bit [N:0]`；另一类是验证环境控制参数，如 `delay/count/repeat_times`，通常声明为 `int unsigned`，因为它们本质上表示非负整数，不需要对应具体硬件位宽。例如 `rand int unsigned delay;` 配合 `delay inside {[0:10]};` 表示随机延迟 0～10 个周期；当然也可以写成 `bit [3:0] delay`，只是工程中 `int unsigned` 更方便。`bit` 是二态类型，只能表示 0/1；若需要保留 X/Z，应使用 `logic` 等四态类型。
`uvm_field_int` 中的 `int` 并不要求成员变量必须声明成 SystemVerilog 的 `int`，而是表示“integral type（整型类型）字段”。因此 `bit`、`logic`、`byte`、`int`、`longint` 以及 packed array 如 `bit [31:0] data` 都可以使用 `uvm_field_int`。尤其要区分 packed 和 unpacked array：`bit [31:0] data` 本质上仍是一个 32-bit 整数，用 `uvm_field_int`；而 `bit [31:0] data[8]` 后面的 `[8]` 是 unpacked 静态数组，因此应使用 `uvm_field_sarray_int`。
Field automation 宏的基本命名规律可以理解为 `uvm_field_[容器类型]_[元素类型]`。单个整型字段使用 `uvm_field_int`，字符串使用 `uvm_field_string`，对象使用 `uvm_field_object`，枚举使用 `uvm_field_enum`；静态数组 `a[10]` 使用 `uvm_field_sarray_*`，动态数组 `a[]` 使用 `uvm_field_array_*`，队列 `a[$]` 使用 `uvm_field_queue_*`。例如 `bit [7:0] a[4]` 用 `uvm_field_sarray_int`，`bit [7:0] a[]` 用 `uvm_field_array_int`，`bit [7:0] a[$]` 用 `uvm_field_queue_int`；若数组元素本身是 `uvm_object`，则对应换成 `*_object`。枚举宏通常还需要显式提供枚举类型。
实际大型项目中通常不会无条件大量使用 `uvm_field_*`。它的优点是代码短，可以自动支持 `copy/compare/print/pack/record` 等操作；缺点是宏展开和通用自动化机制会带来额外运行开销，而且复杂 transaction 对各字段的处理需求往往不同。例如 `delay`、`timestamp` 可能不应参与 scoreboard compare，而 Bridge 验证中的位宽转换、WSTRB 重映射、burst 拆分、大小端转换等也不能通过简单的逐字段相等比较完成。此时手写 `do_copy()`、`do_compare()`、`do_print()` 往往性能更高、行为更明确，也更便于输出针对性的 mismatch 信息和调试。
因此工程中常见的做法是只使用 `uvm_object_utils(my_trans)` 完成 factory 注册，再根据实际需要实现 `do_copy/do_compare/do_print`。要特别注意：不用 `uvm_field_*` 并不意味着不能使用 factory，`type_id::create()` 仍然正常；区别只是 UVM 不再自动知道每个成员变量该如何参与 copy、compare、print 等操作，需要用户自行定义。简单 transaction、学习代码或小规模环境使用 field automation 很方便，而复杂 VIP、大规模回归和高性能 scoreboard 更倾向显式实现这些行为。
### Clone 的返回类型
clone() 返回 uvm_object 句柄，赋给具体 transaction 类型时通常需要 \$cast。复制语义由 do_copy 和字段自动化共同决定，不能把 clone 本身当成深拷贝保证。
实现参考：[Accellera uvm_object](https://github.com/accellera-official/uvm-core/blob/main/src/base/uvm_object.svh)。

## SystemVerilog 数组与随机约束

容器、locator、dist、solve before、历史约束和地址范围。
### 四类数组与 Queue 插入删除
SystemVerilog 常见数组包括固定数组、动态数组、队列和关联数组。动态数组通过 `new[n]` 分配空间，`new[n](old_array)` 可以扩容并保留原数据，`size()` 返回元素个数，`delete()` 释放内容。队列 `int q[$]` 可以动态从两端插入和删除，常用 `push_back()`、`push_front()`、`pop_back()`、`pop_front()`。`q.insert(index, value)` 会在指定下标处插入元素，原位置及之后的元素整体右移；`q.delete(index)` 删除当前该下标对应的元素，后面的元素左移。例如 `q={5,10,20}`，执行 `q.insert(1,100)` 后变成 `{5,100,10,20}`，再执行 `q.delete(2)`，删除的是当前下标 2 的 `10`，最终得到 `{5,100,20}`。
数组 locator method 里，`find()` 和 `find_index()` 要区分清楚：
```text
int a[] = '{1, 5, 8, 3, 10};
int q[$];

q = a.find(x) with (x > 5);
```

返回满足条件的“元素值”：
```text
'{8, 10}
```

而：
```text
q = a.find_index(x) with (x > 5);
```

返回满足条件元素的“下标”：
```text
'{2, 4}
```

这里 `x` 代表当前遍历到的元素值，`x.index()` 才表示当前元素的下标。其他常用数组方法还包括 `sum()`、`product()`、`min()`、`max()`、`sort()`、`rsort()`、`reverse()`、`shuffle()`、`unique()` 等。注意 `min()` 和 `max()` 返回的是队列，而不是普通标量。
### 关联数组中还能放数组和 Queue 吗？
SystemVerilog 关联数组的核心特点是：**索引不要求连续，并且只为实际存在的元素分配存储空间**，因此特别适合“索引空间很大但实际只使用少量位置”的稀疏数据场景。其基本声明格式是 `data_type array_name[index_type];`，例如 `int a[int];`、`int score[string];`。索引可以是 `int`、`string` 等类型，所以也可以把关联数组理解成一种 key-value 映射。
关联数组的“value”不一定只是单个普通变量，也可以继续是其他数组或容器。例如：
```text
int a[int][10];       // 关联数组 -> 固定数组
int a[int][];         // 关联数组 -> 动态数组
int a[int][$];        // 关联数组 -> 队列
int a[int][string];   // 关联数组 -> 关联数组
```

因此 `transaction pending[int][$];` 的含义是：**先用 int 类型的 key 找到一个元素，而这个元素本身是一个 transaction queue**。例如一个 AXI ID 可以对应多笔 outstanding transaction：
```text
ID=0 -> [tr0, tr1, tr2]
ID=3 -> [tr3]
ID=8 -> [tr4, tr5]
```

动态数组和队列都可以作为关联数组的元素，但使用方式不同。`int a[int][];` 中，每个 key 对应的动态数组需要显式 `new[]` 分配长度；而 `int a[int][$];` 中的 queue 不需要预先确定大小，可以直接 `push_back()` / `pop_front()`，因此在验证中处理每个 ID 下数量动态变化的 transaction 时，**关联数组 + queue** 通常更方便。
最容易混淆的一点是：`[int][$]` 不是“二维关联数组”，而是**第一维为关联数组，第二维为 queue**。判断数组类型时直接看每一维的括号形式：`[10]` 固定数组、`[]` 动态数组、`[$]` 队列、`[int]`/`[string]` 关联数组。
### Constraint 联立求解与继承覆盖
SystemVerilog 约束需要区分“多个约束块共同生效”和“继承时同名约束覆盖”。同一个类里的多个 `constraint` 默认是联立求解，而不是后写覆盖前写；例如 `x>10` 和 `x<20` 会同时成立。父类和子类中**同名** constraint block 才存在子类覆盖父类的规则。`inside` 可直接描述取值集合，例如：
```text
x inside {[1:10]};
```

如果所有约束无解，`randomize()` 返回 0，不会得到一个新的合法随机结果，因此验证代码应检查返回值。
### 有符号范围与 Foreach 约束
SystemVerilog 约束中，限定变量范围通常用 `inside`。例如 `PARI` 要随机在 `-128~127`：
```system-verilog
rand int PARI;

constraint c_pari {
    PARI inside {[-128:127]};
}
```

如果变量本身就是 8 位有符号数，可以直接声明 `rand logic signed [7:0] PARI;`，其天然取值范围就是 `-128~127`。若是数组，则用 `foreach` 对每个元素约束，例如：
```system-verilog
rand int a[10];

constraint c_a {
    foreach (a[i])
        a[i] inside {[127:128]};
}
```

### Dist 的 := 和 :/ 有什么区别？
`dist` 用于给随机变量的不同取值设置“相对权重”，权重不要求总和为 100，只看比例。最容易混淆的是 `:=` 和 `:/`。`:=` 对范围中的每一个值分别赋予该权重，例如 `[0:3] := 40` 等价于 0、1、2、3 每个值的权重都是 40；而 `:/` 是整个范围共享该权重，例如 `[0:3] :/ 40` 表示整个 `[0:3]` 区间总权重为 40，再由区间内的值共同分配。因此如果想让某个区间整体占固定概率，应优先用 `:/`。`dist` 控制的是统计分布倾向，不保证有限次随机后严格满足比例，随机次数足够多时才会逐渐接近期望比例。
### Solve Before 为什么改变分布？
`solve a before b;` 用于指定随机变量的求解顺序：先确定 `a`，再在满足全部约束的前提下求解 `b`。它不会改变合法解集合，也不是用来解决约束冲突的，主要作用是影响随机结果的概率分布。典型情况是前一个变量的不同取值对应不同数量的后续合法解，例如：
```system-verilog
rand bit mode;
rand int length;

constraint c {
    solve mode before length;

    if (mode == 0)
        length inside {[1:10]};
    else
        length inside {[1:100]};
}
```

如果不控制求解顺序，`mode=1` 对应的 `length` 合法解更多，可能导致随机结果偏向 `mode=1`；使用 `solve mode before length` 后，会先决定 `mode`，再根据该结果选择合法的 `length`，从而避免前级变量因后级解空间大小不同而被“带偏”。但无论有没有 `solve before`，最终所有 constraint 都必须同时满足。
### 概率与取模约束综合例子
SystemVerilog 约束中，如果 `a=1` 时要求 `b=0/1` 合计 70%、`b=2` 为 30%，应写 `b dist {[0:1] :/ 70, 2 := 30};`。`:/` 表示区间共享总权重，所以 0、1 各约 35%；`:=` 则给区间内每个值相同权重，含义不同。若 `a=0`，可约束 `b==3`；若 `b>=1`，`c inside {[0:255]}`，否则 `c inside {[257:1023]}`；`a=1` 时 `c%8==0`，`a=0` 时 `c%16==0`。若题目要求先求解 A 再求解 B，用 `solve a before b;`。它影响求解分布顺序，不表示约束按代码先后顺序执行。
### 任意连续五次随机都不重复
普通 constraint 不记忆之前结果，需要 history queue：
```system-verilog
class recent_unique;
  rand int unsigned value;
  int unsigned history[$];
  constraint c {
    value inside {[0:99]};
    foreach (history[i]) value != history[i];
  }
  function void post_randomize();
    history.push_back(value);
    if (history.size() > 4) void'(history.pop_front());
  endfunction
endclass
```

每次排除最近4次结果，成功后更新 history。randc 的完整循环不重复比“最近五次”更强，不是同一个分布要求。
### 地址范围、对齐与进制换算如何理解？
地址范围约束中，如果采用常见半开区间 `[X,Y)`，且 X、Y 均为 32 位地址，可以写成：X、Y 低 12 位为 0，实现 4 KB 对齐；`Y > X`；`Y-X` 在 `0x2000~0x100000` 之间，即 8 KB 到 1 MB。若 Y 表示最后一个有效地址，即闭区间 `[X,Y]`，则区间长度应按 `Y-X+1` 计算，此时 Y 本身通常不是 4 KB 对齐，而是满足低 12 位为 `0xFFF`。常用换算：`4 KB = 0x1000`，`8 KB = 0x2000`，`1 MB = 0x100000`；本质上因为 `1 KB = 2^10 Byte`、`1 MB = 2^20 Byte`。十进制小数转二进制采用“小数部分不断乘 2、依次取整数位”的方法，例如 `0.1₁₀ = 0.000110011...₂`，是无限循环二进制小数，因此浮点数中通常只能近似表示。

## 系列其他文章

- [第二篇：仿真调度、并发与 SVA](/posts/dv-simulation-concurrency-sva/)
- [第三篇：数字设计、时序与 CDC](/posts/dv-rtl-timing-cdc/)
- [第四篇：UVM 验证平台](/posts/dv-uvm-platform/)
- [第五篇：AXI 协议](/posts/dv-axi-protocol/)
- [第六篇：Bridge 验证与 AHB/APB](/posts/dv-bridge-ahb-apb/)
- [第七篇：NoC、CHI 与接口带宽](/posts/dv-noc-chi-bandwidth/)
- [第八篇：SoC 验证与工程工具](/posts/dv-soc-engineering/)
