# 在另一台电脑继续开发

## 1. 先运行网页，不需要下载训练大文件

安装Git和Node.js 22.18+。进入你希望存放项目的目录：

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

打开 http://127.0.0.1:8767/draw 。现用模型已随源码保存，首次加载可能稍慢。没有填写云环境时仍可画画、保存本机草稿和进行明确标注的本机练习。

npm run build生成dist。/draw和/square需要单页应用回退至index.html。

## 2. 连接原来的腾讯云环境

cloudbaserc.json保存环境ID、上海地域和两个函数名，这些是客户端可见标识，不是密钥。将对应信息填写到本机.env.local：

~~~dotenv
VITE_MODEL_MANIFEST_URL=/models/manifest.json
VITE_CLOUDBASE_ENV_ID=复制cloudbaserc.json里的envId
VITE_CLOUDBASE_REGION=ap-shanghai
VITE_CLOUDBASE_API_FUNCTION=miao-api
~~~

更改.env.local后重启开发服务器。要在新电脑管理云函数，重新执行npx @cloudbase/cli login，并使用原腾讯云账号完成登录；不要复制旧电脑的CLI凭据目录。

浏览器安全来源需包含本机实际访问地址。只有在需要部署时才运行代码更新，不要重复初始化或重建现有数据库。模型版本必须是quickdraw-8class-64-v2，预处理alpha-area-64-v2；后端不重新评分猫类别。更多见tencent-cloud-setup.md。

数据库里的作品、身份与成绩仍在腾讯云，不在GitHub快照中。用户本机IndexedDB草稿属于各浏览器，换电脑不会自动出现；需要的未提交画作请另行导出图片。

## 3. 恢复完整训练状态与原始画作

只开发网页可以跳过本节。继续训练时，下载开发快照Release的全部.zip.part分片、ASSETS.json与SHA256SUMS.txt。你自己的Github账号需重新登录；公开资产也可直接在浏览器下载。

[打开开发快照](https://github.com/scorpiozxs-hub/miao-cat/releases/tag/dev-snapshot-2026-10-28)

~~~powershell
gh auth login
New-Item -ItemType Directory -Force migration-assets
gh release download dev-snapshot-2026-10-28 --repo scorpiozxs-hub/miao-cat --dir migration-assets
python scripts/restore-training.py migration-assets
~~~

恢复工具按ASSETS.json自动拼接分片，校验每片、完整压缩包及每个文件的SHA-256，拒绝路径越界，不覆盖已经修改过的文件。请把22个分片放在同一下载目录，不要自行改名。恢复后：

| 目录 | 内容 |
| --- | --- |
| training/artifacts/quickdraw-64 | 训练、验证、测试分组及原稿ID |
| training/artifacts/model64 | 基础/继续训练检查点、训练历史、28张补充图张量、对照输入 |
| training/artifacts/quickdraw-28 | 旧模型训练状态，用于历史对照 |
| training/artifacts/body-review | 人工筛选全身猫的候选与记录 |
| training/data/cat等8个类别目录 | Google QuickDraw原始笔画 |
| training/data/curated-fullbody | 22张筛选全身猫原稿与标注 |
| training/data/user-cats-20261028 | 2张个人手绘、26张参考图的原件、清理结果与清单 |
| training/data/external/tu-berlin | 80张猫研究候选和65张全身候选标注；未并入发布模型 |

training/paths.py优先使用MIAO_DATA_DIR环境变量，其次项目内training/data。仅在原电脑上兼容以前的D盘数据目录。新电脑不需要建立相同盘符和用户名。

只想重新下载公开QuickDraw原始数据，可运行node scripts/download-quickdraw.mjs，但它不能替代个人画作、人工标注和检查点备份。

## 4. Python训练环境

安装Python 3.12。Windows示例：

~~~powershell
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r training/requirements.txt
# 使用已恢复的64px数据重新训练基础模型
.\.venv\Scripts\python.exe training/train64.py --epochs 12 --threads 6
# 从保存的基础检查点继续适配28张用户提供图片
.\.venv\Scripts\python.exe training/finetune_user64.py
~~~

这些命令会在你主动执行时训练，不会在网页运行时自动训练。若要重新生成数据，按training/README.md依次运行prepare64.py和add_body_examples.py。所有增强变体必须留在原稿所属分组。

现用最终继续训练检查点为training/artifacts/model64/user-best.pt；基础检查点为同目录best.pt。不要把已经训练过的个人画作当作独立验收图。发布新模型前更新模型文件、manifest校验值及云端允许的版本，执行检查与构建。

## 5. 浏览器检查

先保持8767开发服务器运行，再开一个终端执行npm run test:browser。Windows默认使用Edge；macOS/Linux先执行npx playwright install chromium。

tests/live-model-cloud.cjs会向真实云端主动上传测试作品，并非普通只读检查；不要作为默认测试执行。只读云端连通性检查为node scripts/check-cloud-browser.cjs。

## 6. 安全与素材

- 不上传.env.local、永久密钥、腾讯云/GitHub登录缓存、.cloud-deploy、数据库私有备份。
- 原始训练资料在公开Release；其中互联网参考图由用户提供，原始作者、网页及许可尚待补充。保留来源清单，不宣称拥有额外再分发许可，不将所有素材统一标成MIT。
- 大型源数据与检查点不加入Git历史；后续备份可运行python scripts/package-training.py，生成新的Release资产。
- 代码仓库不包含相邻的Godot历史试验、已安装依赖、旧电脑Python虚拟环境或已打开的浏览器草稿。这些都不是运行当前H5的必要文件。
