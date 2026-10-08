---
title: "数字验证问答（四）：UVM 验证平台"
pubDatetime: 2026-10-08T14:00:00+08:00
tags: ["数字验证","UVM"]
description: "Phase、Objection、Factory、Config DB、TLM、Sequence、Monitor 与 RAL。"
---

这篇是数字验证问答系列的第四篇，整理自我的复习笔记。Phase、Objection、Factory、Config DB、TLM、Sequence、Monitor 与 RAL。

[查看系列目录](/series/digital-verification/)

## 目录

## UVM：启动、Phase 与 Objection

run_test、组件树、阶段并发、结束条件及 reset jump。
### Run_test 如何创建 UVM 组件树？
一个 UVM 验证平台的启动，本质上是“仿真器启动 → SystemVerilog 顶层执行 → `run_test()` 进入 UVM 世界 → 创建 test → phase 构建并运行整个平台”。`tb_top` 中的 DUT、interface 等属于静态 SystemVerilog 层次，在仿真 elaboration 阶段已经建立；UVM 的 class 层次则通常从 `initial begin run_test(); end` 开始启动。`run_test()` 会取得 UVM 的 `uvm_root` 单例并进入它的运行流程。`uvm_top` 本质上是指向这个 `uvm_root` 的全局句柄，而不是先有 `uvm_top` 再创建一个 `uvm_root`。最终典型组件树是：
```system-verilog
uvm_root
└── uvm_test_top          // type 可能是 axi_test
    └── env
        ├── agent
        │   ├── sequencer
        │   ├── driver
        │   └── monitor
        └── scoreboard
```

这里要特别区分“类型名”和“实例名”。例如命令行指定 `axi_test`，factory 创建的 class 类型是 `axi_test`，但顶层 test 的实例名通常固定为 `uvm_test_top`。`run_test()` 并不会一次性创建整个验证环境，它先通过 factory 创建 test，然后进入 UVM phase；test 在自己的 `build_phase` 创建 env，env 再创建 agent、scoreboard，agent 再创建 driver、sequencer、monitor，因此 UVM component hierarchy 是在 `build_phase` 中由上到下逐层建立的，之后 `connect_phase` 建立 TLM 等连接，`run_phase` 才真正开始产生和处理激励。
test 名通常来自仿真器命令行的 `+UVM_TESTNAME=<test_type>`。UVM 内部通过命令行处理机制读取这个 plusarg，然后把字符串交给 factory，根据已经注册的类型创建对应 test。因此 test 必须通过类似 ` uvm_component_utils(axi_test)` 注册到 factory。Makefile 本身与 UVM 没有直接关系，例如：
```text
TEST = axi_test

run:
	./simv +UVM_TESTNAME=$(TEST)
```

执行 `make run TEST=axi_write_test` 时，Make 只是做文本替换，最终真正执行的是：
```text
./simv +UVM_TESTNAME=axi_write_test
```

所以 `TEST`、`TESTNAME` 等 Make 变量名完全是工程自己定义的；UVM 真正识别的是 `+UVM_TESTNAME=`。完整链路可以记成：`make变量 → shell命令 → 仿真器plusarg → run_test/uvm_root → factory → uvm_test_top`。`run_test("axi_test")` 也可以直接提供 test 名；存在 `+UVM_TESTNAME` 时，通常以命令行指定的 test 为准。
### Phase Callback 为什么会自动执行？
UVM 的 phase 本质上是框架提供的一套生命周期调度机制。`uvm_component` 中的 `build_phase()`、`connect_phase()`、`run_phase()`、`check_phase()`、`report_phase()` 等并不是因为“class 里的 task/function 会自动执行”，而是因为 UVM phase scheduler 会在规定时机主动调用这些 callback。普通 class 中自己定义的 `task`/`function` 不会自动执行，必须显式调用。类似地，`uvm_sequence` 的核心 `body()` 之所以会执行，是因为调用 `seq.start(sequencer)` 后，UVM 的 sequence 执行框架会进入 sequence 的生命周期并调用 `body()`；`body()` 用于描述这个 sequence 具体如何产生和组织 transaction，例如发多少笔、以什么顺序发、启动哪些子 sequence。可以简单理解为：**transaction 描述“一笔数据长什么样”，sequence 的 **`body()`** 描述“这些数据怎么发”。**
Phase 要区分 function phase 和 task phase。`build/connect/check/report` 等属于 function phase，不能通过 `#delay`、`@event` 等消耗仿真时间，因此它们的生命周期不需要 objection 来维持；即使从 API 层面能够调用 `raise_objection()`，在这类 phase 中也没有正常的使用意义。`run_phase`、`reset_phase`、`configure_phase`、`main_phase`、`shutdown_phase` 等属于 task phase，可以耗时，objection 主要用于这些运行阶段。**Objection 的作用不是让某个 component 获得执行资格，而是阻止整个相关 phase 过早结束。** 因此一个 component 即使完全不 raise objection，只要其他 component 仍然持有 objection，它的耗时任务仍然能够正常运行。
### 同一 Task Phase 中的组件为什么并发运行？
同一个 task phase 中，各 component 的对应 phase task 是并发运行的。例如进入 `run_phase` 后，test、driver、monitor、scoreboard 等各自的 `run_phase()` 都会并发执行，而不是按照组件树一个执行完再执行另一个。Driver 和 monitor 通常写成长期后台线程：
```system-verilog
task run_phase(uvm_phase phase);
    forever begin
        ...
    end
endtask
```

