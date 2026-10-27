// Deletes only the two explicitly identified uploads created by our connection check.
const {api,run}=require('./cloud-api.cjs');
const ids=new Set(['13fd20d6cd97540a05198e15df79efd4dfb6426dc63417fb1c5c1e757147e0c9','caf33b8c62a8a51ae8ab09cc717217770ddbd136ba2c47ac3f7d988e645a5f2c']);
function query(table,filter){const r=api('RunCommands',{MgoCommands:[{TableName:table,CommandType:'QUERY',Command:JSON.stringify({find:table,filter,limit:100})}]});return JSON.parse(r.data.Data[0]).map(x=>JSON.parse(x));}
function remove(table,id,extra){api('RunCommands',{MgoCommands:[{TableName:table,CommandType:'DELETE',Command:JSON.stringify({delete:table,deletes:[{q:{_id:id,...extra},limit:1}]})}]});}
for(const u of query('upload_requests',{artistName:'连接验证画家'}).filter(x=>ids.has(x._id)&&x.catName==='连接验证猫')){
 const art=query('artworks',{_id:u.artworkId})[0];
 const files=[u.incomingFileId,...(art&&art.artistNameSnapshot==='连接验证画家'?[art.originalFileId,art.thumbnailFileId,art.maskFileId]:[])].filter(Boolean);
 for(const file of files){const key=file.split('/').slice(3).join('/');if(!key.startsWith('private/'))throw Error('Unexpected cleanup target');run(['storage','rm',key,'--force']);}
 if(art?.artistNameSnapshot==='连接验证画家')remove('artworks',art._id,{artistNameSnapshot:'连接验证画家'});
 remove('users',u.ownerId,{artistName:'连接验证画家'});remove('upload_requests',u._id,{artistName:'连接验证画家'});
 console.log(JSON.stringify({removedUpload:u._id,files:files.length}));
}
console.log(JSON.stringify({remainingKnownUploads:query('upload_requests',{artistName:'连接验证画家'}).filter(x=>ids.has(x._id)).length}));
