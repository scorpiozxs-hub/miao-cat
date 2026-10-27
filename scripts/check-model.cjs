const fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto');
const root=path.resolve(__dirname,'..'),manifest=JSON.parse(fs.readFileSync(path.join(root,'public/models/manifest.json')));
if(manifest.input.shape.join(',')!=='1,1,64,64'||manifest.preprocessVersion!=='alpha-area-64-v2')throw Error('Unexpected model contract');
for(const f of [{url:manifest.url,sha256:manifest.sha256},...(manifest.externalData||[])]){const file=path.join(root,'public',f.url.replace(/^\//,''));const bytes=fs.readFileSync(file);if(createHash('sha256').update(bytes).digest('hex')!==f.sha256)throw Error('Corrupt model: '+f.url);}
console.log('Model and external weights verified: '+manifest.modelVersion);