它们通常**不应该自己 raise objection**，因为它们并不知道整个测试什么时候完成，而且 `forever` 本身通常也不会自然退出；如果 driver 一开始 raise，却把 drop 写在 `forever` 后面，drop 永远执行不到，phase 就可能无法结束。更合理的做法是由知道“测试何时完成”的 test、virtual sequence 或顶层场景控制逻辑管理 objection。例如：
```system-verilog
task run_phase(uvm_phase phase);
    phase.raise_objection(this);

    seq.start(env.agent.sequencer);

    phase.drop_objection(this);
endtask
```

在 `seq.start()` 执行期间，driver、monitor 即使没有 raise objection，也会继续运行。当最后一个 objection 被 drop、objection count 归零后，UVM 才允许运行阶段结束，并终止仍然运行在该 phase 中的后台线程。因此最重要的理解是：**不 raise objection ≠ 不运行；objection 控制的是 phase 生命周期，不是 component 的线程开关。**
### 谁应该负责 Objection？
实际工程中，objection 一般集中在 test 或负责整体场景的 virtual sequence 中，而不是让 driver、monitor、scoreboard 各自管理。判断原则可以概括为：**谁掌握“这个测试场景什么时候真正完成”，谁更适合管理 objection。** Sequence 中也可以通过 `pre_body/post_body` 或 automatic phase objection 管理，但应避免多个层级随意重复 raise/drop，否则容易造成生命周期难以追踪。
### 测试结束前应该等待哪些条件？
UVM 的 objection 应该围绕“测试是否真正完成”来管理，而不是单纯等到 timeout。正常结束通常要求：sequence 已经停止产生新激励、driver/DUT 中没有未完成 transaction、所有 response 已返回、reference model 已处理完、scoreboard 待比较队列为空，即整个环境达到 quiescent 状态后再 `drop_objection()`。Timeout 是 watchdog，用于发现 DUT 卡死、sequence 死锁等异常，不是正常结束条件。AXI 这类协议中尤其要注意，`finish_item()` 完成不代表 transaction 已经真正结束；可能还有 outstanding request、B/R response 或 scoreboard 比较尚未完成。
### UVM Phase 的完整流程
UVM 的整体 phase 流程可以粗略理解为：
```text
build
  ↓
connect
  ↓
end_of_elaboration
  ↓
start_of_simulation
  ↓
runtime
  ↓
extract
  ↓
check
  ↓
report
  ↓
final
```

其中 runtime 还可以细分为：
```text
pre_reset → reset → post_reset
          ↓
pre_configure → configure → post_configure
          ↓
pre_main → main → post_main
          ↓
pre_shutdown → shutdown → post_shutdown
```

