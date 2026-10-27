const fs=require('node:fs'),path=require('node:path');const root=path.resolve(__dirname,'..');
for(const name of ['miao-api','miao-maintenance']){
 const dest=path.join(root,'.cloud-deploy',name);fs.mkdirSync(dest,{recursive:true});
 for(const f of fs.readdirSync(path.join(root,'server')).filter(x=>x.endsWith('.cjs')||['package.json','schema.json','rules.cjs'].includes(x)))fs.copyFileSync(path.join(root,'server',f),path.join(dest,f));
 const pkg=JSON.parse(fs.readFileSync(path.join(dest,'package.json'),'utf8'));const sharp=require('../server/node_modules/sharp/package.json');
 // Cloud dependency installation may omit optional packages; make the two Linux binaries explicit.
 for(const dependency of ['@img/sharp-linux-x64','@img/sharp-libvips-linux-x64'])pkg.dependencies[dependency]=sharp.optionalDependencies[dependency];
 fs.writeFileSync(path.join(dest,'package.json'),JSON.stringify(pkg,null,2));
 const oldLock=path.join(dest,'package-lock.json');if(fs.existsSync(oldLock))fs.unlinkSync(oldLock);
 fs.writeFileSync(path.join(dest,'index.js'),`exports.main = require('./${name==='miao-api'?'index':'maintenance'}.cjs').main;\n`);
}
console.log('Prepared event functions; no credentials or local node_modules included.');
