# 腾讯云环境接入

2026-10-28实际状态：已接入免费体验环境`miao-cat-d1gst3eu0a8525432`，地域`ap-shanghai`。用户选择使用同一环境从个人测试逐步上线，无需另外创建测试环境。匿名登录、8个集合与索引、私有存储、两项事件云函数均已配置。真实模型评分、上传、衍生图生成及pending事务提交已通过。自动续费和超额付费保持关闭，未开启付费日志。以下通用操作指引中的创建环境步骤已经完成，不必重复执行。

## 当前还需完成

- 仅自己体验可以继续使用本地练习；正式共享作品仍需要内容审核策略及至少一张已审核干扰图。IMS/TMS可能独立计费，在确认相关产品的免费额度和收费前不要开通付费服务。当前缺策略时保持pending，不会自动公开。
- 尚未设置定时审核触发器。免费环境的3秒函数上限已能完成实测上传，但外部审核调用与批处理仍需单独验证，不能视为已通过。
- 本地预览为`http://127.0.0.1:8767/draw`，尚未发布公网。免费套餐拒绝了新增安全域名操作；本地匿名调用实测可用，不表示任意公网域名可用。
- 模型已生成并接入，manifest包含ONNX图与外部权重的SHA-256。真实绘画泛化效果仍需收集样本评估。

## 重复部署注意

先运行`node scripts/prepare-cloud-functions.cjs`生成`.cloud-deploy/`。在两个函数目录分别执行`npm install --force --ignore-scripts --omit=optional --no-audit --no-fund`：脚本已将Linux Sharp及libvips列为直接依赖，此处force仅用于在Windows打包Linux二进制。部署必须使用`--install-dependency false`，配置文件也已设为false。不要上传Windows的server/node_modules。实测云端依赖安装会遗漏Sharp原生模块，因此下方旧的云端安装建议不适用于本次部署。

## 先做这4步