传统的 `run_phase()` 可以看作覆盖整个运行期的长期 task，而这些细分 runtime phases 用来进一步组织 reset、配置、主测试、收尾等阶段。简单环境经常只使用 `run_phase()`；复杂环境可能使用 `reset_phase/main_phase/shutdown_phase` 等细分阶段。
### Default Sequence、Starting Phase 与 Phase Jump
`default_sequence` 的隐式启动与 sequence 中使用 `phase` 是两套不同机制。`default_sequence` 通常通过 `uvm_config_db` 配置，例如把某个 sequence type 设置到 `sequencer.main_phase` 的 `"default_sequence"` 字段；当对应 task phase 到来时，UVM 会自动创建并启动该 sequence。相比之下，sequence 内部的 `starting_phase`/`get_starting_phase()` 是 `uvm_sequence_base` 自身维护的 phase 上下文，不是 sequence 再通过 `config_db` 去获取。由某个 phase 的 `default_sequence` 自动启动时，UVM 会把对应 phase 关联给 sequence；而如果直接 `seq.start(sequencer)` 显式启动，sequence 通常并不知道自己属于哪个 phase，`starting_phase` 可能为 `null`。实际工程中更常见的是由 test 或 virtual sequence 显式启动 sequence，并由 test 的 `run_phase/main_phase` 统一负责 `raise_objection()` / `drop_objection()`，这样生命周期和调试关系更清晰。
UVM 中动态改变 phase 流程使用的是 `phase.jump(target_phase)`，而不是独立的 `jump_phase()` API。它最典型的用途是运行过程中发生系统级复位，例如 DUT 在 `main_phase` 处理中途收到 warm reset / soft reset，需要从 `main_phase` 跳回 `reset_phase`，然后重新经历 `reset → configure → main`，使 DUT 和验证环境重新初始化。也可以向后的 phase 跳，例如提前从 `main_phase` 跳到 `shutdown_phase`，但工程中最常见、最合理的应用仍然是运行时 reset/recovery，而不是把它当成普通流程跳转工具。
`phase.jump()` 是 phase scheduler 级别的控制，不只是让调用它的某一个 component 改变执行位置。发生 jump 时，当前 phase 的 task 进程会被终止，相关 domain 转移到目标 phase，因此它属于比较“重”的控制机制。使用时必须特别处理尚未完成的 transaction、outstanding 请求、sequence、driver 状态、scoreboard 队列和 reference model 状态，否则虽然 phase 回到了 reset，验证环境内部仍可能残留复位前的数据。核心理解可以概括为：**`default_sequence`** 解决“某个 phase 自动运行哪个 sequence”，**`starting_phase`** 表示“这个 sequence 当前关联哪个 phase”，而 **`phase.jump()`** 解决“整个 UVM phase 流程运行过程中需要跳到哪个 phase”。
### 层次遍历顺序不等于运行并发顺序
UVM phase 中，“层次遍历顺序”和“是否并发执行”是两个不同概念。`build_phase` 通常自顶向下，因为父组件需要先创建子组件；`connect_phase`、`end_of_elaboration_phase`、`check_phase`、`report_phase` 等多数 function phase 通常自底向上。而 `run_phase()` 是 task phase，各 component 的 `run_phase()` 会作为并发进程运行，例如 driver 发激励、monitor 采样、scoreboard 比对可以同时进行。即使框架内部存在组件访问或启动顺序，也不能依赖这个顺序把各个 `run_phase()` 当成串行执行。

## UVM：Factory、Config DB 与 Callback

