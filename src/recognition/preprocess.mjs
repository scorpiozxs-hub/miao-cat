// Single source of truth: used by the browser AND the Python dataset renderer via Node.
export const INPUT_SIZE = 64;
export const PADDING = 4;
export const PREPROCESS_VERSION = 'alpha-area-64-v2';
export function preprocessAlpha(alpha, width, height) {
  if (alpha.length !== width * height) throw new Error('Invalid alpha dimensions');
  let x0=width,y0=height,x1=-1,y1=-1;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(alpha[y*width+x]>10){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
  if(x1<0)return null;
  const stride=width+1, integral=new Float64Array((width+1)*(height+1));
  for(let y=0;y<height;y++){let row=0;for(let x=0;x<width;x++){row+=alpha[y*width+x];integral[(y+1)*stride+x+1]=integral[y*stride+x+1]+row;}}
  const span=Math.max(x1-x0+1,y1-y0+1)*INPUT_SIZE/(INPUT_SIZE-2*PADDING);
  const left=(x1-x0+1-span)/2,top=(y1-y0+1-span)/2;
  const out=new Float32Array(INPUT_SIZE*INPUT_SIZE);
  for(let y=0;y<INPUT_SIZE;y++)for(let x=0;x<INPUT_SIZE;x++){
    const ax=x0+Math.floor(left+x*span/INPUT_SIZE+1e-9),ay=y0+Math.floor(top+y*span/INPUT_SIZE+1e-9);
    const bx=Math.max(ax+1,x0+Math.floor(left+(x+1)*span/INPUT_SIZE+1e-9)),by=Math.max(ay+1,y0+Math.floor(top+(y+1)*span/INPUT_SIZE+1e-9));
    const l=Math.max(0,Math.min(width,ax)),r=Math.max(0,Math.min(width,bx));
    const t=Math.max(0,Math.min(height,ay)),b=Math.max(0,Math.min(height,by));
    const sum=integral[b*stride+r]-integral[t*stride+r]-integral[b*stride+l]+integral[t*stride+l];
    // Area coverage preserves subpixel strokes; square-root contrast strengthens faint thin lines.
    out[y*INPUT_SIZE+x]=Math.sqrt(Math.max(0,sum)/((bx-ax)*(by-ay)*255));
  }
  return out;
}