1. 完成腾讯云实名认证，在 [CloudBase控制台](https://tcb.cloud.tencent.com/) 创建独立测试环境，例如`miao-cat-test`。选择**文档型数据库/传统模式**；本项目没有采用PostgreSQL/RLS模式。地域按主要玩家和服务可用性确定，可先评估上海，不要同时建立多个生产环境。
2. 在身份认证的登录方式中开启匿名登录。这是技术鉴权，不替代必填艺术家昵称；每次命名提交仍生成独立playerId。
3. 确认云函数、云存储与静态网站托管可用。配置预算和用量告警；不需要购买CVM、Redis或MySQL。
4. 提供环境ID、地域、测试站访问域名。这里只需要非密钥配置，不要发送主账号密码或永久SecretKey。

## 服务端部署

`server/` 使用普通**事件云函数**，通过Web SDK的callFunction调用；不要直接当作HTTP函数部署。普通事件函数可使用运行时角色的临时凭据；HTTP函数的鉴权方式不同。

- 函数`miao-api`：入口`index.main`，上传整个`server/`目录（排除node_modules、test和seeds），在云端Linux环境安装package-lock对应依赖。Sharp包含平台相关二进制，不能把Windows node_modules直接上传。选择当前控制台支持且满足依赖要求的Node.js运行时，建议Node.js 20或以上。函数只允许已认证Web用户调用。
- 函数`miao-maintenance`：同一源码，入口`maintenance.main`，每分钟触发一次定时任务；禁止所有客户端SDK调用，仅保留可信服务角色和定时触发。此入口处理内容检查和过期会话。
- 环境变量参考`server/.env.example`：TCB_ENV、MODEL_VERSION、IMS_BIZ_TYPE、TMS_BIZ_TYPE、MODERATION_REGION。
- API通过运行时角色读写文档数据库和本环境云存储。maintenance另需IMS图片审核和TMS文本审核权限。使用最小权限角色，不在前端配置管理员凭据。

在已授权的本机/受控环境中执行`cd server; npm ci; npm run init`创建集合。脚本可重复运行，不修改现有数据。索引清单位于`server/schema.json`；按清单在控制台创建复合索引。上线前必须在真实环境验证排序与事务API，当前本地测试使用事务内存适配器，没有声称真实云端已通过。

数据库所有集合和云存储都设置客户端规则：

```json
{"read": false, "write": false}
```

首版图片不使用宽泛客户端直传。upload.create建立5分钟上传记录，upload.put携带2MB以内PNG经云函数转存；服务端核对authUid、uploadId、SHA-256和大小，只写指定临时路径。commit再解码检查512×512 PNG、可见笔迹，生成128像素缩略图和alpha掩码。普通用户无法任意覆盖原图或直接修改排名。正式图片通过10分钟签名链接读取，存储CORS需允许测试/正式站来源的GET请求，使Canvas能读取alpha；不要设置全站公开存储。

## 审核和初始作品池

1. 开通腾讯云**图片内容安全IMS**与**文本内容安全TMS**，创建适用策略，记录各自BizType。不是“AI生成识别”产品。
2. 将两个策略ID配置到maintenance函数。缺策略、供应商失败、Review结果都会保持pending，不默认公开；Block进入rejected，只有两项Pass才发布。
3. `server/seeds/`提供6张来自原项目手绘SVG的本机示例PNG。请审阅图像与分发权限；确认后可在受控环境运行`node scripts/import-seeds.cjs seeds/manifest.json --reviewed`。脚本按像素hash幂等导入，署名为“摸凹猫·官方示例”，不会创建玩家成绩。没有用户要求的49张不同种子限制，已有干扰作品可以重复，但目标不能重复。
4. 任意正式局至少需要1张与目标像素hash不同的已公开干扰作品；完全没有时提示作品池准备中。未审核图不进入阵容。

## 前端部署与模型

复制项目`.env.example`为`.env.local`，填写：

```dotenv
VITE_CLOUDBASE_ENV_ID=实际测试环境ID
VITE_CLOUDBASE_REGION=实际地域
VITE_CLOUDBASE_API_FUNCTION=miao-api
VITE_MODEL_URL=/models/quickdraw-8class-64.onnx
VITE_MODEL_VERSION=quickdraw-8class-64-v2
# manifest准备好后再启用，错误的SHA-256会阻止模型加载
VITE_MODEL_MANIFEST_URL=
```

没有模型文件时不要放占位ONNX。模型交接见`docs/model-handoff.md`。当前模型为64px v2，训练与网页调用同一alpha-area-64-v2预处理。当前两个云函数已同步此模型版本，详见docs/model-upgrade-64.md。

运行`npm run build`，只上传`dist/`到静态网站托管。`/draw`与`/square`需要回退到`/index.html`。生产域名使用HTTPS；大陆托管的备案与接入要求按实际服务办理。CloudBase安全域名加入测试站与正式站，本机调试仅加入所需localhost来源；生产不保留无关测试来源。服务器环境和构建产物应区分测试/生产，不把测试榜带入生产。

## 真实环境必须补做的验收

- 两个独立浏览器匿名登录，主动提交不同署名，产生独立playerId，看到同一云端公开作品池及榜单。
- 重试上传不新增作品/身份，审核中及拒绝作品对其他用户不可读取。
- 直接客户端读写数据库/存储被拒绝，伪造playerId、spriteId、seq不能结束别人的会话。
- 图片签名链接具备Canvas需要的CORS；50张资源全部加载后才允许开始，模糊或透明外框点击不命中。
- 真实ONNX的0/50/51分门槛、最终快照重新识别，以及真实手机触控、微信WebView、弱网与切后台。
- 确认云函数事件请求可承载2MB PNG的Base64包、内存/执行时长满足Sharp及审核任务；如控制台限制更低，先收紧图片上限或部署限路径短期上传，不能放宽存储权限。
- 10分钟运行、重复重开、并发结算、跨浏览器排名、告警、账单、故障恢复。真实服务未开通前这些均不标为已通过。

## 备份、清理与回滚

- 首次上线及每次升级前创建云数据库托管备份，并保留独立的原图/衍生图备份；云数据库快照不等于对象存储备份。
- `node server/scripts/backup.cjs <新的绝对目录>`同时导出集合与原图/缩略图/掩码。目录含私有身份和拒绝画作，限制访问。它不输出云凭据。
- 清理脚本默认只预览：`node server/scripts/cleanup.cjs`；检查记录后追加`--apply`才删除到期incoming对象与审计记录，不删除published原图/衍生图。每批处理有数量上限；大库应使用范围查询/游标扩展并先备份。拒绝图和hidden隔离图不会被本脚本误删，后续按人工审核保留策略处理。
- 回滚使用上一份静态产物及上一版云函数包，保持rulesVersion与modelVersion兼容。成绩不从客户端缓存恢复。数据库恢复应先在隔离环境验证托管备份，再执行生产恢复；不要盲目导入并覆盖现有正式成绩。
- 举报进入reports集合，管理员在受控后台查看。隐藏违规图后应取消相关在途会话并重算关联玩家最佳，不能只改榜单显示。当前未交付可公开访问的管理员界面，正式发布前应落实管理员处理流程。

参考：[匿名登录](https://docs.cloudbase.net/authentication-v2/method/anonymous)、[事件/HTTP函数资源鉴权差别](https://docs.cloudbase.net/cloud-function/resource-integration/cloudbase)、[存储安全规则](https://docs.cloudbase.net/storage/security-rules)、[IMS图片同步检测](https://cloud.tencent.com/document/product/1125/53273)、[TMS文本检测](https://cloud.tencent.com/document/api/1124/51860)。
