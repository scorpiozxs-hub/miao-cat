const {adapters}=require('../cloudbase.cjs');
(async()=>{const apply=process.argv.includes('--apply'),now=Date.now();const {db,files}=adapters();
 for(const status of ['issued','uploaded','failed','expired']){const records=await db.query('upload_requests',{status},100,[['expiresAt','asc']]);for(const u of records.filter(x=>x.createdAt<now-86400000)){console.log(JSON.stringify({action:'expire_incoming',uploadId:u._id,apply}));if(apply){if(u.incomingFileId)await files.remove(u.incomingFileId);await db.set('upload_requests',u._id,{...u,status:'expired'});}}}
 // Only audit/rate records are removed here. Never scan-delete originals or derived images.
 for(const [collection,age]of [['game_clicks',30*86400000],['rate_limits',86400000]]){const rows=await db.query(collection,{},100);for(const r of rows){const timestamp=r.receivedAt||r.expiresAt;if(timestamp&&timestamp<now-age){console.log(JSON.stringify({action:'remove_record',collection,id:r._id,apply}));if(apply)await db.remove(collection,r._id);}}}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
