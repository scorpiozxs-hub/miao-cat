export function random(seed:number){let n=seed|0;return()=>{n|=0;n=n+0x6D2B79F5|0;let t=Math.imul(n^n>>>15,1|n);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}
export type Pose={x:number;y:number;angle:number;scale:number;size:number};
export function alphaHit(p:Pose,px:number,py:number,alpha:Uint8Array,maskSize:number,tolerance=0){
 const dx=px-p.x,dy=py-p.y,c=Math.cos(p.angle),s=Math.sin(p.angle);const x=(dx*c+dy*s)/p.scale/p.size+.5,y=(-dx*s+dy*c)/p.scale/p.size+.5;
 const ix=Math.floor(x*maskSize),iy=Math.floor(y*maskSize),pad=Math.ceil(tolerance/p.size*maskSize);
 for(let yy=iy-pad;yy<=iy+pad;yy++)for(let xx=ix-pad;xx<=ix+pad;xx++)if(xx>=0&&yy>=0&&xx<maskSize&&yy<maskSize&&alpha[yy*maskSize+xx])return true;
 return false;
}