创建替换、配置匹配与优先级、局部行为扩展。
### UVM 四套核心机制分别负责什么？
UVM 的很多“高级机制”本质上都是在 SystemVerilog OOP 之上增加一层间接控制。Factory 解决“创建什么类型”，Config DB 解决“组件拿到什么配置”，Phase 解决“什么时候做什么”，TLM 解决“组件之间怎么以 transaction 级通信”。理解这四套机制时，不要把它们当成独立魔法，而要抓住共同底层：类继承与多态、对象句柄、参数化类、全局注册表、层次路径、方法转发以及并发 task。
### Factory 为什么需要 wrapper，override 如何匹配？
Factory 的核心是“类型注册 + wrapper/proxy + override”。`type_id::create()` 最终仍然会执行某个具体类的 `new()`，只是创建前先让 Factory 查 override 规则，决定到底调用谁的构造函数。UVM 之所以需要 `uvm_object_wrapper` / `uvm_component_registry` 这类代理，是因为 SystemVerilog 不能像普通数据一样把“类类型”直接存进表里，再运行时取出并动态 `new`；因此 UVM 为每个注册类型建立一个普通 proxy 对象，由 proxy 知道如何创建对应类。`by type` 直接使用 wrapper 句柄建立 `requested_wrapper → override_wrapper` 的映射，而 `by name` 先用 `"my_driver"` 这样的字符串查注册表再得到 wrapper，所以字符串拼写错误只能运行时发现，type-based 通常更安全。Type override 替换某类的所有创建请求；instance override 则额外匹配 instance path。Component 天然具有真实的 UVM hierarchy，因此路径容易确定；`uvm_object` 虽然也支持 Factory 和 instance override，但它不属于 component tree，需要创建时提供合适的 context 来构造用于匹配的“逻辑路径”。Singleton 则是“一种类型只维护一个共享实例”的设计，例如全局 Factory、resource pool、`uvm_root::get()`；它保证 test、env、driver 等访问的是同一份全局状态。
### Factory Override 的生效时机
Factory override 的关键条件不是“必须在哪个 phase 设置”，而是必须发生在目标对象的 `type_id::create()` 之前。component 通常在 build 阶段创建，因此 component override 一般要在对应 component 被创建前设置；到 run phase 才设置通常已经无法改变已创建的 env、agent、driver，但仍可影响之后才通过 factory 创建的 sequence 或 transaction。`set_type_override_by_type()` 是类型级全局替换：以后通过 factory 请求创建基类时，会改为创建指定派生类；`set_inst_override_by_type()` 则只针对指定实例路径。最重要的一句话是：**override 只影响之后的 factory **`create()`**，不会把已经存在的对象“变成”派生类。**
### Config DB 如何解析路径和配置优先级？
Config DB 本质是建立在 resource mechanism 上的“全局资源池 + 层次路径匹配 + 优先级规则”。`set()` 不是把变量直接传给某个 component，而是把“类型、field name、scope、value”等信息存入 resource pool；`get()` 再根据类型、字段名和当前 component 路径进行查找。`cntxt` 可以理解为“相对路径从哪里开始解释”，最终解析出来用于匹配的范围就是 scope。例如 `set(this, "agent.drv", ...)` 中，若 `this` 是 `uvm_test_top.env`，最终 scope 类似 `uvm_test_top.env.agent.drv`；`null` 通常表示按绝对路径理解。Config DB 并不是只能存 component，它可以存 `int`、`virtual interface`、config object 等任意匹配的类型，但它的路径坐标系依赖 `uvm_component` hierarchy，因此 `set/get` 的 context 参数是 `uvm_component`。Sequence 属于 `uvm_object`，不能直接拿 `this` 当 config_db context，通常通过 `m_sequencer/p_sequencer`、显式传入配置对象等方式获取配置。
### 配置匹配和优先级为什么要分开理解？
`uvm_config_db` 的核心要分成两件事理解：**“能不能匹配到”** 和 **“多个匹配项里谁生效”**。`set(cntxt, inst_name, field_name, value)` 中，`cntxt + inst_name` 一起决定配置的目标作用域，`field_name` 决定配置项名字；所以第 3 个参数相同并不代表冲突，只要实例路径不同，就可以分别配置不同组件。`get()` 时也是根据调用位置、目标路径和 `field_name` 去匹配对应配置。
真正涉及多次 `set()` 冲突时，build 阶段的优先级主要由第 1 个参数 `cntxt` 的层次决定，而不是看第 2 个参数路径谁更深、更具体。使用 `this` 时，`cntxt` 就是当前 component，因此不同层次的设置会体现层次优先级：通常**高层 component 的配置优先；同一 precedence 下，后一次 set 生效**。例如 test/env/agent 都用 `this` 设置同一个最终目标时，高层设置可以压过低层设置。
如果多次 `set()` 的第 1 个参数都写成 `uvm_root::get()`，虽然第 2 个参数仍然负责指定目标路径，但这些配置的 `cntxt` 都变成了 root，因此它们的 precedence 被拉平。若多条配置同时匹配同一个 `get()`，就按同优先级规则处理，即通常 **last set wins**。由于 UVM 的 `build_phase` 一般是父组件先执行、子组件后执行，所以表面上可能表现成“低层组件的 set 生效”，但本质不是低层优先，而是它执行得更晚。
最容易混淆的一点是：**前两个参数确实共同决定匹配范围，但并不是共同决定优先级。** 可以记成：
```text
能否匹配：
cntxt + inst_name + field_name

多个匹配项谁生效：
build 阶段主要看 cntxt 的 precedence
precedence 相同 → 后 set 的生效
```

