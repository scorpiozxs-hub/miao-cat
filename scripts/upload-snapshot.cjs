// Independent release assets use bounded parallel uploads. Authentication stays in gh's credential store.
const fs=require('node:fs'),path=require('node:path'),{spawn,execFileSync}=require('node:child_process'),{createHash}=require('node:crypto');
const directory=path.resolve(process.argv[2]||'migration-assets'),tag=process.argv[3]||'dev-snapshot-2026-10-28';
const metadata=JSON.parse(fs.readFileSync(path.join(directory,'ASSETS.json'),'utf8'));
const release=JSON.parse(execFileSync('gh',['api','repos/'+metadata.repository+'/releases'],{encoding:'utf8'})).find(r=>r.tag_name===tag);
if(!release)throw Error('Create the draft release before uploading snapshot assets');
const queue=metadata.assets.flatMap(a=>a.parts.map(p=>p.name)).concat(['SHA256SUMS.txt','ASSETS.json']).filter(name=>{
 const local=fs.readFileSync(path.join(directory,name)),digest='sha256:'+createHash('sha256').update(local).digest('hex');
 const exists=release.assets.some(a=>a.name===name&&a.state==='uploaded'&&a.size===local.length&&a.digest===digest);
 if(exists)console.log('Already verified '+name);return !exists;
});
async function upload(name){for(let attempt=1;attempt<=5;attempt++){
 const ok=await new Promise(resolve=>{const child=spawn('gh',['release','upload',tag,path.join(directory,name),'--repo',metadata.repository,'--clobber'],{windowsHide:true,stdio:['ignore','ignore','pipe']});let error='';child.stderr.on('data',d=>error+=d);child.on('error',e=>{error=e.message;resolve(false);});child.on('exit',code=>{if(code)process.stderr.write(name+' attempt '+attempt+': '+error.slice(0,300)+'\n');resolve(code===0);});});
 if(ok){console.log('Uploaded '+name);return;}
 await new Promise(r=>setTimeout(r,Math.min(attempt*5000,20000)));
 }throw Error('Upload failed after retries: '+name);}
(async()=>{let completed=0;const failures=[];await Promise.all(Array.from({length:4},async()=>{while(queue.length){const name=queue.shift();try{await upload(name);completed++;console.log('Completed '+completed+' release assets');}catch(e){failures.push(name);console.error(e.message);}}}));if(failures.length)throw Error('Run again to resume only missing assets: '+failures.join(', '));console.log('All snapshot assets uploaded.');})().catch(e=>{console.error(e.message);process.exitCode=1;});
