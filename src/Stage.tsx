import {useEffect,useRef} from 'react';
import type {Artwork} from './types';
export function Stage({artworks,onSelect,newId}:{artworks:Artwork[];onSelect:(art:Artwork)=>void;newId?:string}){
 const ref=useRef<HTMLCanvasElement>(null);const callback=useRef(onSelect);callback.current=onSelect;
 useEffect(()=>{
  const canvas=ref.current!;const ctx=canvas.getContext('2d')!;let raf=0,width=0,height=0,last=0,time=0,disposed=false;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cats=artworks.slice(0,innerWidth<700?8:16).map((art,i)=>{const img=new Image();img.src=art.imageUrl;return {art,img,x:(i%5+.55)/5,y:(Math.floor(i/5)+.7)/4,v:(i%2?1:-1)*(7+i%4),phase:i*1.71,drawX:0,drawY:0,size:0};});
  const resize=()=>{const rect=canvas.getBoundingClientRect();width=rect.width;height=rect.height;const dpr=Math.min(devicePixelRatio||1,2);canvas.width=width*dpr;canvas.height=height*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);};
  const observer=new ResizeObserver(resize);observer.observe(canvas);resize();
  const draw=(now:number)=>{
   if(disposed)return;const dt=last?Math.min((now-last)/1000,.05):0;last=now;
   if(!document.hidden){time+=dt;ctx.clearRect(0,0,width,height);
    for(const c of cats){const s=width<600?72:92; c.size=s;
     if(!reduced){c.x+=c.v*dt/width;if(c.x<.08){c.x=.08;c.v=Math.abs(c.v);}if(c.x>.92){c.x=.92;c.v=-Math.abs(c.v);}}
     const phase=time*2+c.phase;const jump=reduced?0:(c.art.motionPreset===1?Math.abs(Math.sin(phase))*24:Math.sin(phase)*3);
     const x=c.x*width,y=50+c.y*(height-95)-jump;c.drawX=x;c.drawY=y;
     ctx.fillStyle='#33452b0d';ctx.beginPath();ctx.ellipse(x,y+s*.43+jump,s*.3,5,0,0,Math.PI*2);ctx.fill();
     ctx.save();ctx.translate(x,y);if(!reduced){ctx.rotate(c.art.motionPreset===4?Math.sin(phase*.4)*.4:Math.sin(phase)*.04);ctx.scale(1+Math.sin(phase)*.025,1-Math.sin(phase)*.035);}
     if(c.art.id===newId){ctx.shadowColor='#9ab65b';ctx.shadowBlur=18;}
     if(c.img.complete&&c.img.naturalWidth)ctx.drawImage(c.img,-s/2,-s/2,s,s);ctx.restore();
     ctx.font='11px system-ui';ctx.textAlign='center';ctx.fillStyle='#67715e';ctx.fillText(c.art.catName,x,y+s*.62);
    }
   }raf=requestAnimationFrame(draw);
  };raf=requestAnimationFrame(draw);
  const click=(e:MouseEvent)=>{const r=canvas.getBoundingClientRect();const x=e.clientX-r.left,y=e.clientY-r.top;const c=[...cats].reverse().find(c=>Math.abs(x-c.drawX)<c.size*.6&&Math.abs(y-c.drawY)<c.size*.65);if(c)callback.current(c.art);};
  canvas.addEventListener('click',click);
  return()=>{disposed=true;cancelAnimationFrame(raf);observer.disconnect();canvas.removeEventListener('click',click);};
 },[artworks,newId]);
 return <canvas ref={ref} className="cat-stage" aria-label="猫咪活动舞台；也可以通过下方作品卡片打开详情"/>;
}
