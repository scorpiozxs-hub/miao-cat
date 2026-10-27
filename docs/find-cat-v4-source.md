Here is the result of "fetch" for the Page with URL https://app.notion.com/p/406045159e18809bb54dceb9fe915dc7 as of 2026-10-27T17:27:09.944Z:
<page url="https://app.notion.com/p/406045159e18809bb54dceb9fe915dc7">
<ancestor-path>
<parent-page url="https://app.notion.com/p/400045159e1880bf9093de53fe0eb675" title="《摸凹猫》H5 游戏需求文档 V3.0"/>
<ancestor-2-page url="https://app.notion.com/p/400045159e188023a867f3738d3ec2f3" title="自制小游戏"/>
<ancestor-3-page url="https://app.notion.com/p/37f045159e18804bb95dd01da768b967" title="AI ALL"/>
</ancestor-path>
<properties>
{"title":"第二次修改，改为找猫小游戏"}
</properties>
<iconMetadata>null</iconMetadata>
<content>
原始界面需求链接：

<p>
<mention url="https://app.notion.com/p/400045159e1880bf9093de53fe0eb675">《摸凹猫》H5 游戏需求文档 V3.0</mention>
</p>

<p />

# 《摸凹猫：找猫挑战》可编程策划 V4.0

依据：<mention url="https://app.notion.com/p/400045159e1880bf9093de53fe0eb675">《摸凹猫》H5 游戏需求文档 V3.0</mention>；<mention url="https://app.notion.com/p/403045159e188000acfbce7cc4d6a8a5" />；本轮用户明确提出的找猫规则。冲突时，本轮规则优先，其次第一次修改，其次原始文档。

## 一、产品定位与规则变更

一句话：先画出一只识别度超过50分的猫，再从50只翻滚跳跃的猫中找出它，以找到的用时挑战全站前20名。

核心闭环：绘画 → 达到提交门槛 → 命名、服务端保存与审核 → 进入50只猫的广场 → 开始计时 → 点击自己的猫 → 记录成绩并展示前20名 → 自由浏览或重新画猫。

### 1.1 已确定的用户要求

- 第一关保留绘画和实时识别，只有大于50分才允许提交。
- 第二关必须同时显示50只猫，有滚动、跳跃等整图运动。
- 玩家找到并点击本轮自己画出的猫后，记录用时。
- 用时越短，排行榜位置越高；展示前20名用户。
- 找猫结束后，才允许通过 hover 查看每只猫的名字和艺术家。
- 支持重新开始游戏。
- 所有主动提交的作品进入服务器持久保存，不再只保存在浏览器。
- 保留一屏广场，页面和舞台均不能上下或左右滚动；删除“最新作品”“我的猫咪”及作品卡片流。
- 保留必填艺术家昵称，不提供“匿名创作”选项；无需增加注册页面。

### 1.2 为便于开发采用的默认规则

以下属于本次策划补全，可作为首版实现标准：

<table header-row="true">
<colgroup>
<col width="165.34375" />
<col width="544" />
</colgroup>
<tr>
<td>
问题
</td>
<td>
首版决定
</td>
</tr>
<tr>
<td>
50只的数量口径
</td>
<td>
总计50只，包含本轮目标猫1只及干扰猫49只，干扰猫来自于其他用户已经画出的并存在云端的猫；猫猫数量不足时，翻倍重复直到够50只。
</td>
</tr>
<tr>
<td>
目标的身份
</td>
<td>
以本轮 artworkId 判定，不是同一用户过去画过的所有猫
</td>
</tr>
<tr>
<td>
点错是否扣时
</td>
<td>
不加罚时，计时继续；每次点错反馈，防连续乱点
</td>
</tr>
<tr>
<td>
有无倒计时失败
</td>
<td>
正式榜每局最长180秒，超时不产生有效成绩，可进入自由浏览
</td>
</tr>
<tr>
<td>
排行榜是否重复占位
</td>
<td>
同一服务端用户在同一规则版本下仅保留最快有效成绩
</td>
</tr>
<tr>
<td>
同用时排序
</td>
<td>
先按毫秒用时升序，再按首次达成该成绩的服务端时间升序，最后按userId稳定排序
</td>
</tr>
<tr>
<td>
重新开始
</td>
<td>
返回第一关空画布，重新画猫；已找到的时就计入排行榜，重开时不影响刚才的成绩
</td>
</tr>
<tr>
<td>
冷启动不足49只作品
</td>
<td>
以明确标注来源的官方种子猫补齐，不虚构用户和成绩
</td>
</tr>
<tr>
<td>
刷新、切后台
</td>
<td>
本局取消正式排名资格，不允许暂停后恢复冲榜
</td>
</tr>
<tr>
<td>
跨设备身份
</td>
<td>
不识别设备，每次都按照新建的艺术家姓名记录并且计入排名
</td>
</tr>
</table>

### 1.3 覆盖旧策划的条款

- 删除“低分、模型失败也允许发布”：正式提交必须真实评分超过50分通过。
- 删除按作品数量排名，替换为找猫用时榜。
- 删除按设备减少同屏猫数：正式局固定50只，性能降级只降低画质、帧率和特效。
- 删除新猫高亮、出生动画、置顶提示、常驻名字等会暴露目标的效果。
- 删除分享完成弹窗、底部作品列表、最新作品和我的猫咪。
- 原有绘画工具、草稿恢复、知壹反馈、整体美术风格、透明画作导出继续沿用。

## 二、路由、状态与页面流程

仍只保留两个主路由：

- /draw：第一关绘画、识别、命名、提交。
- /square：准备、正式找猫、结算、自由浏览；通过内部状态切换，不再新增主路由。
- 首次和重新开始均进入/draw。已完成玩家从首页再次进入，可进入/square的自由浏览状态，不自动开局。
- 直接打开/square而没有合法本轮会话时只可自由浏览，不生成成绩。
- 原作品分享链接只能查看已公开作品详情，不能创建、恢复或完成正式挑战。

### 2.1 前端状态机