另外，高层优先这套规则主要针对 build-time 配置；build 阶段之后，各设置通常使用相同的默认 precedence，此时更接近单纯的“后写覆盖前写”。 `uvm_root::get()` 只是取得 UVM 根组件句柄，用作 `set()` 的 context，和 `uvm_config_db::get()` 不是一回事。
### Callback 与 Factory 如何用于异常注入？
UVM callback 机制与 phase callback 要区分。Phase callback 是 UVM 框架固定时机调用 `build_phase/run_phase`等；用户自定义 callback 则是某个 driver、monitor 等组件主动预留的扩展 hook，例如 `pre_drive/post_drive`。Component 作者定义 callback 基类并注册 callback，运行到 hook 点时遍历已注册 callback 对象并调用其方法，从而在“不替换整个 component”的情况下插入行为。异常注入常见方式包括：通过 sequence/transaction 生成非法或边界激励；通过 Factory Override 替换 transaction 或 driver；通过 callback 修改特定 transaction、延迟响应或翻转数据；通过 config knob 控制错误概率和模式；以及用 `uvm_hdl_force/deposit` 等方式直接破坏 DUT 内部寄存器、FIFO 指针、ECC 位等状态。Factory 更适合整体行为替换，callback 更适合局部 hook 式修改。
### VIP Callback 的使用细节
UVM/VIP 的 Callback 本质是一种“局部扩展机制”：VIP 或组件在内部预留 hook point，例如 pre-drive、post-drive、response 等位置，用户可注册 callback，在不修改原 VIP 源码的情况下插入自定义逻辑。典型用途包括错误注入、延迟调整、修改 transaction、日志统计和异常场景构造。Callback 与 Factory Override 的区别是：Callback 只在预留位置追加或修改局部行为，而 Factory Override 是用新类替换原类的整体实现。第三方 VIP 中若只需改变少量行为，Callback 通常更合适；若组件整体行为都需要替换，则更适合使用 Factory Override。Callback 使用时还要注意多个 callback 的执行顺序、重复注册，以及修改 transaction 后是否会导致 scoreboard 的预期模型与实际激励不一致。

## UVM：TLM、Sequence 与 Monitor

事务通信、握手完成、response、对象所有权和采样。
### SV、UVM 与平台组件的完整关系
SystemVerilog（SV）是语言，UVM 是建立在 SV 之上的验证方法学和类库。SV 提供 `class`、继承、多态、`virtual`、随机化约束、interface、队列等语言能力；UVM 用这些能力规定了一套标准验证架构。典型 UVM 数据流是 `sequence → sequencer → driver → DUT → monitor → scoreboard/coverage`：`sequence_item` 描述一笔事务，sequence 产生事务，sequencer 做事务传递和仲裁，driver 把 transaction 转成接口时序，monitor 把接口信号重新还原成 transaction，scoreboard 做期望值与实际值比较。agent 通常封装 driver、sequencer、monitor，env 再组织多个 agent、参考模型和 scoreboard，test 位于顶层负责配置环境和启动 sequence。UVM 的 factory、phase、objection、TLM、config_db 等机制，本质上都建立在 SV 的面向对象机制之上，因此理解 class、句柄、继承、多态和虚方法是理解 UVM 的基础。
### Port、Export、Imp 和 blocking 接口是什么？
TLM 的核心不是“端口上传输比特”，而是“组件之间通过标准化方法调用传递 transaction”。`put/get/peek/write/transport` 本质都是方法接口。Port、Export、Imp 的角色必须分清：Port 表示“我需要调用某个服务”，Imp 表示“这个 component 真正实现该方法”，Export 表示“我自己不实现，只把内部服务向外暴露/转发”。因此典型调用链是 `port → export(可选) → imp → component method`。`imp` 本质也是代理：它保存真正实现者的句柄，并把 `put()`、`write()` 等调用转发过去。Blocking 接口是 task，可以等待；nonblocking 接口是 function，必须立即返回，例如 `try_put()` / `can_put()`。`get` 会取走对象，`peek` 只查看不删除，`transport` 用于 request-response。
### Port→Port、Export→Export 是否合法？
TLM 连接中，`port -> port` 和 `export -> export` 都可以合法存在，主要用于层次化透传，并不能仅凭“同类型相连”判断非法；常见的数据调用链最终是 `port -> export/imp`。判断是否合法要看 TLM 接口类型、调用方向和组件层次关系，而不是只看 port/export 名称。
### Analysis 广播如何与耗时比较解耦？
Analysis Port 是 UVM 中最常见的 TLM 模式之一，典型用于 `monitor → scoreboard/coverage/ref_model`，特点是一对多广播。`ap.write(tr)` 会同步调用所有连接 subscriber 的 `write()`，因此 `write()` 是 function，不能阻塞。如果接收方需要等待另一条流、时钟或长期比较，通常在 Analysis Port 后接 `uvm_tlm_analysis_fifo`：monitor 用非阻塞的 `write()` 快速入 FIFO，scoreboard 在 `run_phase` 中通过 blocking `get()` 等待数据，从而完成“function 世界到 task 世界”的时间解耦。普通 `uvm_tlm_fifo` 则可理解为 queue 外面封装了 `put/get/peek/try_*` 等标准 TLM 接口，用于生产者—消费者解耦。
### Sequence 怎样通过 Sequencer 把 Item 交给 Driver？
Sequence 部分最容易混淆的一点是：**真正沿数据通路传递的不是 sequence，而是 sequence_item/transaction。** sequence 是一个行为过程，调用 `seq.start(seqr)` 的含义是让这个 sequence 在指定 sequencer 上执行，它的 `body()` 随后产生一个又一个 transaction。典型路径是：
```text
test
  │ seq.start(seqr)
  ▼
sequence.body()
  │
  │ start_item(req)
  │ randomize / 填写 req
  │ finish_item(req)
  ▼
sequencer
  │
  ▼
driver.get_next_item(req)
  │
  │ transaction → pin-level 时序
  ▼
DUT
  │
driver.item_done()
```

