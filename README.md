# 摸凹猫 · 找猫挑战

画出自己的猫，再从50只动态猫中找到它。React + TypeScript + Vite，浏览器本地ONNX识别，腾讯云CloudBase保存作品与成绩。

## 在另一台电脑继续开发

完整步骤见 [跨电脑恢复指南](docs/CONTINUE-DEVELOPMENT.md)。代码仓库已包含可直接使用的64px模型和权重；不需要先重新训练。

需要Node.js 22.18+、Git。只有训练模型时才需要Python 3.12。

~~~powershell
git clone https://github.com/scorpiozxs-hub/miao-cat.git
cd miao-cat
npm ci
npm ci --prefix server
Copy-Item .env.example .env.local
npm run check:model
npm test
npm run dev -- --port 8767
~~~

打开 http://127.0.0.1:8767/draw 。初次复制环境示例后为绘画/本机练习；连接已有云环境的方法见恢复指南。macOS/Linux可用cp代替Copy-Item。

## 当前规则

- 只有最终画面的本地识别整数分超过50才允许提交；服务端不再次推理猫类别、不按云端猫分数否决提交。
- 必填艺术家昵称，完成命名后上传。服务器检查身份、字段、模型版本、文件及内容安全；内容审核决定作品能否公开。
- 正式找猫总计50个精灵，3秒倒数，找到本轮自己的猫后记录联网时间；排行展示前20。
- 当前V4.1允许不足时重复使用合格干扰作品；目标唯一且相同像素哈希不得成为干扰项。
- 当前V4.1每次新的命名提交产生独立playerId；按此身份保留最好成绩，不按昵称或设备合并榜位。
- 广场固定一屏，无“最新作品”“我的猫咪”和下方作品流；结束后允许悬停/轻点查看猫名及艺术家。
- 当前规则优先级：[已确认决策](docs/find-cat-v4.1-decisions.md) 高于历史策划。历史策划中“服务端重新评分”等内容已经作废。

## 模型与训练资料

模型版本quickdraw-8class-64-v2，预处理alpha-area-64-v2，输入float32 [1,1,64,64]。按实际透明笔迹包围盒裁剪、等比居中、4像素边距、区域覆盖平均与细线对比度增强。训练端和网页端调用同一个 [预处理模块](src/recognition/preprocess.mjs)。

训练包括不同笔粗、轻度增粗/减细、旋转缩放；基础数据及手工筛选的全身猫，另用2张用户手绘及26张用户提供参考图继续训练。训练图的拟合分数不代表未见画作准确率；独立测试、限制及三档笔粗对比见 [模型升级报告](docs/model-upgrade-64.md)。

较大的原始数据、训练分组、检查点和补充画作位于 [开发快照Release](https://github.com/scorpiozxs-hub/miao-cat/releases/tag/dev-snapshot-2026-10-28)，不放入Git历史。备份包提供SHA-256校验和安全恢复工具。

- [训练说明](training/README.md)
- [模型交接](docs/model-handoff.md)
- [腾讯云配置与部署](docs/tencent-cloud-setup.md)
- [版本验证记录](docs/verification-v4.md)
- [素材来源记录](docs/REFERENCE-ASSETS.md)

第三方训练数据、用户提供的互联网参考图和角色素材不因本仓库公开而自动取得额外使用许可。QuickDraw按CC BY 4.0署名，其余已知来源/待核验状态保存在相应清单；不要将本项目素材整体声明为MIT等许可。

## 主要目录

| 目录 | 用途 |
| --- | --- |
| src/v4 | 当前游戏入口、绘画、找猫舞台、成绩与云端接口 |
| src/recognition | 训练与浏览器共享的64px预处理 |
| src/art.ts / src/storage.ts | 共享绘画工具、透明导出与本地草稿 |
| public/models | 现用64px模型、SHA-256 manifest、旧28px对照模型 |
| public/mascot | 当前角色素材 |
| server | CloudBase函数、权限/索引配置、维护与内容检查 |
| training | 数据准备、训练、继续训练和个人样本导入 |
| scripts | 校验、数据下载、快照恢复、云端工具 |
| tests | 本地规则/服务端/预处理测试与浏览器验证 |

src根目录的旧版Draw/Square等保留为历史实现；当前HTML入口为src/v4/main.tsx。相邻的Godot试验工程不属于当前游戏，不是运行此项目的依赖。

## 检查与构建

~~~powershell
npm run check:model
npm test
npm run build
# 另一个终端保持8767开发服务器运行后：
npm run test:browser
~~~

浏览器测试依赖Playwright。Windows默认用已安装的Edge；其他系统先执行npx playwright install chromium。训练/图片验证工具需要恢复Release中的训练资料。

## 云端实际状态

现有上海CloudBase环境ID和函数名见cloudbaserc.json（这些标识不是密码）。miao-api和miao-maintenance已同步64px模型版本。云端不做猫分类复核。真实内容审核策略、作品池与公网前端托管仍需按部署文档完成配置；pending作品不会被假装成公开作品。

本仓库不包含.env.local、GitHub/腾讯云登录凭据、数据库/对象存储私有备份、node_modules或本机Python虚拟环境。换电脑后重新安装依赖、登录云账号。不要提交永久密钥。
