// Read-only local browser verification. Never calls submitArt or writes cloud data.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium,launchOptions}=require('../scripts/playwright.cjs');
(async()=>{
 const b=await chromium.launch(launchOptions());try{
  const page=await b.newPage({viewport:{width:1366,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8767/draw');if(!process.argv.includes('--prepare-only'))await page.getByText('本地 AI 已就绪',{exact:true}).waitFor({timeout:60000});
  const fixtures=JSON.parse(fs.readFileSync('training/artifacts/model64/browser-fixtures.json','utf8'));
  const result=await page.evaluate(async fixtures=>{
    const {modelInput,paint,SIZE}=await import('/src/art.ts');
    const canvas=document.createElement('canvas');canvas.width=canvas.height=SIZE;
    const tensors28=[],tensors64=[],cases=[];
    for(const f of fixtures){
      const points=f.drawing.flatMap(s=>s[0].map((x,i)=>[x,s[1][i]]));
      const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),x0=Math.min(...xs),y0=Math.min(...ys),w=Math.max(...xs)-x0,h=Math.max(...ys)-y0,scale=600/Math.max(w,h,1);
      for(const width of [3,7,20]){
        paint(canvas.getContext('2d'),f.drawing.map(s=>({color:'#353d37',size:width,erase:false,points:s[0].map((x,i)=>({x:(SIZE-w*scale)/2+(x-x0)*scale,y:(SIZE-h*scale)/2+(s[1][i]-y0)*scale}))})));
        tensors28.push(...modelInput(canvas,28));tensors64.push(...modelInput(canvas,64));cases.push({id:f.id,label:f.label,brushWidth:width});
      }
    }
    return {cases,tensors28,tensors64};
  },fixtures);
  assert.equal(result.cases.length,fixtures.length*3);assert.equal(errors.length,0);
  const dir='training/artifacts/model64';fs.writeFileSync(path.join(dir,'browser-inputs28.bin'),Buffer.from(new Float32Array(result.tensors28).buffer));fs.writeFileSync(path.join(dir,'browser-inputs64.bin'),Buffer.from(new Float32Array(result.tensors64).buffer));fs.writeFileSync(path.join(dir,'browser-cases.json'),JSON.stringify(result.cases));
  if(!process.argv.includes('--prepare-only'))await page.screenshot({path:'docs/model-previews/model64-browser-ready.png',fullPage:true});
  console.log(JSON.stringify({modelReady:!process.argv.includes('--prepare-only'),heldOutDrawings:fixtures.length,cases:result.cases.length,pageErrors:errors}));
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