`start_item(req)` 的核心作用是向 sequencer 申请该 item 的发送资格并等待仲裁；获得 grant 后 sequence 才填写或随机化 transaction。`finish_item(req)` 会把 item 提交给 sequencer，并完成与 driver 的握手流程，通常会等待 driver 对该 item 调用 `item_done()`。driver 则不断执行 `get_next_item(req) → drive(req) → item_done()`。因此 sequence 不需要知道 driver 的具体位置，driver 也不需要知道是哪一个 sequence 产生了 item；双方都只与 sequencer 交互，这实现了激励描述和物理总线时序的解耦。
Sequencer 的价值也不只是“中转”。多个 sequence 可以同时在同一个 sequencer 上请求发送 transaction，因此 sequencer 还承担 sequence 管理和仲裁。可以把三者职责概括为：sequence 描述“要做什么”，例如产生地址、数据、burst 等 transaction；sequencer 决定“谁现在可以发”，并完成 sequence 与 driver 之间的握手；driver 决定“在具体协议线上怎么做”，把 transaction 转换成 DUT 能看到的 pin-level 信号。Monitor 则执行相反转换，把 DUT/interface 上的信号重新整理成 transaction，再送给 scoreboard、coverage 等组件。由此形成 UVM 的核心数据闭环：
```text
sequence
   ↓ 产生 transaction
sequencer
   ↓ 仲裁/传递
driver
   ↓ transaction → signal
DUT
   ↓ signal
monitor
   ↓ signal → transaction
scoreboard / coverage
```

### Driver 和 Sequencer 的端口如何连接？
Sequencer 与 driver 之间通常不需要自己重新声明通信端口，因为 `uvm_driver` 已有 `seq_item_port`，`uvm_sequencer` 已有 `seq_item_export`，只需要在 agent 的 `connect_phase()` 中连接：
```text
drv.seq_item_port.connect(seqr.seq_item_export);
```

