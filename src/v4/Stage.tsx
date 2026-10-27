import {useEffect,useRef,useState} from 'react';
import type {SpriteSpec} from './types';
import {alphaHit,random,type Pose} from './motion';
type Sprite=SpriteSpec&{image:HTMLCanvasElement;alpha:Uint8Array;x:number;y:number;vx:number;vy:number;phase:number;spin:number;behavior:number;switchAt:number;pose:Pose};
async function decode(url:string){
 const img=new Image();img.crossOrigin='anonymous';img.src=url;await Promise.race([img.decode(),new Promise<never>((_,r)=>setTimeout(()=>r(Error('图片准备超时')),20000))]);
 const buffer=document.createElement('canvas');buffer.width=buffer.height=128;const c=buffer.getContext('2d',{willReadFrequently:true})!;c.drawImage(img,0,0,128,128);const data=c.getImageData(0,0,128,128).data;
 let x0=128,y0=128,x1=-1,y1=-1;for(let y=0;y<128;y++)for(let x=0;x<128;x++)if(data[(y*128+x)*4+3]>10){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
 if(x1<0)throw Error('画作没有可见笔迹');c.clearRect(0,0,128,128);const w=x1-x0+1,h=y1-y0+1,scale=120/Math.max(w,h);c.drawImage(img,x0/128*img.naturalWidth,y0/128*img.naturalHeight,w/128*img.naturalWidth,h/128*img.naturalHeight,(128-w*scale)/2,(128-h*scale)/2,w*scale,h*scale);
 const pixels=c.getImageData(0,0,128,128).data;const alpha=new Uint8Array(128*128);for(let i=0;i<alpha.length;i++)alpha[i]=pixels[i*4+3]>10?1:0;
 return {image:buffer,alpha};
}
export function Stage({roster,interactive,revealed,paused=false,onReady,onClick,onHover,onInvalid,onLowPerformance}:{roster:SpriteSpec[];interactive:boolean;revealed:boolean;paused?:boolean;onReady:(n:number)=>void;onClick:(s:SpriteSpec)=>void;onHover:(s:SpriteSpec|null,x:number,y:number)=>void;onInvalid:(reason:string)=>void;onLowPerformance:()=>void}){
 const ref=useRef<HTMLCanvasElement>(null);const props=useRef({interactive,revealed,paused,onReady,onClick,onHover,onInvalid,onLowPerformance});props.current={interactive,revealed,paused,onReady,onClick,onHover,onInvalid,onLowPerformance};
 const [loading,setLoading]=useState(true),[failed,setFailed]=useState('');const [retry,setRetry]=useState(0);
 useEffect(()=>{
 let disposed=false,raf=0,width=0,height=0,last=0,time=0,frames=0,measured=0,slow=0,hoverTimer:ReturnType<typeof setTimeout>|undefined;let hoverId='';let sprites:Sprite[]=[];
 const canvas=ref.current!,ctx=canvas.getContext('2d')!;const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;let initialSize:{w:number;h:number}|null=null;
 const resize=()=>{const r=canvas.getBoundingClientRect();if(props.current.interactive&&initialSize&&(Math.abs(r.width-initialSize.w)>initialSize.w*.12||Math.abs(r.height-initialSize.h)>initialSize.h*.2)){props.current.onInvalid('舞台尺寸发生明显变化，本局不计入正式榜');}width=r.width;height=r.height;initialSize={w:width,h:height};const dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);};
 const observer=new ResizeObserver(resize);observer.observe(canvas);resize();setLoading(true);setFailed('');
 (async()=>{const unique=new Map<string,Awaited<ReturnType<typeof decode>>>();await Promise.all([...new Set(roster.map(s=>s.imageUrl))].map(async url=>unique.set(url,await decode(url))));if(disposed)return;
  const columns=width<600?5:10,rows=Math.ceil(roster.length/columns);
  sprites=roster.map((s,i)=>{const rnd=random(s.motionSeed);const angle=rnd()*Math.PI*2;return {...s,...unique.get(s.imageUrl)!,x:(i%columns+.5)/columns,y:(Math.floor(i/columns)+.5)/rows,vx:Math.cos(angle)*(.02+rnd()*.03),vy:Math.sin(angle)*(.02+rnd()*.03),phase:rnd()*Math.PI*2,spin:(30+rnd()*70)*Math.PI/180*(rnd()<.5?-1:1),behavior:i%3,switchAt:2+rnd()*3,pose:{x:0,y:0,angle:0,scale:1,size:60}};});setLoading(false);props.current.onReady(sprites.length);
 })().catch(e=>{if(!disposed){setLoading(false);setFailed(e.message);props.current.onReady(0);}});
 const draw=(now:number)=>{if(disposed)return;const dt=last?Math.min((now-last)/1000,.05):0;last=now;
  if(!document.hidden){if(!props.current.paused)time+=dt;ctx.clearRect(0,0,width,height);
   const size=width<600?46:Math.max(56,Math.min(76,width/15));const radius=size*.87;
   for(const c of sprites){if(!props.current.paused){c.x+=c.vx*dt*(reduced ? .25 : 1);c.y+=c.vy*dt*width/height*(reduced ? .25 : 1);if(time>c.switchAt){c.behavior=(c.behavior+1)%3;c.switchAt=time+2+(Math.sin(c.phase+time)+1)*1.5;}}
    const mx=radius/width,my=radius/height;if(c.x<mx){c.x=mx;c.vx=Math.abs(c.vx);}if(c.x>1-mx){c.x=1-mx;c.vx=-Math.abs(c.vx);}if(c.y<my){c.y=my;c.vy=Math.abs(c.vy);}if(c.y>1-my){c.y=1-my;c.vy=-Math.abs(c.vy);}
   }
   // Symmetric separation acts on every cat, so no target receives special placement.
   if(!props.current.paused)for(let i=0;i<sprites.length;i++)for(let j=i+1;j<sprites.length;j++){const a=sprites[i],b=sprites[j],dx=(b.x-a.x)*width,dy=(b.y-a.y)*height,d=Math.hypot(dx,dy);if(d<size*.52){const push=(size*.52-d)*dt*2.5,ux=d>.1?dx/d:1,uy=d>.1?dy/d:0;a.x-=ux*push/width;b.x+=ux*push/width;a.y-=uy*push/height;b.y+=uy*push/height;}}
   for(const c of sprites){const jump=!reduced&&c.behavior===1?Math.abs(Math.sin(time*2.5+c.phase))*size*.22:0;const angle=reduced?0:c.behavior===0?time*c.spin+c.phase:Math.sin(time*2+c.phase)*.09;const scale=reduced?1:1+Math.sin(time*2+c.phase)*.025;
    const x=Math.max(radius,Math.min(width-radius,c.x*width)),y=Math.max(radius,Math.min(height-radius,c.y*height-jump));c.pose={x,y,angle,scale,size};ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.scale(scale,scale);ctx.drawImage(c.image,-size/2,-size/2,size,size);ctx.restore();}
   if(props.current.interactive){frames++;measured+=dt;if(measured>2){if(frames/measured<20)slow+=measured;else slow=0;if(slow>5){props.current.onLowPerformance();slow=0;}frames=0;measured=0;}}
  }raf=requestAnimationFrame(draw);
 };raf=requestAnimationFrame(draw);
 const hit=(e:PointerEvent)=>{const r=canvas.getBoundingClientRect();return [...sprites].reverse().find(s=>alphaHit(s.pose,e.clientX-r.left,e.clientY-r.top,s.alpha,128,e.pointerType==='touch'?4:0));};
 const down=(e:PointerEvent)=>{e.preventDefault();if(!props.current.interactive&&!props.current.revealed)return;const s=hit(e);if(props.current.interactive){if(s)props.current.onClick(s);}else if(s){const r=canvas.getBoundingClientRect();props.current.onHover(s,e.clientX-r.left,e.clientY-r.top);}else props.current.onHover(null,0,0);};
 const move=(e:PointerEvent)=>{if(!props.current.revealed||e.pointerType==='touch')return;const s=hit(e);if(s?.spriteId===hoverId)return;hoverId=s?.spriteId||'';clearTimeout(hoverTimer);props.current.onHover(null,0,0);if(s){const r=canvas.getBoundingClientRect();hoverTimer=setTimeout(()=>{if(props.current.revealed)props.current.onHover(s,e.clientX-r.left,e.clientY-r.top);},200);}};
 const leave=()=>{clearTimeout(hoverTimer);hoverId='';props.current.onHover(null,0,0);};
 canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerleave',leave);
 return()=>{disposed=true;cancelAnimationFrame(raf);clearTimeout(hoverTimer);observer.disconnect();canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerleave',leave);sprites=[];};
 },[roster,retry]);
 return <><canvas ref={ref} className="hunt-canvas" aria-label={`猫咪舞台，共${roster.length}只猫`}/>{loading&&<div className="asset-status">正在召集猫咪…</div>}{failed&&<div className="asset-status" role="alert">{failed}<button onClick={()=>setRetry(x=>x+1)}>重新加载图片</button></div>}</>;
}
