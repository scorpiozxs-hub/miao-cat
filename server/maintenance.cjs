const {adapters}=require('./cloudbase.cjs');const {moderate}=require('./moderation.cjs');
exports.main=async(event,context)=>{
 const {db,files,app}=adapters();
 // This entry point must be deployed as a separate function denied to all client callers.
 const auth=await app.auth().getAuthContext(context);if(auth.uid)throw Error('Maintenance is not a client API');
 if(event?.task==='diagnose-upload'){
  const u=await db.get('upload_requests',event.uploadId);if(!u)return {stage:'lookup',error:'Upload not found'};
  try{const bytes=await files.read(u.incomingFileId);const {deriveImage}=require('./images.cjs');const result=await deriveImage(bytes);return {stage:'image_ok',byteSize:bytes.length,imageHash:result.imageHash};}
  catch(e){return {stage:'image_failed',code:e.code||null,message:String(e.message).slice(0,1000)};}
 }
 const now=Date.now();let published=0,pending=0;
 const arts=await db.query('artworks',{status:'pending'},20,[['updatedAt','asc']]);
 for(const art of arts){try{const bytes=await files.read(art.originalFileId);const verdict=await moderate(art,bytes);await db.transaction(async tx=>{const current=await tx.get('artworks',art._id);if(!current||current.status!=='pending'||current.imageHash!==art.imageHash)return;await tx.set('artworks',art._id,{...current,status:verdict.status,moderationStatus:verdict.reason||'passed',rejectionCode:verdict.status==='rejected'?verdict.reason:null,publishedAt:verdict.status==='published'?now:null,updatedAt:now});});if(verdict.status==='published')published++;else pending++;}catch(e){console.error(JSON.stringify({event:'moderation_retry',artworkId:art._id,code:e.code||'PROVIDER_ERROR'}));}}
 const sessions=await db.query('game_sessions',{status:'running'},100,[['expiresAt','asc']]);
 const prepared=await db.query('game_sessions',{status:'prepared'},100,[['expiresAt','asc']]);
 for(const s of [...sessions,...prepared].filter(x=>x.expiresAt<now)){await db.transaction(async tx=>{const current=await tx.get('game_sessions',s._id);if(!current||!['running','prepared'].includes(current.status)||current.expiresAt>=now)return;await tx.set('game_sessions',s._id,{...current,status:current.status==='running'?'timeout':'cancelled'});const p=await tx.get('users',s.ownerId);if(p?.activeSessionId===s._id)await tx.set('users',p._id,{...p,activeSessionId:null});});}
 return {published,pending};
};
