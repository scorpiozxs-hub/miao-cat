# 64×64 涂鸦识别训练

当前网页使用64×64；旧的 prepare_data.py / train.py 和28px模型仅用于历史对照，不是当前训练入口。

## 数据和许可

默认原始目录：项目内training/data；可用MIAO_DATA_DIR环境变量指定。原电脑D盘路径仅作为兼容回退。Google Quick, Draw! Dataset，CC BY 4.0，保留来源 https://github.com/googlecreativelab/quickdraw-dataset 。类别固定：cat、dog、rabbit、fish、bear、mouse、face、house；猫索引0。

## 当前流程

1. 使用 .venv/Scripts/python.exe training/prepare64.py 生成基础64px数据。
2. 使用 .venv/Scripts/python.exe training/add_body_examples.py 合并已审阅的22张全身猫及176个笔粗变体。人工记录和原稿保存在 data/curated-fullbody；本地review输入保存在 training/artifacts/body-review。
3. 使用 .venv/Scripts/python.exe training/train64.py --epochs 12 --threads 6 训练，候选模型与指标写入 training/artifacts/model64。
4. 验证候选后，将 quickdraw-8class-64.onnx、外部权重.data和.metrics.json复制到public/models。运行 node scripts/write-model-manifest.cjs 生成含实际SHA-256的manifest。
5. npm test、npm run build；运行 training/make_browser_fixtures.py、tests/browser-model64.cjs、training/evaluate_browser64.py 做同一原稿三档笔粗对照。浏览器测试使用8767本地Vite和本机附带Playwright，需要按实际环境调整。

详细说明见 docs/model-upgrade-64.md。

## 共同预处理

输入float32 [1,1,64,64]，alpha笔迹、黑背景、4px边距。唯一预处理代码是 src/recognition/preprocess.mjs。Python渲染矢量后通过scripts/preprocess-batch.mjs调用同一实现，不再单独使用Pillow缩放作为模型预处理。灰度缓存量化误差上限约0.002。

## 数据增强和分组

训练原始笔粗2–12px/256，另外随机轻度增粗/减细、翻转、旋转、缩放、平移和对比度。增强只用于训练。同一key_id的全部变体留在同一split。沿用历史模型的哈希划分和保留验证/测试原稿。

公开数据没有作者ID，这是画作级隔离，不是作者级隔离。QuickDraw测试成绩不能当作真实网页用户准确率。不同输入和预处理的指标不能直接比较；额外报告同一原稿经真实H5绘制的跨笔粗表现。

## 后续个人涂鸦

原图放 data/personal/inbox，保留截图；用JSONL明确drawingId、author、label、permission、split以及截图crop。运行 training/prepare_personal.py 清单路径生成各split的64px输入，再用train64.py --personal-dir 目录合并训练集；个人validation/test单独评估，绝不自动并入训练。

TU-Berlin下载候选暂未并入发布模型，原包无许可文字、原站不可用，先保留来源与审核记录。SketchyCOCO等后续来源也应记录原稿ID和许可，不把增强图片当作独立新画作。

## 本次28张新增图的继续训练

原件与逐图标注：数据根目录的user-cats-20261028（新电脑恢复后位于training/data内）。运行 training/import_user_cats.py 准备28张，再运行 training/finetune_user64.py 从基础64px best.pt继续训练。个人图和互联网图都属于训练集，不能再作独立验收。来源许可未提供的互联网图只按用户要求本地处理，未上传到云端；需补充原始网页来源以支持后续发布审查。完整结果见 docs/model-upgrade-64.md。
