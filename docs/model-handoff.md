# 模型训练交接（64px v2）

当前输入float32 [1,1,64,64]，alpha笔迹黑底、包围盒居中、4px边距、面积覆盖平均及sqrt增强。唯一实现src/recognition/preprocess.mjs，Python训练通过Node调用。输入合同版本alpha-area-64-v2，模型quickdraw-8class-64-v2。

输出8类logits：cat、dog、rabbit、fish、bear、mouse、face、house，catIndex=0。Worker单线程WASM推理。

训练步骤、数据来源和个人样本入口见training/README.md与docs/model-upgrade-64.md。正式模型及外部权重在public/models，node scripts/write-model-manifest.cjs产生真实SHA-256。旧28px文件保留作回滚与对照，不可与新预处理混用。

产品门槛仍为最终画面真实推理 Math.round(p*100)>50，实时平滑值仅为提示。不伪造分数，不用演示模型解锁正式提交。

本地server/rules.cjs的模型/预处理版本同步更新。已部署云函数需要后续同步发布新版本或配置MODEL_VERSION=quickdraw-8class-64-v2；未同步会拒绝新模型上传。后续已同步云端miao-api与miao-maintenance并通过远程rules验证；未改云端作品或排行榜。
