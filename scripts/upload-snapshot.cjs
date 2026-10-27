// Independent release assets use bounded parallel uploads. Authentication stays in gh's credential store.
const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const directory=path.resolve(process.argv[2]||'migration-assets'),tag=process.argv[3]||'dev-snapshot-2026-10-28';
const metadata=JSON.parse(fs.readFileSync(path.join(directory,'ASSETS.json'),'utf8'));
const queue=metadata.assets.flatMap(a=>a.parts.map(p=>p.name)).concat(['SHA256SUMS.txt','ASSETS.json']);
async function upload(name){for(let attempt=1;attempt<=3;attempt++){
 const ok=await new Promise(resolve=>{const child=spawn('gh',['release','upload',tag,path.join(directory,name),'--repo',metadata.repository,'--clobber'],{windowsHide:true,stdio:['ignore','ignore','pipe']});let error='';child.stderr.on('data',d=>error+=d);child.on('error',e=>{error=e.message;resolve(false);});child.on('exit',code=>{if(code)process.stderr.write(name+' attempt '+attempt+': '+error.slice(0,300)+'\n');resolve(code===0);});});
 if(ok){console.log('Uploaded '+name);return;}
 }throw Error('Upload failed after retries: '+name);}
(async()=>{let completed=0;await Promise.all(Array.from({length:8},async()=>{while(queue.length){const name=queue.shift();await upload(name);completed++;console.log('Completed '+completed+' release assets');}}));console.log('All snapshot assets uploaded.');})().catch(e=>{console.error(e.message);process.exitCode=1;});