| 状态 | 允许行为 | 转移条件 |
| --- | --- | --- |
| DRAWING | 绘画、工具、草稿保存、实时评分 | 点击完成且分数通过 → FINALIZING |
| FINALIZING | 固定当前画面，重新评分；等待期间不能提交旧分数 | 通过 → NAMING；未通过 → DRAWING |
| NAMING | 填猫名、必填昵称、查看最终评分 | 主动提交 → UPLOADING |
| UPLOADING | 显示上传进度，禁止重复提交 | 服务端接收成功 → VALIDATING；失败保留表单重试 |
| VALIDATING | 显示评分复核及内容检查状态 | published → PREPARING；rejected → 保留画作并提示修改 |
| PREPARING | 自动进入广场准备遮罩，预加载50张图和碰撞数据 | 全部就绪 → READY |
| READY | 显示“ 正式开始！找到你刚画的猫”，玩家点击“开始找猫” | 与服务器完成开局握手 → COUNTDOWN |
| COUNTDOWN | 3秒倒数；舞台仍遮罩，不得提前看位置 | 到达约定开始时间且首帧已准备 → PLAYING |
| PLAYING | 只允许找猫点击、音效开关及退出；禁止资料和刷新阵容 | 点中目标 → RESULT\_PENDING；超时/失焦等 → CANCELLED |
| RESULT\_PENDING | 本地立即冻结计时，显示“成绩确认中” | 后端成功 → FINISHED；失败显示明确状态并幂等重试 |
| FINISHED | 展示本次用时、个人最佳、榜单 | 关闭结果小卡 → EXPLORE；重新开始 → DRAWING |
| EXPLORE | 猫咪继续活动，hover/轻点查看资料 | 重新开始 → DRAWING |
| CANCELLED | 显示未上榜原因，无正式成绩 | 自由浏览或重新开始 |

上传成功后不弹分享窗；审核和准备可以在广场遮罩中展示。审核长期未完成时显示“作品已保存，正在检查”，不假装成功公开，也不开始计时。

任何异步回调必须校验当前state和sessionId，离开路由后不得继续修改已销毁页面。

## 三、第一关：画猫与50分门槛

### 3.1 绘画及反馈

保留原始策划的8色、自定义颜色、4档粗细、橡皮擦、撤销重做不少于30步、清空确认、IndexedDB草稿恢复。动态背景、知壹与粒子不能写进作品图片。

实时识别继续在客户端Worker运行，采用真实ONNX模型；知壹的反馈有4个表情，对应的文案在表格右侧。随意一行文案

初始的时候知壹表情同“50.1-75”

