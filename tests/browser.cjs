const {chromium,launchOptions}=require('../scripts/playwright.cjs');
const assert=require('node:assert/strict');const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch(launchOptions());fs.mkdirSync('docs/screenshots-v4',{recursive:true});
 const output=[];
 for(const viewport of [{width:1366,height:768},{width:375,height:667},{width:390,height:844},{width:1920,height:1080}]){
  const context=await browser.newContext({viewport});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.addInitScript(()=>{
   window.__stageImages=new Map();window.__drawCount=0;const original=CanvasRenderingContext2D.prototype.drawImage,clear=CanvasRenderingContext2D.prototype.clearRect;
   CanvasRenderingContext2D.prototype.clearRect=function(...args){if(this.canvas.getAttribute('aria-label')?.includes('猫咪舞台'))window.__drawCount=0;return clear.apply(this,args);};
   CanvasRenderingContext2D.prototype.drawImage=function(...args){const result=original.apply(this,args);if(this.canvas.getAttribute('aria-label')?.includes('猫咪舞台')&&args[0] instanceof HTMLCanvasElement){window.__drawCount++;window.__stageImages.set(args[0],{matrix:this.getTransform().toJSON(),args:args.slice(1)});}return result;};
  });
  await page.goto('http://127.0.0.1:8767/draw');await page.getByText('本地 AI 已就绪',{exact:true}).waitFor({timeout:60000});
  assert(await page.getByRole('button',{name:'完成创作，开始找猫'}).isDisabled());
  const canvas=page.getByLabel('猫咪绘画画布');const r=await canvas.boundingBox();
  const pts=[[.25,.3],[.4,.15],[.5,.3],[.65,.15],[.75,.6],[.6,.75],[.4,.75],[.25,.3]];
  await page.mouse.move(r.x+r.width*pts[0][0],r.y+r.height*pts[0][1]);await page.mouse.down();
  for(const [x,y]of pts.slice(1))await page.mouse.move(r.x+r.width*x,r.y+r.height*y,{steps:8});await page.mouse.up();
  await page.getByText('草稿已保存在本机',{exact:true}).waitFor();
  await page.getByRole('button',{name:'撤销',exact:true}).click();assert(await page.getByRole('button',{name:'重做',exact:true}).isEnabled());
  await page.getByRole('button',{name:'重做',exact:true}).click();await page.getByText('草稿已保存在本机',{exact:true}).waitFor();
  await page.reload();await page.getByText('已恢复上次未提交的画作').waitFor();
  await page.screenshot({path:`docs/screenshots-v4/draw-${viewport.width}.png`,fullPage:true});
  await page.getByRole('button',{name:'先体验找猫',exact:false}).click();
  await page.getByText('50/50 图片就绪',{exact:false}).waitFor({timeout:20000});
  await page.screenshot({path:`docs/screenshots-v4/ready-${viewport.width}.png`});
  const dimensions=await page.evaluate(()=>({w:innerWidth,h:innerHeight,sw:document.documentElement.scrollWidth,sh:document.documentElement.scrollHeight,canvas:document.querySelector('.hunt-canvas').getBoundingClientRect().toJSON()}));
  assert(dimensions.sw<=viewport.width,JSON.stringify(dimensions));assert(dimensions.sh<=viewport.height,JSON.stringify(dimensions));assert(dimensions.canvas.height>180);
  await page.getByRole('button',{name:'开始找猫',exact:true}).click();await page.waitForTimeout(3300);
  assert(await page.locator('.cat-tooltip').count()===0);
  const rendered=await page.evaluate(()=>{let images=0,target=null;for(const [img,{matrix,args}] of window.__stageImages){images++;const p=img.getContext('2d').getImageData(0,0,128,128).data;let total=0,dark=0,point=null;for(let i=0;i<128*128;i++)if(p[i*4+3]>100){total++;if(p[i*4]+p[i*4+1]+p[i*4+2]<220){dark++;point??={x:i%128,y:Math.floor(i/128)};}}if(dark/total>.9&&point){const [x,y,w,h]=args;const lx=x+point.x/128*w,ly=y+point.y/128*h;const dpr=devicePixelRatio;target={x:(matrix.a*lx+matrix.c*ly+matrix.e)/dpr,y:(matrix.b*lx+matrix.d*ly+matrix.f)/dpr};}}return {images,target};});
  // Unique textures can be reused, but draw calls must render all fifty instances each frame.
  const count=await page.locator('.hunt-canvas').getAttribute('aria-label');assert(count.includes('50'));
  await page.screenshot({path:`docs/screenshots-v4/playing-${viewport.width}.png`});
  assert.equal(await page.evaluate(()=>window.__drawCount),50);
  for(let retry=0;retry<6;retry++){
   const target=await page.evaluate(()=>{for(const [img,{matrix,args}] of window.__stageImages){const p=img.getContext('2d').getImageData(0,0,128,128).data;let total=0,dark=0,point=null,best=Infinity;for(let i=0;i<128*128;i++)if(p[i*4+3]>220){total++;if(p[i*4]+p[i*4+1]+p[i*4+2]<220){dark++;const x=i%128,y=Math.floor(i/128),distance=(x-64)**2+(y-64)**2;if(distance<best){best=distance;point={x:x+.5,y:y+.5};}}}if(dark/total>.9&&point){const [x,y,w,h]=args,lx=x+point.x/128*w,ly=y+point.y/128*h,dpr=devicePixelRatio;return {x:(matrix.a*lx+matrix.c*ly+matrix.e)/dpr,y:(matrix.b*lx+matrix.d*ly+matrix.f)/dpr};}}return null;});
   assert(target);const box=await page.locator('.hunt-canvas').boundingBox();await page.mouse.click(box.x+target.x,box.y+target.y);await page.waitForTimeout(320);if(await page.getByText('就是这只猫，找到你啦！').isVisible().catch(()=>false))break;
  }
  const found=await page.getByText('就是这只猫，找到你啦！').isVisible().catch(()=>false);
  assert(found,'Practice target should finish the game');
  if(found){await page.getByRole('button',{name:'关闭结果，进入自由浏览'}).click();await page.waitForTimeout(100);assert(await page.getByText('练习模式 · 不上榜').isVisible());}
  await page.getByRole('button',{name:'重新画猫',exact:true}).click();
  if(await page.getByText('结束这次找猫？').isVisible().catch(()=>false))await page.locator('dialog').getByRole('button',{name:'重新画猫',exact:true}).click();
  await page.getByText('这里，正在等一只猫').waitFor();assert.deepEqual(errors,[]);
  output.push({viewport,dimensions,found,errors});await context.close();
 }
 fs.writeFileSync('docs/browser-verification-v4.json',JSON.stringify(output,null,2));console.log(JSON.stringify(output,null,2));await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1;});
