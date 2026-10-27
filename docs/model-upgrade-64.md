# 64×64 识别升级

本次将当前V4网页与训练端切换到64×64。原模型文件保留，新的模型使用独立文件名 `quickdraw-8class-64.onnx`，manifest切换后才启用。后续已同步现有腾讯云API与维护函数的模型版本，未修改云端作品或排行榜数据。

## 共同预处理

唯一实现：`src/recognition/preprocess.mjs`，版本 `alpha-area-64-v2`。Python训练数据生成器通过Node直接调用该模块，不再单独用Pillow缩放模拟网页。

流程：透明笔迹alpha → 大于10的笔迹包围盒 → 等比居中、4像素边距 → 整数区域覆盖率平均 → sqrt对比度增强。区域平均保留细线的覆盖率，避免直接双线性抽样漏掉细线。原图、颜色、笔画存储不变。训练张量以8位灰度缓存，推理使用浮点，量化误差上限约0.002。

空图不推理；模型输入尺寸、边距、类别顺序和预处理版本都校验，拒绝旧28px模型与新输入混用。

## 笔粗增强

原始256像素笔迹宽度从2、3、4、5、6、8、10、12中取样。训练期间另有轻度增粗/减细、水平翻转、±9度旋转、±10%缩放、平移和对比度变化。验证和测试不做随机增强。同一原始画作的全部变体固定同一分组。

## 数据

- 原始QuickDraw：`D:/all_in_ai/摸凹猫/data`。Google Quick, Draw! Dataset，CC BY 4.0，来源：https://github.com/googlecreativelab/quickdraw-dataset 。
- 64px数据：`training/artifacts/quickdraw-64`。训练104,176项（104,017张不同原稿），其中猫20,000项基础样本，加22张人工筛选全身猫的176个笔粗变体；其他类别每类12,000项。验证15,970张、测试15,727张，画作ID交集为零。
- 22张全身猫原稿与标注：`D:/all_in_ai/摸凹猫/data/curated-fullbody`。这些来自已授权QuickDraw原始数据，变体不能算作176张独立新画作。部分原稿可能也在基础训练集中，始终不进入验证/测试。
- 额外下载：TU-Berlin学术镜像80张猫SVG，人工检查65张有身体/坐姿/站姿的候选，位于 `D:/all_in_ai/摸凹猫/data/external/tu-berlin`。
- TU-Berlin原始项目当前无法访问，压缩包未附许可文字；镜像和研究论文有许可线索，但本次不将这些文件混入生产模型。保留provenance、SHA-256和人工标注供后续核验，不冒称全部已获原作者直接许可。
- 镜像维护者文档：https://github.com/CISLab-HKUST/SketchKit/blob/main/docs/source/manual/datasets/TUBerlin.md 。
- 另一可扩展来源：SketchyCOCO作者提供对象级猫素描及CC BY 4.0素描许可，数据包在网盘，尚未下载或计入训练：https://github.com/sysu-imsl/SketchyCOCO 。

## 个人涂鸦

收集目录：`D:/all_in_ai/摸凹猫/data/personal/inbox`。提供截图后保留原图，另外裁出画作区域、清掉界面背景，标记作者、drawingId、猫标签、授权和split。

`training/prepare_personal.py`接受逐行JSON清单，支持透明PNG或带明确crop的白底截图；拒绝同一画作、相同像素跨train/validation/test。不要把同一画的不同截图当成多个独立样本；预留验收图不参与训练。

用户后续明确提供两张个人涂鸦（其中包括之前诊断截图的同一画作）以及下载文件夹的26张图片，全部加入继续训练。它们是训练原稿，之前诊断截图也不能再当作未见验收图。仍需其他未参与训练的个人图验证泛化。仅有一个作者时不能宣称作者级泛化通过。

示例清单（文件路径相对清单目录）：

```json
{"file":"inbox/cat-001.png","drawingId":"personal-cat-001","author":"owner","label":"cat","permission":true,"split":"train","kind":"screenshot","crop":[40,75,460,495]}
```

截图裁框必须逐张确认，此示例坐标不能直接套用。

## 重现

```powershell
.\.venv\Scripts\python.exe training/prepare64.py
# 人工候选与选择标注保存在data/curated-fullbody和training/artifacts/body-review
.\.venv\Scripts\python.exe training/add_body_examples.py
.\.venv\Scripts\python.exe training/train64.py --epochs 12 --threads 6
# 验证后将候选模型和指标复制到public/models，再生成manifest
node scripts/write-model-manifest.cjs
npm test
npm run build
```

32px/64px或旧新模型的指标必须注明各自输入处理，不能把旧89%与新指标直接当作同一条件下的提升。应额外测试同一批原始画作在不同笔粗下的通过率和非猫误通过率。

## 后续补充：用户提供的28张图

原始图片与清理后的alpha、逐图裁框、来源、SHA-256和训练分组保存在 `D:/all_in_ai/摸凹猫/data/user-cats-20261028`。2张为用户亲手绘制；26张为用户从互联网下载并明确要求本地训练，未提供原作者和原始网页/再分发许可，已在清单注明，未上传这些源图片到云端。原下载文件夹保持不变。

部分来源有字幕、按钮、纸纹和邻近图案，按图清理后提取非空alpha包围盒，再输入共享64px预处理。代码：training/import_user_cats.py。个人图的不同截图都归同一训练用途，不将原问题截图伪装成未见测试。

基础训练12轮后，用16,000项均衡的原类别回放样本与28张新图的重复训练抽样混合，低学习率继续训练6轮。按独立验证损失选择第3轮，并限制验证准确率下降和非猫误通过，避免只训练猫导致类别坍塌。实现：training/finetune_user64.py。新增数据不能算作上千张独立画作。

最终独立QuickDraw测试15,727张：八分类准确率89.26%，猫的top-1识别率87.98%，猫达到51分门槛的比例85.96%，非猫误通过率1.69%。基础64px模型测试准确率89.55%，个性化继续训练后下降0.29个百分点，属于本次适配的可见代价。该测试不是独立作者或真实用户画风的验收。

28张训练原稿中27张达到提交门槛，两张用户原稿的导出模型评分均100。另1张笔迹很淡的网络参考图仍未过门槛；已加入训练不代表每张必然通过，未人为加分。上述数字只反映训练拟合，不作为真实准确率。

## 网页验证与对照

14项自动检查通过，含小画/大画裁剪后的形状一致性；TypeScript与生产构建通过；Edge实际Worker加载64px模型并输出有效分数，无页面错误。模型图与外部权重合计约535KB，旧28px模型和旧manifest留作回退。

对同一批160张未参与训练的原稿，使用网页真实800px画布和实际平滑笔迹，按3/7/20三档画笔生成480项输入。每档只有20张猫与140张非猫：新模型猫通过率为100%/85%/85%，非猫误通过率为5%/1.43%/0.71%；旧模型在同批实际网页输入下猫通过率均为0%。这是一组小规模输入兼容诊断，不能宣传成新模型100%准确。完整数字见docs/model-previews/browser-width-comparison.json。

本地前端、模型manifest、服务端源码的模型版本已更新为quickdraw-8class-64-v2。2026-10-28已备份并更新现有miao-api与miao-maintenance函数的代码及模型配置，原环境变量保持不变。远程rules调用确认modelVersion=quickdraw-8class-64-v2、preprocessVersion=alpha-area-64-v2。部署证据见cloud-model64-deployment.json；代码和配置回退包保存在被Git忽略的.cloud-deploy/model64-config-backup。没有上传用户训练源图、修改业务记录或发布新的前端公开网站。