<table>
<colgroup>
<col width="239.66666666666666" />
<col width="239.66666666666666" />
<col width="239.66666666666666" />
</colgroup>
<tr>
<td>
0-25.0分
</td>
<td>
[https://app.notion.com/p/406045159e18809bb54dceb9fe915dc7?source=copy\_link#406045159e1880e2ba1ad753499a34b8](https://app.notion.com/p/406045159e18809bb54dceb9fe915dc7?source=copy_link#406045159e1880e2ba1ad753499a34b8)
</td>
<td>
(⊙o⊙)…神秘未知生物<br />这是=(:з」∠)\_兔子吗
</td>
</tr>
<tr>
<td>
25.1-50.0分
</td>
<td>
[https://app.notion.com/p/406045159e18809bb54dceb9fe915dc7?source=copy\_link#406045159e1880619fb4f304cf4477aa](https://app.notion.com/p/406045159e18809bb54dceb9fe915dc7?source=copy_link#406045159e1880619fb4f304cf4477aa)
</td>
<td>
你再添几笔呢 🤔<br />这是…煤气罐？
</td>
</tr>
<tr>
<td>
50.1-75
</td>
<td>
[https://app.notion.com/p/406045159e18809bb54dceb9fe915dc7?source=copy\_link#406045159e188034ba6dfd199d1573fc](https://app.notion.com/p/406045159e18809bb54dceb9fe915dc7?source=copy_link#406045159e188034ba6dfd199d1573fc)
</td>
<td>
咪咪咪\~\~<br />
</td>
</tr>
<tr>
<td>
75.1-100.0分
</td>
<td>
[https://app.notion.com/p/406045159e18809bb54dceb9fe915dc7?source=copy\_link#406045159e1880b89294de59c7714359](https://app.notion.com/p/406045159e18809bb54dceb9fe915dc7?source=copy_link#406045159e1880b89294de59c7714359)
</td>
<td>
谁家的小猫咪这样可爱呀！<br />艺术，这就是艺术！
</td>
</tr>
</table>

<columns>
<column ratio="50">
<image source="notion-file-block://40604515-9e18-80b8-9294-de59c7714359/559ee353-7c2c-4f7e-8b0a-2dfe31bd0c0a?space_id=a2d1fca3-2a74-4888-8bca-1f2616edcb2d&name=%E7%9F%A5%E5%A3%B9-%E7%AC%AC14%E9%A1%B5-%E5%9B%BE%E7%89%8708.png" />

<image source="notion-file-block://40604515-9e18-8034-ba6d-fd199d1573fc/c6970f40-2607-42a4-b24d-ac82b7065806?space_id=a2d1fca3-2a74-4888-8bca-1f2616edcb2d&name=%E7%9F%A5%E5%A3%B9-%E7%AC%AC14%E9%A1%B5-%E5%9B%BE%E7%89%8703.png" />
</column>
<column ratio="50">
<image source="notion-file-block://40604515-9e18-8061-9fb4-f304cf4477aa/07d8e5f3-f599-458e-a1b6-0008d52d04a0?space_id=a2d1fca3-2a74-4888-8bca-1f2616edcb2d&name=%E7%9F%A5%E5%A3%B9-%E7%AC%AC14%E9%A1%B5-%E5%9B%BE%E7%89%8714.png" />

<image source="notion-file-block://40604515-9e18-80e2-ba1a-d753499a34b8/25336373-3ea0-4b1d-898e-eeb49b2d3d24?space_id=a2d1fca3-2a74-4888-8bca-1f2616edcb2d&name=%E7%9F%A5%E5%A3%B9-%E7%AC%AC14%E9%A1%B5-%E5%9B%BE%E7%89%8713.png" />
</column>
</columns>

<column ratio="50"></column>

### 3.2 唯一评分口径

- 模型输出猫类别置信度p，展示整数分数score = Math.round(p × 100)。
- 允许提交条件为score > 50，即整数51–100；0–50、null、NaN、模型加载中、模型失败、空画布均不能提交。
- 50.4分对应原始p=0.504，显示50，不通过；p=0.506显示51，通过。不能前端用原始小数、后端用取整后的值。
- 实时反馈可继续使用最近3次加权平滑结果；这是绘画提示值。
- 点击“完成创作”时，必须先结束当前笔画、冻结drawRevision，针对当前最终画面重新推理，获得本次最终分数；不能用修改前的高分。
- 完成面板展示最终分数。任何绘画修改、撤销、清空都使上次最终评分失效。
- 正式提交时，就使用本地的分数，不需要服务端校验。
- 同步归一化：从最终透明PNG合成笔迹掩码，按alpha与包围盒处理；模型输入尺寸、通道、背景、缩放方式、类别顺序、输出softmax约定统一写进模型manifest。前后端使用同一测试集比对。

<p />

### 3.3 命名与提交

- 艺术家昵称trim后1–16个Unicode字符，必填，不允许选择匿名或以空值自动生成作者。
- 猫名1–16个Unicode字符；未填写时可随机生成猫名。
- 昵称允许重名，身份及排行榜去重依赖userId；展示重名时附短编号。
- 猫名、昵称均服务端校验；文本按纯文本渲染。
- 作品导出为512×512透明PNG，单张不超过2MB。服务端实际解码校验，不能只看扩展名。
- 服务器生成128或256像素舞台缩略图、笔迹包围盒、alpha命中掩码；保留完整原始画作，不用AI重画。
- 图像必须有可见笔迹。透明空图、极小无效笔迹由服务端拒绝。
- 上传成功才可清草稿；审核拒绝或评分未过时保留可继续编辑的本地副本，避免用户丢画。
- 网络失败保留画作、昵称、猫名和同一个clientRequestId；重试不能多生成作品。
- “所有作品存服务器”指玩家主动提交的最终作品，包括待审与拒绝记录；未主动提交的笔画过程和未完成草稿仍只在本机，不后台逐笔上传。拒绝作品不对其他玩家公开。

## 四、第二关：50只猫的找猫挑战

### 4.1 阵容生成

1. 后端确认本轮targetArtworkId属于当前用户、评分通过且status=published。
2. 从公开作品池选择49只其他作品，排除目标本身；优先排除当前用户的其他作品，避免“自己的猫”歧义。
3. 49只按artworkId去重，排除与目标内容哈希完全一致的画作；目标在50只中只能出现一次。
4. 用户作品不足时由官方种子猫补齐；上线前准备至少49只互不重复、内容已检查的种子猫。仍不足则禁止正式开局，提示维护。
5. 目标与干扰猫采用同一尺寸归一化和动画分布，不能固定目标位置、颜色边框、运动类型、zIndex或文件顺序。
6. 服务端生成随机seed、随机spriteId、位置及motion参数快照，保存阵容和规则版本。前端不能自行替换、减少或轮换本局猫咪。
7. 准备阶段预加载并decode全部50张图，建立命中掩码；任何资源失败先替换干扰项并重新准备，目标图失败必须重试。正式计时前确认50只全部就绪。
8. PLAYING期间不接收新作品、不自动刷新排行造成布局变化、不替换阵容。

### 4.2 动作与边界

“滚动”指猫咪图片在舞台内翻滚和位移，不是网页滚动。50只猫全程作为可见精灵存在；每只都有基础缓慢位移，并随机交替翻滚、弹跳、呼吸缩放。

首版参数起点：位移速度为舞台宽度的0.02–0.05/秒；跳跃高度为猫咪尺寸的0.1–0.35；旋转速度30–100度/秒；随机切换行为间隔2–5秒。参数固化在rulesVersion内，目标不特殊处理。

- 用Canvas 2D或PixiJS批量绘制，不为每只猫创建独立高频React状态。
- 逻辑坐标归一化，旋转、缩放后的边界也必须留在可点击区域内；计时、按钮、榜单不能遮住目标。
- 猫咪允许短暂重叠，不允许长时间完全遮住某只猫；布局检测到持续遮挡超过1秒时自动分散，算法对所有猫一致。
- PC参考可见笔迹尺寸56–80 CSS px；手机44–56 CSS px；按笔迹包围盒归一化，不能让大面积透明边距缩小实际猫。
- hit test按当前绘制的z顺序逆序，先逆变换到图片本地坐标，再查alpha掩码；只命中最上层可见笔迹，不穿透多只猫，不以透明外接矩形判定成功。
- 触控可增加最多4 CSS px边缘容差，所有猫一致；同一次pointerdown只处理一次。
- 比赛中不展示猫名、作者、生日、详情卡、作者筛选、目标箭头、目标缩略图、高亮或“新来的”标识。
- 比赛中hover不停止任何猫，不显示tooltip；找到之后才开放资料。

### 4.3 点击、乱点与结束

- 点空白：不加罚时，不结束。
- 点错猫：显示约300ms轻量反馈，计时继续，猫名仍不公开；累计wrongClicks。
- 相邻有效点击最小间隔250ms，客户端与后端都限制；违反间隔的点击不改变结果。
- 服务端检测到同一账户每秒超过4次点击或短期高密度批量请求，标记异常或取消正式成绩，不把正常误触直接封号。
- 点中目标：立即冻结本地显示、播放成功反馈并提交本次点击。后端确认前显示“确认中”，不先宣布正式名次。
- 后端确认后：显示本次用时、是否刷新最佳、是否进入前20；排名暂不可用时显示“成绩已保存，排行加载失败”，可单独重试榜单。
- 最长180秒：未找到则timeout，不写最快榜，允许直接自由浏览；若目标点击事件在截止前已由服务器接收，则依服务端时间裁决。
- 页面hidden、刷新、离开路由、旋转或明显改变舞台尺寸时，本局取消正式排名。刷新不能在相同阵容中重新归零。
- 手机软键盘在正式开局前关闭。准备中可以适配尺寸，开局后冻结逻辑舞台尺寸；浏览器栏轻微伸缩采用等比显示，不改变猫咪逻辑位置。

## 五、计时、成绩及排行榜

### 5.1 起止和网络口径

资源下载、评分复核、审核、准备和开局倒数都不计入寻找时间。不得进入/square就直接启动计时器。

正式计时协议：

1. 全部资源准备好后，客户端请求start(sessionId, startRequestId)。
2. 服务端原子地把prepared变为running，写入startsAt=服务端当前时间+3000ms，expiresAt=startsAt+180000ms，并返回serverNow、startsAt、规则版本。
3. 客户端用准备期间3次时钟探测中最小RTT样本估算服务端时钟偏差，[并以performance.now](http://%E5%B9%B6%E4%BB%A5performance.now)为本地单调时钟。估计RTT大于1000ms或同步误差超过100ms，不启动正式局，提示检查网络后重试。
4. 到startsAt时揭开遮罩、开始显示50只猫和本地计时；若响应迟到或页面未能在约定时间渲染，不补开正式局，应取消后重新准备。
5. 每次点击立即发click事件，后端在入口捕获receivedAt，早于数据库和业务处理；目标事件有效时elapsedMs=receivedAt-startsAt，取非负整数毫秒。客户端上报的用时仅作诊断，不决定排名。
6. 本地计时显示到0.01秒；正式结果以服务端毫秒值换算显示，榜单按毫秒原值排序。确认时可因网络产生小幅校正。
7. 所有权、会话状态、到期时间、点击序号、幂等键和spriteId均由后端校验；结束时间和排名字段禁止客户端写入。

此方案的公开榜成绩包含目标点击的上行网络耗时及少量时钟同步误差，属于休闲游戏用时榜，不宣称竞技级绝对公平；不扣除客户端自行声称的网络延迟，避免被利用刷分。榜单说明写“联网计时，以服务器记录为准”。若未来需要严肃竞赛，另立统一网络/设备赛制并升级可信输入验证，不能用本地计时直接替代。

### 5.2 重试及并发

- 每个用户最多一个未结束正式session。start重复请求返回原startsAt，绝不能重新开始计时。
- 点击使用sessionId+seq生成幂等键。网络超时用原seq重试，服务端返回第一次已落库结果。
- 若第一次点击从未到达服务器，后续重试以首次实际收到时间计算，不能回填客户端时间；不向用户承诺保留离线成绩。
- 每个会话最多一个成功结果，finished以后重复点击返回同一result。
- 多标签页通过后端activeSessionId和事务互斥；切换账户或伪造ownerId无效。
- 结束会话与更新该用户最佳成绩在同一数据库事务中完成；冲突重试，不能漏掉更快成绩。
- 网络在结束时中断，界面保留“本机已找到，联网成绩待确认”；先查询会话，再重试原事件，不新建成绩。
- riskStatus不通过时仍可展示本次娱乐用时，但说明“本局未计入排行榜”，不得伪造成功排名。

### 5.3 前20名用户

- 榜名由“艺术家排行”改为“找猫速度榜”，不再展示作品数量排序。
- 范围：相同rulesVersion下的全站最快有效成绩，每userId一行。
- 排序：bestElapsedMs ASC → achievedAt ASC → userId ASC；只显示status=eligible。
- 昵称不是主键，同名用户不能合并；展示提交该成绩时通过审核的艺术家昵称快照。
- 每行：排名、艺术家昵称、本轮猫缩略图、最好用时。
- 本次未入榜时展示“暂未进入前20”和自己的最佳用时；首版不强制计算全站精确名次。
- 少于20名时展示实际人数，不用种子猫或测试账号填榜。
- 为保持一屏，PC排行卡每页10条共两页，手机每页5条最多四页；页签写1–10/11–20等。分页按钮切换内容，不允许列表内部滚动。接口一次返回前20。
- PLAYING时榜单显示为折叠状态提示“找到后查看排行”，避免占用注意力或提供额外交互入口；结束后展开。
- 规则、运动参数、点击判定或猫数改变必须升级rulesVersion，新旧成绩不混排。首版手机与PC共用休闲榜，但明确设备造成难度差异；保存deviceClass供后续分析，不隐式加减分。

### 5.4 防作弊边界

服务端复核分数、身份鉴权、服务端时间、限速、一次性会话和事务能够防止直接改分、伪造毫秒数及重复上榜。客户端要渲染目标图片，因此不能从根本上阻止脚本识图、开发者工具读内存或自动点击；隐藏变量名、混淆代码和签名seed均不能解决这一点。

首版不设奖金，异常成绩先进入review，不自动上榜；后台允许撤销和重算最佳。若有奖励，必须先增加更严格的验证与人工复核。截图、鼠标轨迹等浏览器自报数据不能单独证明真人操作。

## 六、结算与自由浏览

- 成功提示采用舞台内小卡，不遮住整个广场：恭喜找到、正式用时、个人最佳、当前入榜情况。
- 猫咪继续活动；PC悬停200ms显示猫名、艺术家昵称、创作日期，移出关闭，卡片靠近边缘自动避让。
- 手机轻点猫咪显示同样资料卡，点空白关闭；不依赖hover。
- 在结算确认前不开放资料；FINISHED/EXPLORE中点击猫不再发成绩事件。
- 重新开始按钮固定在右侧排行上方；手机放在舞台外的操作栏。
- 点击重新开始返回/draw，清理旧会话定时器、RAF、监听器、tooltip和临时纹理引用；云端作品、历史成绩与昵称保留。
- 此时画布默认空白，不自动恢复已提交的那幅猫；只恢复确实未提交的新草稿。
- 仍可保留详情、下载、举报入口，但只在结束后的资料交互中出现，不加入比赛进行中的菜单。

## 七、一屏布局与性能

PC：顶部导航与状态条；左侧大舞台；右侧细长排行卡及重新开始按钮；底部短说明。手机：紧凑顶部、占主要区域的舞台、底部紧凑结果/排行分页与重新开始按钮。

- 广场根布局使用100dvh、min-height:0和overflow:hidden；舞台为剩余空间，不写死大高度。
- 不允许通过缩小到不可读字号把20行硬塞入手机，使用上述分页。
- 参考视口375×667、390×844、1366×768、1920×1080验收；短横屏可在开局前提示旋转为竖屏。
- 50张缩略图总下载目标不超过2MB，纹理按需合图/缓存；DPR最多2，弱设备可降至1。
- 手机以30FPS为基本目标，PC以60FPS为目标；逻辑以时间步推进，不能因帧率低使猫移动更慢。
- 降级顺序：关粒子和阴影 → 降DPR/纹理分辨率 → 降绘制帧率；不得从50只减为8只或16只。
- 大幅旋转、跳跃受减少动态效果设置影响时，提供单独的自由浏览/练习模式，不与标准正式榜混排。
- 渲染持续低于20FPS时提示设备不适合正式挑战，允许练习但不记标准榜。
- 无需实时多人连接或共享位置同步。每位玩家独立一局，共享服务器作品池和排行榜。

## 八、腾讯云服务端架构

选择：CloudBase文档数据库（集合相当于业务表）+ 云函数API + CloudBase云存储 + 静态网站托管。CloudBase具备身份认证、存储与数据库等能力，适合沿用原策划的轻量后端结构。[官方产品概述](https://cloud.tencent.com.cn/document/product/876/18431)

不要求先购买CVM、Redis或独立MySQL。若提交时ONNX服务端运行依赖无法适配云函数，可将“评分复核/图像预处理”单独放CloudBase云托管容器，其他接口仍用云函数；这是部署适配选项，不同时建设两套数据库。

身份：采用CloudBase匿名登录维持服务端游客uid；这是免注册技术鉴权，并不表示允许无昵称创作，前台仍强制艺术家署名。[匿名登录文档](https://docs.cloudbase.net/authentication-v2/method/anonymous)

数据库全部业务读写通过服务端API。C端数据库直接读写设为拒绝；排行榜由API投影返回。云函数使用可信登录上下文获取uid，不接受请求体里的userId当身份。安全规则主要限制客户端，云函数内仍须自行鉴权和验证。[安全规则](https://cloud.tencent.cn/document/product/876/41802)

### 8.1 存储目录与发布流水线

- private/incoming/\{userId\}/\{uploadId\}.png：用户限路径上传，不能任意覆盖或列举。
- private/originals/\{artworkId\}.png：最终原图，只读留存。
- private/derived/\{artworkId\}/thumb.png与mask.bin：服务端生成的舞台资源。
- 模型文件按modelVersion独立存放，校验SHA-256；前端允许公开下载模型，不公开管理凭据。
- 数据库存fileId/objectKey，不存会过期的签名URL；API生成限时下载链接，准备时有效期至少覆盖本局180秒和预加载缓冲。
- 未审核图片不进入公开可读目录；已公开作品也通过受控读取或短期签名提供，hidden后停止签发链接。既有已下载文件无法远程收回，缓存到期后失效。
- 上传凭证有效期默认5分钟，只允许当前uid的单个uploadId路径与指定类型；凭证不能授权读别人图片或写数据库。
- 直传使用限权限SDK上传或短期签名；不要把永久SecretId/SecretKey写入前端。[腾讯云临时凭证说明](https://intl.cloud.tencent.com/zh/document/product/436/14048?lang=zh)

处理步骤：申请upload记录 → 直传私有临时图 → commit校验对象归属/大小/格式 → 解码、算imageHash → 服务端评分 → 文本及图片审核 → 生成衍生图与mask → 标记published → 准备挑战。

异步审核任务与artworkId、对象hash绑定；服务端从可信审核结果更新状态，不信任客户端“审核通过”。腾讯云图片内容安全支持异步任务，可通过官方接口实现待审流程。[图片异步检测](https://cloud.tencent.com/document/product/1125/87021)

审核超时或供应商异常保持pending，不默认放行；任务失败可重试，回调重复必须幂等。回调入口按所选产品协议校验真实性；必要时后端主动查询任务确认，不能仅凭外部提交的artworkId将作品公开。

## 九、服务端表/集合设计

约定：所有时间存服务端UTC毫秒整数；所有分数、用时由服务端写；所有ID使用随机UUID或明确的确定性业务键。字段下述未特别标可空的均必填。上线前提供可重复执行的集合、索引初始化脚本，不把下表直接当作MySQL SQL运行。

### 9.1 users：用户

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| \_id | string | CloudBase auth uid，唯一 |
| artistName | string | 最近一次通过文本审核的昵称 |
| status | enum | active / banned |
| activeSessionId | string/null | 当前唯一正式局，用事务维护 |
| createdAt / updatedAt | int64 | 服务端时间 |
| lastSeenAt | int64 | 最近访问 |
| publicArtworkCount | int | 可选统计，非排行榜依据 |

### 9.2 artworks：作品

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| \_id / ownerId | string | 作品ID、作者uid；种子猫使用独立system作者 |
| catName / artistNameSnapshot | string | 当时审核通过的名称与署名 |
| source | enum | user / seed |
| originalFileId / thumbnailFileId / maskFileId | string/null | 处理完成前衍生资源允许null |
| imageHash | string | 解码后规范像素SHA-256，用于去重、绑定评分结果 |
| width / height / byteSize | int | 实际解码数据 |
| inkBounds | object | x、y、width、height，归一化依据 |
| clientScore | int/null | 仅诊断 |
| serverConfidence / score | number/null / int/null | 服务端真实置信度及0–100整数分 |
| modelVersion / preprocessVersion | string | 精确模型及预处理版本 |
| status | enum | processing / pending / published / rejected / hidden |
| rejectionCode | string/null | score\_low、image\_invalid、content\_rejected等 |
| moderationTaskId / moderationStatus | string/null | 审核任务及结果 |
| randomKey | number | 入池时生成，供随机抽取 |
| createdAt / updatedAt / publishedAt | int64 / int64 / int64-null | 上传与公开时间 |

评分失败不硬填0分，保持null并记录失败原因。评分不达标的主动上传可保存为rejected私有记录；未完成上传不生成公开作品。

### 9.3 upload\_requests：上传与提交幂等

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| \_id | string | hash(uid + clientRequestId)，唯一业务键 |
| ownerId / clientRequestId / artworkId | string | 重试返回同一个artworkId |
| objectKey / expectedMime / maxBytes | string / string / int | 授权对象及限制 |
| status | enum | issued / uploaded / committed / failed / expired |
| createdAt / expiresAt | int64 | 临时授权时间 |
| payloadHash | string/null | 同幂等键不同内容返回409 |

### 9.4 game\_sessions：每一局

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| \_id / ownerId / targetArtworkId | string | 局ID、玩家、目标 |
| rulesVersion / seed | string | 固定规则和随机种子 |
| roster | array\[50\] | spriteId、artworkId、资源版本、初始位置、motion、z顺序 |
| viewport / deviceClass | object / enum | 固定逻辑尺寸；desktop/mobile |
| status | enum | prepared / running / finished / timeout / cancelled / invalid |
| preparedAt / startsAt / expiresAt | int64 / nullable | 非开局状态时间允许null |
| startRequestId | string/null | 开始幂等键 |
| foundAt / elapsedMs | int64-null / int-null | 正式完成记录 |
| clientElapsedMs / clockRttMs | number/null | 诊断，不直接决定榜单 |
| lastSeq / wrongClicks | int | 点击顺序及错误计数 |
| riskStatus / invalidReason | enum / string-null | eligible / review / rejected及原因 |
| artistNameSnapshot | string | 本局署名快照 |

roster和targetArtworkId是后端审计数据；对客户端只返回渲染必要信息，不增加isTarget标记。但不能据此宣称目标在客户端不可推断。

### 9.5 game\_clicks：点击幂等与审计

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| \_id | string | sessionId + seq，确定性唯一键 |
| sessionId / ownerId / spriteId | string | 后端验证所属会话与阵容 |
| seq / receivedAt | int / int64 | 严格递增事件及首次接收时间 |
| clientElapsedMs / pointer | number-null / object-null | 诊断坐标，不当作可信证据 |
| outcome | enum | wrong / found / throttled / invalid |
| responseSnapshot | object | 重复请求返回原结果 |

### 9.6 leaderboard\_best：每用户每规则最佳

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| \_id | string | hash(rulesVersion + uid)，每人每规则唯一 |
| rulesVersion / userId | string | 分榜与身份 |
| bestElapsedMs | int | 最快有效毫秒 |
| bestSessionId / artworkId | string | 可回溯局及画作 |
| artistNameSnapshot / thumbnailFileId | string | 公开榜展示 |
| achievedAt / updatedAt | int64 | 达成与更新时间 |
| status | enum | eligible / hidden |

不存固定rank数字，读取时排序，避免多人更新排名错乱。同规则下若新成绩更快才更新；相同用时保留更早一次。可用事务完成单文档幂等、会话结束和最佳成绩更新；具体按部署SDK支持的事务API实现。[CloudBase事务文档](https://docs.cloudbase.net/database/transaction)

### 9.7 reports：举报

\_id、artworkId、reporterId、reason（固定枚举）、createdAt、status（open/resolved/dismissed）、reviewerId可空、resolution可空。同一用户对同作品的未处理举报去重；API不公开举报者身份。

### 9.8 game\_rules：规则版本配置

\_id=rulesVersion；rosterSize=50；scoreThresholdExclusive=50；maxDurationMs=180000；countdownMs=3000；clickIntervalMs=250；motionConfig；modelVersion；preprocessVersion；seedPoolVersion；enabled；createdAt。客户端只能读取公开投影，不能修改。

### 9.9 索引、事务和清理

必建复合索引：

- artworks：status + source + randomKey；ownerId + createdAt降序；status + createdAt降序；imageHash。
- game\_sessions：ownerId + status + preparedAt降序；status + expiresAt。
- game\_clicks：sessionId + receivedAt。
- leaderboard\_best：rulesVersion + status + bestElapsedMs升序 + achievedAt升序 + userId升序。
- reports：status + createdAt降序；artworkId + reporterId + status。
- upload\_requests：status + expiresAt。

唯一性优先用确定性\_id实现，不能仅“先查再插”。事务内按明确docId读取/写入；阵容抽样等查询在事务外准备，再在事务内验证关键版本和状态，避免依赖SDK不支持的事务查询。

随机取猫：按randomKey随机起点范围读取、到末尾回绕，过滤目标、同作者和同hash，去重后补种子池；不在每局扫描全站图片。后续作品量大再考虑预生成抽样池。

定时任务：

- 到期未结束session置timeout并释放users.activeSessionId。
- 超过24小时未commit的临时上传删除对象并置expired。
- 点击审计默认保留30天；历史正式成绩和最佳记录保留，图片不随临时对象清理误删。
- rejected私有图片默认保留30天供申诉和问题排查，之后可删图片但保留最小拒绝记录；published原图长期保存，hidden隔离保留，用户删除/合规删除按管理流程执行。
- 规则版本、模型及必要的种子素材保留，确保能追溯成绩。
- 撤销作弊成绩或隐藏关联违规作品时，重新从该用户剩余eligible、published关联的已完成session中计算最佳；没有合法记录则移除榜项。
- 备份与删除任务要区分incoming、originals、derived，不能对整个桶按临时文件策略清理。

## 十、接口合同

以下为逻辑HTTP合同，也可映射CloudBase云函数action；最终实现统一使用一套客户端适配层。除公开规则/榜单读取，所有写接口验证云端登录态；ownerId永远取鉴权上下文。响应统一包含requestId和serverNow，错误包含code、message、retryable。

| 接口 | 主要请求 | 主要响应与约束 |
| --- | --- | --- |
| GET /api/me | 登录凭证 | userId、artistName、activeSession摘要；不返回管理字段 |
| PUT /api/me | artistName | 文本检查通过的昵称；不影响旧成绩署名快照 |
| GET /api/rules/current | 无 | enabled、版本和公开规则 |
| POST /api/uploads | clientRequestId、mime、byteSize | uploadId、artworkId、限路径短期上传授权、expiresAt |
| POST /api/artworks/commit | uploadId、catName、artistName、clientScore、modelVersion | artworkId、processing/pending/published/rejected；复核异步不阻塞长连接 |
| GET /api/artworks/\{id\}/status | artworkId | 作者可查私有处理进度；别人只能读公开投影 |
| POST /api/games/prepare | artworkId、viewport、deviceClass、clientRequestId | sessionId、50只roster、seed、rulesVersion、资源短期链接 |
| POST /api/games/\{id\}/replace-assets | 失败spriteIds | 仅prepared可换干扰图；变化后重新预加载 |
| GET /api/time | 无 | serverNow，供时间同步 |
| POST /api/games/\{id\}/start | startRequestId、readyCount=50、clockRttMs | startsAt、expiresAt、serverNow；readyCount仅自报，不能当防作弊证据 |
| POST /api/games/\{id\}/clicks | seq、spriteId、clientElapsedMs、pointer可选 | wrong / found / invalid、正式elapsedMs及bestChanged；客户端不得传isCorrect |
| GET /api/games/\{id\} | 无 | 当前会话结果，处理响应丢失与重复确认 |
| POST /api/games/\{id\}/cancel | reason | cancelled；不能恢复归零 |
| GET /api/leaderboard?rulesVersion=...&limit=20 | limit服务端固定上限20 | entries、个人best、generatedAt；排名从1开始 |
| GET /api/artworks/\{id\} | 无 | 公开作品的猫名、署名、日期、可用资源链接 |
| POST /api/artworks/\{id\}/reports | reason | 举报受理ID |

正式局的客户端资料查询交互关闭，但已公开资料并非保密信息，不能把“禁hover”当作API保密。服务端不向普通用户提供全表导出、原始auth uid、风险记录或审核任务凭证。

默认限流起点：每uid每分钟新提交3次；prepare最多6次/分钟且一次一个activeSession；click最多4次/秒；IP设置宽松总阈值配合异常升级，避免同一网络误封。触发返回429及retryAfterMs。榜单可缓存5–10秒，结束成功时可失效缓存，不以缓存失败回滚已经保存的成绩。

核心错误码：SCORE\_TOO\_LOW、MODEL\_UNAVAILABLE、IMAGE\_INVALID、NAME\_INVALID、CONTENT\_PENDING、CONTENT\_REJECTED、ASSET\_NOT\_READY、POOL\_INSUFFICIENT、SESSION\_NOT\_OWNER、SESSION\_ALREADY\_STARTED、SESSION\_EXPIRED、SESSION\_CANCELLED、RATE\_LIMITED、NETWORK\_RETRYABLE、RESULT\_UNDER\_REVIEW。每个错误均要有用户提示和明确下一步。

### 10.1 完成事务伪代码

```txt
在API入口取得 receivedAt
验证登录态、session归属、seq和幂等键
若该点击已经处理：返回原响应
事务读取session、user、当前rules及best文档
验证running，startsAt <= receivedAt <= expiresAt，用户active，阵容合法
校验spriteId属于roster；检查250ms点击间隔
不是目标：写wrong点击，增加wrongClicks，保存lastSeq
是目标：
    elapsedMs = receivedAt - startsAt
    写found点击与finished会话
    清空匹配的activeSessionId
    riskStatus=eligible且目标仍可公开时：
        best不存在或elapsedMs更小时更新best
提交事务，返回已持久化结果
```

图片处理、模型推理和供应商审核不能放进成绩数据库事务。审核结果发布也必须幂等，避免重复生成或反复更新publishedAt。

## 十一、腾讯云：你需要做什么

本次只设计，不登录你的腾讯云、不创建付费资源。账号充值不会自动开通所有服务；实际可选地域、运行时、套餐与费用以你控制台为准，不在文档承诺固定月费。

### 11.1 你先完成的控制台准备

1. 在腾讯云完成账号实名认证，进入CloudBase控制台。
2. 创建独立测试环境，名称可为miao-cat-test；选择文档型数据库。正式发布另建生产环境，不把本地测试成绩带入正式榜。
3. 地域优先选择与主要玩家接近、且所需存储/函数/审核均支持的同一区域；面向中国大陆玩家可先评估上海。地域创建后迁移有成本，先确认再建，不同时开多个生产环境。
4. 在身份认证登录方式中开启匿名登录，用于免注册游客技术身份；前台仍必须填署名。
5. 开通环境云存储和云函数；启用静态网站托管或选择已有前端托管方式。
6. 开通图片与文本内容审核能力并创建策略，记录策略标识；先用测试图片和文本验证审核结果。不要把“AI生成识别”误选为本项目所需的内容安全检查。
7. 配置测试站和生产站的安全域名/允许来源；开发环境仅按需允许本地地址，生产不使用通配来源。
8. 设置预算/用量告警，监控存储、下载流量、审核调用、函数调用和异常请求。先做小规模测试再开放流量。
9. 准备正式访问域名及HTTPS。若选择中国大陆托管，域名备案与接入条件按所选服务的官方要求办理；香港或其他地域的部署条件另行核对，不直接套用大陆配置。[腾讯云备案说明](https://cloud.tencent.com/document/api/243/19630)

### 11.2 你提供给后续开发的非密钥信息

- 测试/生产环境ID与所选地域。
- 正式域名、测试域名、现有备案状态。
- 采用CloudBase静态托管还是现有前端托管。
- 审核产品、策略标识、开通状态。
- 可接受的月度预算和是否启用费用告警。
- 真实猫咪识别模型ONNX、model manifest、类别顺序及使用许可；若尚未训练，先完成模型训练与验证。
- 游戏正式使用的Logo、知壹角色图、至少49只官方种子猫及可使用授权。

不需要在聊天里粘贴主账号密码、永久SecretKey或完整管理员令牌。需要云端调用的凭据由你放到受控环境配置/密钥管理，通过最小权限服务角色授权。

### 11.3 后续开发负责的交付

- 建立前端云端鉴权和API适配层，替换当前IndexedDB公开作品存储；IndexedDB只负责草稿与临时缓存。
- 提供集合及索引初始化、种子导入、规则初始化、备份和清理脚本。
- 部署上述接口、评分复核运行环境、审核任务和回调、定时任务。
- 配好存储读写权限、临时上传授权、来源限制和服务端日志。
- 提供.env.example：前端仅含环境ID、API域名、模型URL和版本；服务端含审核策略等受控设置。VITE\_开头的变量会打包到浏览器，不能放密钥。
- 明确生产MODEL\_MOCK=false、BACKEND\_MOCK=false；本地演示评分和种子排行榜不得流入生产。
- 验证两个独立浏览器能共享作品和同一排行榜。
- 输出部署、回滚、恢复备份、处理举报及撤销异常成绩操作说明。

### 11.4 当前项目已知差距与上线阻塞

根据本次本地代码检查，当前作品仍通过本地storage接口管理，Stage按屏幕最多展示8或16只，尚无找猫会话和服务端成绩。模型加载由VITE\_MODEL\_URL配置；当前public目录未发现可用模型文件。因此不能把“识别逻辑存在”当作真实模型已经可用。

上线前必须补齐：真实评分模型与测试样本、服务端同版本复核、腾讯云环境、审核能力、49只种子猫、50只渲染与命中判定。缺少模型时只能画画和存本地草稿，不能用演示分数解锁正式提交或制造假成绩。

## 十二、开发拆分与验收

### 12.1 推荐实施顺序

1. 冻结本规则版本、模型输入输出及门槛测试样本。
2. 完成云端身份、集合、存储权限、上传幂等、真实评分与审核；先跑通跨浏览器作品共享。
3. 修改第一关门槛、最终快照复核、必填署名及提交异常状态。
4. 将Stage改为固定50只、准备遮罩、稳定动作、alpha命中、无目标提示。
5. 接入prepare/start/click/cancel完整会话及服务端计时。
6. 实现每用户最佳事务、前20名、分页排行和结算。
7. 接入结束后的hover/触控资料、重新开始、举报、超时及失败恢复。
8. 做设备、网络、并发、权限和审核测试，最后再开放正式榜。

### 12.2 必过测试清单

- 0、49、50分不可提交，51、100分可提交；空白、null、模型失败不可提交。
- 先画到高分再擦除，旧评分失效；新图必须重新评分。伪造客户端99分不能通过服务端低分复核。
- 不填艺术家昵称不能发布；重名艺术家保持不同uid与独立成绩。
- 上传重复点击、网络重试、回调重复均只生成一份作品；失败不丢画。
- 审核中及拒绝图不能被别人取到或成为干扰猫；云端已保存不等于已公开。
- 两台不同设备能看到同一已发布作品；清理本地缓存不会删除云端公开图片。
- 每个正式局roster恰好50项、目标恰好1项；冷启动自动用种子补齐；不足50不开始。
- 50只真实绘制并可命中，不能只在计数文案写50；低性能仍保持数量。
- 资源未就绪、倒数期间、审核期间均不计时；目标出生动画、常驻名字和资料提示全部关闭。
- 点击透明区域不命中；重叠按最上层判定；滚转后点击位置与图像一致。
- 点错继续，点对只结束一次；同seq重试返回相同结果。
- 修改客户端计时、userId、isCorrect、startsAt不能伪造成绩；直接写best被权限拒绝。
- 两个并发完成请求只保留一个合法结果；两局并发改善个人最佳时最终保留更快值。
- 同用户多次完成只占一个榜位；昵称相同的不同用户不合并；同毫秒排序稳定；不足20不补假人。
- 切后台、刷新、超时、离开、旋转等取消规则落实；刷新不在原阵容归零。
- 成绩响应丢失后查询会话能恢复；完全离线点击不能伪造事后补时。
- 成绩已保存但排行加载失败可独立重试，不要求重新挑战。
- 结束后PC hover和手机轻点能看到正确猫名、署名与日期；重新开始进入空画布，旧图片仍在服务器。
- 所有参考视口广场无页面滚动和嵌套列表滚动；前20名可通过分页完整查看。
- 180秒上限、限速、签名链接到期、审核失败、服务器失败均有明确反馈。
- 生产构建无评分演示开关、假成绩、本地“已公开”提示或前端管理员密钥。
- 稳定运行至少10分钟，反复重新开始不累积RAF、事件监听、纹理和计时器。

### 12.3 可观测数据

记录draw\_started、final\_score、submit\_attempt、artwork\_published、prepare\_failed、game\_started、wrong\_click、game\_finished、game\_cancelled、restart、leaderboard\_view。按rulesVersion、deviceClass统计提交通过率、审核等待、成功率、找猫耗时分布、误点数、帧率与网络RTT；不采集未提交的绘画过程。风险日志和公开排行榜分开存取。

### 12.4 完成交付定义

可运行网页源码、真实模型与manifest、服务端源码与初始化脚本、49只以上合法种子素材、腾讯云部署说明、权限配置、接口合同、跨设备验收记录、备份与回滚方案齐备。体验满足“画猫过关 → 云端保存 → 50只找猫 → 联网计时 → 前20榜 → 自由浏览/重新开始”，才算完成本次改版。
</content>
</page>
