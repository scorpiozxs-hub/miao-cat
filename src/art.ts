import type { Artwork, Stroke } from './types';
export const SIZE = 800;
export function paint(ctx: CanvasRenderingContext2D, strokes: Stroke[]) {
  ctx.clearRect(0,0,SIZE,SIZE);
  for(const stroke of strokes) {
    if(!stroke.points.length) continue;
    ctx.globalCompositeOperation = stroke.erase ? 'destination-out' : 'source-over';
    ctx.strokeStyle=stroke.color; ctx.fillStyle=stroke.color; ctx.lineWidth=stroke.size; ctx.lineCap='round'; ctx.lineJoin='round';
    const ps=stroke.points;
    if(ps.length===1){ctx.beginPath();ctx.arc(ps[0].x,ps[0].y,stroke.size/2,0,Math.PI*2);ctx.fill();continue;}
    ctx.beginPath();ctx.moveTo(ps[0].x,ps[0].y);
    for(let i=1;i<ps.length-1;i++)ctx.quadraticCurveTo(ps[i].x,ps[i].y,(ps[i].x+ps[i+1].x)/2,(ps[i].y+ps[i+1].y)/2);
    ctx.lineTo(ps[ps.length-1].x,ps[ps.length-1].y);ctx.stroke();
  }
  ctx.globalCompositeOperation='source-over';
}
export function inkBounds(canvas: HTMLCanvasElement) {
  const {data}=canvas.getContext('2d',{willReadFrequently:true})!.getImageData(0,0,SIZE,SIZE);
  let x0=SIZE,y0=SIZE,x1=-1,y1=-1;
  for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++)if(data[(y*SIZE+x)*4+3]>10){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
  return x1<0?null:{x:x0,y:y0,w:x1-x0+1,h:y1-y0+1};
}
export function exportArt(canvas: HTMLCanvasElement) {
  const box=inkBounds(canvas); if(!box)return null;
  const out=document.createElement('canvas');out.width=out.height=512;
  const scale=448/Math.max(box.w,box.h); const w=box.w*scale,h=box.h*scale;
  out.getContext('2d')!.drawImage(canvas,box.x,box.y,box.w,box.h,(512-w)/2,(512-h)/2,w,h);
  return out.toDataURL('image/png');
}
export function modelInput(canvas: HTMLCanvasElement, size: number) {
  const box=inkBounds(canvas); if(!box)return null;
  const c=document.createElement('canvas'); c.width=c.height=size; const ctx=c.getContext('2d')!;
  const scale=(size-4)/Math.max(box.w,box.h); const w=box.w*scale,h=box.h*scale;
  ctx.drawImage(canvas,box.x,box.y,box.w,box.h,(size-w)/2,(size-h)/2,w,h);
  const pixels=ctx.getImageData(0,0,size,size).data; const input=new Float32Array(size*size);
  for(let i=0;i<input.length;i++)input[i]=pixels[i*4+3]/255;
  return input;
}
// Hand-authored sample illustrations. They are explicitly marked as samples, never player uploads.
function catSvg(index:number) {
  const colors=['#eead75','#96a9c1','#b6b0dc','#9eb592','#e7b4c6','#8db9ba'];const color=colors[index%6];
  const body=index%3===0?'<path d="M66 116 Q45 223 109 222 L181 222 Q234 219 211 119"/>':'<path d="M82 125 Q54 178 72 223 L100 223 L106 200 L151 200 L158 223 L186 223 Q208 175 179 125"/>';
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 270"><g stroke="#383d39" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="${color}">${body}<path d="M190 196 Q246 225 248 163 Q244 136 228 153" fill="none"/><path d="M67 83 L62 28 L105 56 Q138 42 168 56 L207 27 L202 85 Q218 136 177 149 Q139 163 97 148 Q53 133 67 83Z"/><path d="M79 67 L78 48 L95 62 M179 64 L193 48 L191 72" fill="#efd1c2" stroke-width="3"/><g fill="#383d39"><ellipse cx="105" cy="102" rx="4" ry="7"/><ellipse cx="166" cy="102" rx="4" ry="7"/><path d="M132 117 L139 117 L136 122Z"/></g><path d="M136 123 Q126 139 119 128 M136 123 Q145 139 153 128 M83 116 L45 110 M83 124 L45 132 M188 116 L223 108 M187 125 L225 132" fill="none" stroke-width="3"/><path d="M123 57 L126 76 M139 54 L140 74 M155 57 L153 76" fill="none" opacity=".5"/></g></svg>`)}`;
}
const names=['橘子汽水','星期八','一颗芋圆','不想上班','草莓团子','歪歪','年糕','好困哦','小鱼干','一根猫','咕噜','小煤球'];
export const sampleArtworks:Artwork[]=names.map((catName,i)=>({id:`sample-${i}`,ownerId:`sample-artist-${i%5}`,catName,artistName:['半颗橘子','困困画家','阿米','月亮邮差','小鱼干研究员'][i%5],imageUrl:catSvg(i),catConfidence:null,createdAt:Date.UTC(2026,9,20)-i*3600000,motionPreset:i%5,sample:true}));
export const randomName = () => names[Math.floor(Math.random()*names.length)];
export const motionNames = ['慢吞吞','弹簧猫','螃蟹步','果冻猫','转圈猫'];
export function getStage(score:number,previous:number) { let stage=previous; const enter=[28,53,83],exit=[22,47,77];while(stage<3&&score>=enter[stage])stage++;while(stage>0&&score<exit[stage-1])stage--;return stage; }
