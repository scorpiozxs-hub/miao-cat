const sharp=require('sharp');
const {createHash}=require('node:crypto');
const {check}=require('./errors.cjs');
async function deriveImage(bytes){
  check(bytes.length>0&&bytes.length<=2*1024*1024,'IMAGE_INVALID','图片大小必须在2MB以内');
  const meta=await sharp(bytes,{limitInputPixels:512*512}).metadata();
  check(meta.format==='png'&&meta.width===512&&meta.height===512&&!meta.pages,'IMAGE_INVALID','请提交512×512透明PNG');
  const raw=await sharp(bytes).ensureAlpha().raw().toBuffer();
  let x0=512,y0=512,x1=-1,y1=-1,count=0;
  for(let y=0;y<512;y++)for(let x=0;x<512;x++)if(raw[(y*512+x)*4+3]>10){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);count++;}
  check(count>=16&&x1-x0>=2&&y1-y0>=2,'IMAGE_INVALID','画作需要有清晰可见的笔迹');
  const bounds={left:x0,top:y0,width:x1-x0+1,height:y1-y0+1};
  const thumbnail=await sharp(bytes).extract(bounds).resize(128,128,{fit:'contain',background:'#00000000'}).png().toBuffer();
  const thumbRaw=await sharp(thumbnail).ensureAlpha().raw().toBuffer();
  const mask=Buffer.alloc(128*128);for(let i=0;i<mask.length;i++)mask[i]=thumbRaw[i*4+3]>10?1:0;
  return {thumbnail,mask,inkBounds:{x:x0,y:y0,width:bounds.width,height:bounds.height},imageHash:createHash('sha256').update(raw).digest('hex')};
}
module.exports={deriveImage};
