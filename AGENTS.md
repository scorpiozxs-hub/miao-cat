# 项目工作约定

- 当前入口为src/v4/main.tsx。保留历史实现，避免误改src根目录旧页面作为当前页面。
- 提交条件只使用最终画面的真实本地识别分：Math.round(p*100)>50。不得添加云端猫分类/评分作为提交条件。内容安全审核与“像不像猫”是不同事项。
- 当前模型64×64、4px边距，预处理alpha-area-64-v2。训练端和网页端都必须使用src/recognition/preprocess.mjs，不可各自实现缩放逻辑。
- 新增个人画作按原始drawingId分组，所有截图和增强变体不能跨训练/验证/测试。已训练的画不能再当作未见验收图。
- 以docs/find-cat-v4.1-decisions.md为现行玩法规则；历史策划中的冲突条款已失效。
- 云端环境由cloudbaserc.json指定。修改前检查现有环境和配置，保留未涉及的环境变量与权限。不要在前端或Git中放密钥。
- 较大数据与检查点通过Release快照恢复；不要把training/data、training/artifacts或迁移zip直接加入Git历史。
- 运行npm run check:model、npm test及npm run build；浏览器检查使用npm run test:browser并提前运行8767开发服务器。
- 只有确实需要Windows界面操作时才使用Computer Use；完成后立即停止对鼠标、键盘和窗口焦点的控制。
- 任务结束清理不再需要的临时文件、目录与进程；删除前核对准确目标。保留交付物、原始资料、复现必要数据、预存用户文件，以及用户仍在使用的预览服务。
