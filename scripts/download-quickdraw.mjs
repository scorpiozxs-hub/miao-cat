import { appendFile, mkdir, readFile, rename, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(process.argv[2] || path.join(path.dirname(fileURLToPath(import.meta.url)), '../training/data'));
const base = 'https://storage.googleapis.com/quickdraw_dataset/full/simplified';
const classes = [
  { folder: 'cat', source: 'cat', label: '猫' },
  { folder: 'dog', source: 'dog', label: '狗' },
  { folder: 'rabbit', source: 'rabbit', label: '兔' },
  { folder: 'fish', source: 'fish', label: '鱼' },
  { folder: 'bear', source: 'bear', label: '熊' },
  { folder: 'mouse', source: 'mouse', label: '老鼠' },
  { folder: 'person', source: 'face', label: '人物（头像代理类 face）' },
  { folder: 'house', source: 'house', label: '房屋' },
];

await mkdir(root, { recursive: true });
await writeFile(path.join(root, 'README.md'), `# Quick, Draw! 分类数据\n\n数据来源：Google Quick, Draw! 简化矢量数据（NDJSON，每行一幅画）。原始笔画保存在各分类目录，供后续统一渲染为 64×64。\n\n| 目录 | 数据集标签 | 说明 |\n|---|---|---|\n${classes.map(c => `| ${c.folder} | \`${c.source}\` | ${c.label} |`).join('\n')}\n\n注意：Quick, Draw! 没有 \`person\` 同名类别。本目录的 \`person/face.ndjson\` 是头像代理类，不代表全身人物；训练时应单独标注或补充真正的人物样本，不要默认为等价标签。Quick, Draw! 数据采用 CC BY 4.0，使用和分发时须遵守署名要求。公开数据不含稳定绘画者 ID，不能用于绘画者级隔离切分。\n\n下载或续传：\n\n\`\`\`sh\nnode download_quickdraw.mjs\n\`\`\`\n\n数据集来源：https://github.com/googlecreativelab/quickdraw-dataset\n许可：https://creativecommons.org/licenses/by/4.0/\n`);
await writeFile(path.join(root, 'manifest.json'), JSON.stringify({
  dataset: 'Google Quick, Draw! simplified drawings',
  source: base,
  license: 'CC BY 4.0',
  attribution: 'Google Quick, Draw! Dataset',
  format: 'NDJSON; one simplified vector drawing per line',
  downloadedAt: new Date().toISOString(),
  classes: classes.map(({ folder, source, label }) => ({ folder, sourceLabel: source, displayLabel: label, file: `${folder}/${source}.ndjson` })),
}, null, 2));

async function downloadClass(item) {
  const dir = path.join(root, item.folder);
  const destination = path.join(dir, `${item.source}.ndjson`);
  const partial = `${destination}.part`;
  await mkdir(dir, { recursive: true });

  const head = await fetch(`${base}/${encodeURIComponent(item.source)}.ndjson`, { method: 'HEAD', signal: AbortSignal.timeout(60_000) });
  if (!head.ok) throw new Error(`HEAD ${item.source}: HTTP ${head.status}`);
  const expected = Number(head.headers.get('content-length'));
  if (!Number.isFinite(expected) || expected <= 0) throw new Error(`Missing content length for ${item.source}`);

  try {
    if ((await stat(destination)).size === expected) {
      console.log(`已存在，跳过 ${item.label}: ${destination}`);
      return;
    }
  } catch { /* download is missing */ }

  const existing = await stat(partial).catch(() => ({ size: 0 }));
  if (existing.size) await unlink(partial); // discard an old single-stream partial before using range chunks
  const chunkCount = 4;
  const chunkSize = Math.ceil(expected / chunkCount);
  console.log(`下载 ${item.label} (${item.source}), ${(expected / 1024 / 1024).toFixed(1)} MiB，分 4 段并行`);
  const url = `${base}/${encodeURIComponent(item.source)}.ndjson`;
  const chunks = Array.from({ length: chunkCount }, (_, i) => {
    const start = i * chunkSize;
    return { i, start, end: Math.min(expected - 1, start + chunkSize - 1), file: `${destination}.chunk-${i}.part` };
  }).filter(c => c.start < expected);
  await Promise.all(chunks.map(async chunk => {
    const length = chunk.end - chunk.start + 1;
    if ((await stat(chunk.file).catch(() => ({ size: 0 }))).size === length) return;
    console.log(`  ${item.source} 分段 ${chunk.i + 1}/${chunks.length} 开始`);
    await new Promise((resolve, reject) => {
      const child = spawn('curl.exe', [
        '--fail', '--location', '--retry', '5', '--retry-all-errors', '--connect-timeout', '30',
        '--silent', '--show-error', '--range', `${chunk.start}-${chunk.end}`, '--output', chunk.file, url,
      ], { stdio: 'inherit', windowsHide: true });
      child.once('error', reject);
      child.once('exit', code => code === 0 ? resolve() : reject(new Error(`curl failed for ${item.source} segment ${chunk.i + 1} (exit ${code})`)));
    });
    const actual = (await stat(chunk.file)).size;
    if (actual !== length) throw new Error(`${item.source} segment ${chunk.i + 1}: expected ${length} bytes, received ${actual}`);
    console.log(`  ${item.source} 分段 ${chunk.i + 1}/${chunks.length} 完成`);
  }));
  await writeFile(partial, new Uint8Array());
  for (const chunk of chunks) await appendFile(partial, await readFile(chunk.file));
  const actual = (await stat(partial)).size;
  if (actual !== expected) throw new Error(`${item.source}: expected ${expected} bytes, received ${actual}; partial file kept for resume`);
  await rename(partial, destination);
  await Promise.all(chunks.map(c => unlink(c.file)));
  console.log(`完成 ${item.label}: ${destination}`);
}

const poolSize = 2;
for (let i = 0; i < classes.length; i += poolSize) await Promise.all(classes.slice(i, i + poolSize).map(downloadClass));
console.log('全部分类下载完成。');