### Item 完成与总线完成必须区分
finish_item 返回说明 sequencer 侧的 item 完成协议已结束，含义取决于 driver 何时调用 item_done。流水 driver 可先接受 request，之后才收到 DUT 的 B/R，因此它不自动保证总线事务和 scoreboard 都已完成。
Response 是独立机制，可通过 item_done(rsp) 一并返回，也可先 item_done 再 put_response(rsp)。使用 rsp.set_id_info(req) 保存 sequence/transaction 身份，sequence 通过 get_response 等待。整个 sequence 在 body 等生命周期流程返回后结束。
### Analysis Port 的句柄所有权与历史数据污染
UVM 的 TLM（Transaction-Level Modeling）强调组件之间传递“事务对象”，而不是逐根传递 DUT 引脚信号，更不是让所有组件共同访问某个全局变量。比如 monitor 通过 `analysis_port.write(tr)` 广播 transaction 时，多个 subscriber 通常收到的是指向**同一个 transaction 对象的 handle**，并不会自动为每个 subscriber `clone` 一份。因此 subscriber 一般应把收到的 transaction 当只读对象；如果需要修改，或需要独立、长期保存，应自行 `clone()/copy()`。同时还要区分“同一笔事务广播给多个组件”和“不同笔事务”：同一笔事务广播时可以共享同一个对象 handle，但 monitor 采集下一笔事务时通常应重新 `create` 新对象，否则如果不断复用同一 handle，而 scoreboard 又把 handle 存入 queue，就可能导致历史记录实际上全部指向最后被修改的那个对象。TLM 与共享全局变量的根本区别不在“内存里是不是同一个对象”，而在通信方式：TLM 是显式的消息/事务传递，生产者通过 port 把对象送给消费者；全局变量则是多个组件共同读写一个公共状态，耦合更强，也容易出现时序和所有权问题。
### Monitor 的创建、等待和采样规则
UVM monitor 中有三个常见陷阱。`uvm_analysis_port` 声明后必须 `new("ap", this)`；`forever` 中必须存在耗时操作，否则当条件不满足时会形成 zero-time infinite loop，把仿真卡死，因此通常写成“先 `@(posedge clk)`，再判断 valid/ready，再采样”；transaction 也不要只在循环外创建一次反复修改，因为 analysis port 传递的是对象句柄，并不会自动 deep copy，如果 subscriber 把句柄存起来，后续修改会污染之前的数据。稳妥写法是每采到一笔事务创建一个新的 transaction，再 `ap.write(tr)`。Monitor 的典型节奏可以记成：等待采样沿 → 判断握手 → 创建 transaction → 采字段 → 广播。
### 320×240 图像接口如何按有效握手采集？
图像接口 monitor 的核心规则是：`VSYNC` 只表示一帧开始，`HSYNC` 只表示一行开始，真正的数据传输条件是 `valid && ready`。320×240 图像可直接按“等 VSYNC → 循环 240 行；每行等 HSYNC → 循环 320 次有效握手”的方式采集。每次只有在 `valid && ready` 时才执行 `data[y][x] = vif.data` 并推进计数，`ready=0` 时即使 `valid=1` 也不能认为传输了数据。二维数组 `data[240][320]` 比一维映射更直观；正式 UVM 环境中通常在一帧收满后封装成 transaction，再通过 analysis port 送到 scoreboard。
### 哪些接口能阻塞？
UVM 中要区分事务对象和握手接口。`uvm_sequence_item` 主要承载事务数据，阻塞握手方法主要位于 sequence、sequencer 和 driver 交互中。Sequence 侧常见阻塞调用有 `start_item()`、`finish_item()`、`get_response()`、`wait_for_grant()` 和 `wait_for_item_done()`；driver 侧的 `get_next_item()`、`get()`、`peek()` 会等待事务，而 `try_next_item()` 无可用 item 时可返回 null，但它仍是 task，可能经历内部调度等待，不能当作可在 function 中调用的 try_get。`send_request()` 负责发送请求，本身不等价于“等待 driver 完成”。
接口实现参考：[Accellera uvm_sequencer](https://github.com/accellera-official/uvm-core/blob/main/src/seq/uvm_sequencer.svh)。

## UVM RAL：访问、镜像与 Prediction

actual/mirrored/desired、前后门及自动/显式预测。
### Actual、Mirrored、Desired 与 RAL API
UVM RAL 中，actual 是 DUT 的真实寄存器值，mirrored 是模型认为 DUT 当前具有的值，desired 是模型希望寄存器达到的值。
- `mirror()` 读取 DUT，可通过 UVM_CHECK 将读回值与更新前的 mirror 比较，再更新模型。
- `peek()/poke()` 通过后门读取或修改 DUT。
- `set()` 按字段访问策略修改 desired，不访问 DUT；对于 W1C 等字段，不能直接把参数当作普通 RW 字段的最终值。
- `update()` 根据 `needs_update()` 判断模型是否需要写入，再按访问策略构造写值。普通 RW 字段可用 desired 与 mirrored 的差异理解，但不能据此替代所有特殊字段语义。它不会先读取 actual 再作比较。
参考：[Accellera UVM 1.2 Class Reference](https://www.accellera.org/images/downloads/standards/uvm/UVM_Class_Reference_Manual_1.2.pdf)。
### Auto Prediction 和 Explicit Prediction 的原理与选择
UVM RAL 中的 prediction 用来解决一个核心问题：**DUT 中寄存器真实值变化后，RAL 中的 mirrored value 如何保持同步。** `mirrored value` 表示寄存器模型“认为 DUT 当前是什么值”，而 prediction 的作用就是根据访问结果更新这个 mirror。
- **自动预测（auto prediction）**通过 `reg_model.default_map.set_auto_predict(1)` 开启。它适用于由 RAL 自己发起的访问，例如 `reg_model.ctrl.write(..., UVM_FRONTDOOR)`。这类访问会经过 `uvm_reg_map → adapter → bus sequencer/driver → AXI/AHB/APB → DUT`，因为 RAL 知道自己发起了什么操作，所以访问完成后可以自动更新 mirror。它结构简单，适合 block-level、寄存器基本功能测试、RAL bring-up，以及“所有寄存器访问基本都由 RAL API 发起”的环境。
- **显式预测（explicit prediction）**则是根据外部实际观察到的访问主动更新 mirror，最典型结构是 `bus monitor → uvm_reg_predictor → RAL`。Monitor 捕获 AXI/AHB/APB 上真正发生的 transaction，predictor 借助 adapter 将 bus transaction 转成寄存器操作，再根据 reg map 找到目标寄存器并调用预测机制更新 mirror。直接调用 `reg.predict(value)` 本身也属于显式预测；`uvm_reg_predictor` 本质上就是把“监控总线并调用 predict”这件事自动化。它更适合 SoC、MCU、多 Master 环境，因为 CPU、DMA、其他 VIP 等都可能修改寄存器，而这些操作并不一定由 RAL 发起。
这里最容易混淆的是：**“前门/后门”和“自动/显式预测”是两个不同维度。** 前门描述“怎样访问 DUT”，prediction 描述“RAL 如何知道 DUT 已经变化”。CPU 通过 AXI/AHB 写寄存器当然也是前门访问，只不过它绕过的是 **RAL API**，不是总线。因此：
```text
RAL frontdoor：
reg_model.write()
    ↓
reg_map → adapter → bus → DUT
    ↓
auto_predict 可以知道

CPU / DMA frontdoor：
CPU / DMA → bus → DUT
                 ↓
              monitor
                 ↓
             predictor
                 ↓
             RAL mirror

auto_predict 不知道，因为访问没有经过 RAL API

RAL backdoor：
RAL → HDL path → DUT register
      不经过总线
```

因此选择原则可以概括为：**如果寄存器访问基本全部通过 RAL 发起，自动预测最简单；如果存在 CPU、DMA、多 Master、firmware 或普通 bus sequence 等绕过 RAL API 的访问，就优先显式预测。** 更进一步，如果希望 mirror 以“总线上实际观察到的行为”为准，而不是以 testbench“打算做什么”为准，显式预测也更可靠。正式复杂环境中常见做法是关闭 `auto_predict`，使用 `monitor + uvm_reg_predictor` 建立观测闭环。
最后一个工程上的注意点：通常不要让 auto prediction 和 predictor 同时对同一笔访问重复负责更新 mirror。常见配置是使用 predictor 后执行：
```text
reg_model.default_map.set_auto_predict(0);
```

这样由总线 monitor 观察到的实际事务统一驱动 RAL mirror 更新。
### 总线 Predictor 的观测范围
后门不经过总线，bus monitor 无法直接观察；硬件自主更新、复位以及寄存器读写副作用也需结合访问策略和模型同步机制处理。Prediction 维护模型状态，不等于替代寄存器功能检查。
寄存器 update 的实际 needs_update 行为还受字段访问策略影响；desired 与 mirrored 不同是理解普通可读写寄存器的入门模型，不应替代特殊访问策略的定义。
### 补充：W1C、Read-clear 与硬件自主更新怎么检查？
W1C 的总线写入值是“清除掩码”，不是希望最终保存的普通数据。例如原值1011、写入0010，按W1C语义应得到1001；不能用普通RW的“写什么读回什么”检查。
Read-clear 要同时检查本次读回的旧状态和读取后的状态变化。Predictor与mirror比较必须考虑访问策略，避免把清除后的镜像拿来错误比较本次返回的旧值。
硬件自行置位的状态字段不能只靠写总线predictor同步。可在已知事件后主动读回/同步模型，或由专门观测机制预测；如果值本来异步变化，可对相应字段设置恰当的比较策略，再由独立功能检查验证其行为。关闭比较不等于该字段已验证。
Reset测试应区分“对DUT施加真实复位”和“reg_model.reset()重置模型状态”；只调用模型reset并不会复位硬件。复位后应按规格检查默认值及保留字段。
参考：[Accellera UVM 寄存器字段访问策略](https://www.accellera.org/images/downloads/standards/uvm/UVM_Class_Reference_Manual_1.2.pdf)。

## 系列其他文章

- [第一篇：SystemVerilog 语言基础](/posts/dv-sv-basics/)
- [第二篇：仿真调度、并发与 SVA](/posts/dv-simulation-concurrency-sva/)
- [第三篇：数字设计、时序与 CDC](/posts/dv-rtl-timing-cdc/)
- [第五篇：AXI 协议](/posts/dv-axi-protocol/)
- [第六篇：Bridge 验证与 AHB/APB](/posts/dv-bridge-ahb-apb/)
- [第七篇：NoC、CHI 与接口带宽](/posts/dv-noc-chi-bandwidth/)
- [第八篇：SoC 验证与工程工具](/posts/dv-soc-engineering/)
