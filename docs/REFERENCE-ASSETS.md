# 原始图示与素材交接

原需求保留在 Notion，本次实现没有修改 Notion 页面或删除图示：
https://app.notion.com/p/400045159e1880bf9093de53fe0eb675

读取到的原图信息（Notion 内部资源并非公开图片下载地址）：

| 素材 | 文件 ID | 当前图片块 ID |
| --- | --- | --- |
| 绘画界面图示 | 2945b8dc-e43f-408e-a8dc-80da3bba9a21 | 3df13db5-160f-4cc8-81bc-daa7a53abb1a |
| 广场界面图示 | 8da970ed-ecad-4cec-84ab-d94373188df2 | f01a8b0b-3412-4598-a3f5-a89af689f359 |
| 知壹 图 08 | 559ee353-7c2c-4f7e-8b0a-2dfe31bd0c0a | c2652e15-3030-4fa5-a90f-a3dd78c3e716 |
| 知壹 图 03 | c6970f40-2607-42a4-b24d-ac82b7065806 | 80918840-c331-4bbb-9d98-3bb22c3435d8 |
| 知壹 图 14 | 07d8e5f3-f599-458e-a1b6-0008d52d04a0 | 678af453-1d79-4bf7-80cf-0c61bfd2899e |
| 知壹 图 13 | 25336373-3ea0-4b1d-898e-eeb49b2d3d24 | 5ed4fbe3-0207-47c4-b55d-7fc8bb92168a |

当前没有获得上述图片二进制文件，因此采用文字布局需求和手绘 SVG 占位。拿到原素材后：

1. 将图片保存在 `public/assets/`。
2. 在 `.env.local` 设置 `VITE_MASCOT_URL=/assets/zhi-yi.png`，或在 `src/ui.tsx` 根据 stage 映射不同表情。
3. 对照两个界面图示做布局和视觉调整。

不要用占位角色覆盖或删除原始参考图。
