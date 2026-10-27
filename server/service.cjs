const {randomUUID,createHash,randomInt}=require('node:crypto');
const {check}=require('./errors.cjs');
const RULES=require('./rules.cjs');
const hash=s=>createHash('sha256').update(s).digest('hex');
const name=(value,label)=>{const s=String(value||'').trim();check([...s].length>=1&&[...s].length<=16,'NAME_INVALID',`${label}需要1–16个字符`);return s;};
const short=id=>hash(id).slice(0,4);
function shuffle(items){for(let i=items.length-1;i>0;i--){const j=randomInt(i+1);[items[i],items[j]]=[items[j],items[i]];}return items;}
function createService({db,files,now=Date.now}){
  async function owner(authUid,playerId,tx=db){const p=await tx.get('users',playerId);check(p&&p.authUid===authUid,'SESSION_NOT_OWNER','当前身份无权访问');check(p.status==='active','USER_UNAVAILABLE','当前玩家不可用');return p;}
  async function ownedSession(authUid,id,tx=db){const s=await tx.get('game_sessions',id);check(s,'SESSION_EXPIRED','本局不存在或已过期');const p=await owner(authUid,s.ownerId,tx);return {s,p};}
  async function resources(roster){const ids=[...new Set(roster.map(x=>x.artworkId))];const arts=await Promise.all(ids.map(id=>db.get('artworks',id)));const byId=new Map(arts.filter(Boolean).map(a=>[a._id,a]));const urls=await files.urls([...new Set(arts.filter(Boolean).map(a=>a.thumbnailFileId))]);return roster.map(x=>{const a=byId.get(x.artworkId);check(a?.status==='published','ASSET_NOT_READY','作品资源发生变化，请重新准备',true);return {...x,imageUrl:urls[a.thumbnailFileId]};});}
  async function publicArt(a){const urls=await files.urls([a.thumbnailFileId,a.originalFileId]);return {id:a._id,catName:a.catName,artistName:a.artistNameSnapshot,artistCode:short(a.ownerId),createdAt:a.createdAt,imageUrl:urls[a.thumbnailFileId],downloadUrl:urls[a.originalFileId],source:a.source};}
  async function rate(authUid,action,max){await db.transaction(async tx=>{const id=hash(`${authUid}:${action}:${Math.floor(now()/60000)}`);const r=await tx.get('rate_limits',id)||{count:0};check(r.count<max,'RATE_LIMITED','操作较频繁，请稍后再试',true);await tx.set('rate_limits',id,{count:r.count+1,expiresAt:now()+120000});});}
  return {async handle(action,input={},authUid,receivedAt=now()){
    if(action==='time')return {serverNow:now()};
    if(action==='rules')return {...RULES,enabled:true};
    if(action==='leaderboard'){
      const rows=await db.query('leaderboard_best',{rulesVersion:RULES.version,status:'eligible'},20,[['bestElapsedMs','asc'],['achievedAt','asc'],['userId','asc']]);
      return {entries:rows.map((r,i)=>({rank:i+1,artistName:r.artistNameSnapshot,artistCode:short(r.userId),elapsedMs:r.bestElapsedMs})),generatedAt:now()};
    }
    if(action==='explore'){
      const arts=await db.query('artworks',{status:'published'},50,[['createdAt','desc']]);
      if(!arts.length)return {roster:[]};
      const roster=shuffle(Array.from({length:50},(_,i)=>({spriteId:randomUUID(),artworkId:arts[i%arts.length]._id,motionSeed:randomInt(2147483647)})));
      return {roster:await resources(roster)};
    }
    if(action==='artwork.detail'){
      const a=await db.get('artworks',input.artworkId);check(a?.status==='published','ARTWORK_UNAVAILABLE','作品尚未公开或已不可用');return publicArt(a);
    }
    check(authUid,'AUTH_REQUIRED','请先完成游客登录',true);
    if(action==='upload.create'){
      check(typeof input.clientRequestId==='string'&&/^[a-zA-Z0-9-]{16,80}$/.test(input.clientRequestId),'REQUEST_INVALID','请求编号无效');
      check(input.mime==='image/png'&&Number.isInteger(input.byteSize)&&input.byteSize>0&&input.byteSize<=2097152,'IMAGE_INVALID','需要2MB以内的PNG');
      const artistName=name(input.artistName,'艺术家昵称');const catName=name(input.catName,'猫名');
      const payloadHash=hash(JSON.stringify([artistName,catName,input.imageHash,input.clientScore,input.modelVersion,input.byteSize]));
      check(Number.isInteger(input.clientScore)&&input.clientScore>50&&input.clientScore<=100,'SCORE_TOO_LOW','最终评分必须超过50分');
      check(input.modelVersion===RULES.modelVersion,'MODEL_UNAVAILABLE','模型版本已更新，请刷新后重新评分');
      const id=hash(`${authUid}:${input.clientRequestId}`);
      if(!await db.get('upload_requests',id))await rate(authUid,'submit',3);
      return db.transaction(async tx=>{
        const existing=await tx.get('upload_requests',id);
        if(existing){check(existing.payloadHash===payloadHash,'REQUEST_CONFLICT','同一提交编号不能用于另一幅画作');check(existing.status==='committed'||existing.expiresAt>now(),'UPLOAD_EXPIRED','上传已过期，请重新提交');return {uploadId:id,artworkId:existing.artworkId,playerId:existing.ownerId,objectKey:existing.objectKey,expiresAt:existing.expiresAt,status:existing.status};}
        const playerId=randomUUID(),artworkId=randomUUID();const objectKey=`private/incoming/${authUid}/${id}.png`;
        await tx.set('users',playerId,{authUid,artistName,status:'active',activeSessionId:null,createdAt:now(),updatedAt:now()});
        await tx.set('upload_requests',id,{ownerId:playerId,authUid,artworkId,clientRequestId:input.clientRequestId,payloadHash,objectKey,status:'issued',createdAt:now(),expiresAt:now()+300000,artistName,catName,clientScore:input.clientScore,modelVersion:input.modelVersion,imageHash:input.imageHash,byteSize:input.byteSize});
        return {uploadId:id,artworkId,playerId,objectKey,expiresAt:now()+300000,status:'issued'};
      });
    }
    if(action==='upload.put'){
      const u=await db.get('upload_requests',input.uploadId);
      check(u&&u.authUid===authUid,'SESSION_NOT_OWNER','上传不属于当前登录身份');
      check(u.expiresAt>now(),'UPLOAD_EXPIRED','上传已过期，请重新提交');
      check(typeof input.pngBase64==='string'&&input.pngBase64.length<=2796204,'IMAGE_INVALID','图片不能超过2MB');
      const bytes=Buffer.from(input.pngBase64,'base64');
      check(bytes.length===u.byteSize&&hash(bytes)===u.imageHash,'IMAGE_INVALID','上传内容与最终画面不一致');
      const fileId=await files.write(u.objectKey,bytes);
      await db.transaction(async tx=>{const current=await tx.get('upload_requests',input.uploadId);if(current&&current.status!=='committed')await tx.set('upload_requests',input.uploadId,{...current,status:'uploaded',incomingFileId:fileId});});
      return {fileId};
    }
    if(action==='artwork.commit'){
      const upload=await db.get('upload_requests',input.uploadId);check(upload&&upload.authUid===authUid,'SESSION_NOT_OWNER','上传不属于当前玩家');
      if(upload.status==='committed')return {artworkId:upload.artworkId,playerId:upload.ownerId,status:(await db.get('artworks',upload.artworkId))?.status};
      check(upload.expiresAt>now(),'UPLOAD_EXPIRED','上传已过期，请重新提交');
      check(files.isExpected(input.fileId,upload.objectKey),'IMAGE_INVALID','上传对象路径不匹配');
      const bytes=await files.read(input.fileId);check(bytes.length===upload.byteSize&&hash(bytes)===upload.imageHash,'IMAGE_INVALID','上传内容与最终画面不一致');
      const {deriveImage}=require('./images.cjs');const image=await deriveImage(bytes);
      const originalFileId=await files.write(`private/originals/${upload.artworkId}.png`,bytes);
      const thumbnailFileId=await files.write(`private/derived/${upload.artworkId}/thumb.png`,image.thumbnail);
      const maskFileId=await files.write(`private/derived/${upload.artworkId}/mask.bin`,image.mask);
      return db.transaction(async tx=>{
        const u=await tx.get('upload_requests',input.uploadId);check(u&&u.authUid===authUid,'SESSION_NOT_OWNER','上传状态变化');
        if(u.status!=='committed'){
          await tx.set('artworks',upload.artworkId,{ownerId:u.ownerId,catName:u.catName,artistNameSnapshot:u.artistName,source:'user',originalFileId,thumbnailFileId,maskFileId,imageHash:image.imageHash,inkBounds:image.inkBounds,width:512,height:512,byteSize:bytes.length,clientScore:u.clientScore,score:u.clientScore,serverConfidence:null,modelVersion:u.modelVersion,preprocessVersion:RULES.preprocessVersion,status:'pending',moderationStatus:'queued',rejectionCode:null,randomKey:Math.random(),createdAt:now(),updatedAt:now(),publishedAt:null});
          await tx.set('upload_requests',input.uploadId,{...u,status:'committed'});
        }
        return {artworkId:u.artworkId,playerId:u.ownerId,status:'pending'};
      });
    }
    if(action==='artwork.status'){
      const a=await db.get('artworks',input.artworkId);check(a,'ARTWORK_UNAVAILABLE','作品不存在');await owner(authUid,a.ownerId);
      return {artworkId:a._id,status:a.status,rejectionCode:a.rejectionCode,playerId:a.ownerId};
    }
    if(action==='game.prepare'){
      check(typeof input.clientRequestId==='string'&&/^[a-zA-Z0-9-]{16,80}$/.test(input.clientRequestId),'REQUEST_INVALID','准备请求编号无效');
      const a=await db.get('artworks',input.artworkId);check(a?.status==='published'&&a.score>50,'CONTENT_PENDING','作品已保存，正在等待内容检查',true);await owner(authUid,a.ownerId);
      const sessionKey=hash(`${authUid}:${input.clientRequestId}`);const previous=await db.get('game_sessions',sessionKey);
      if(previous){check(previous.ownerId===a.ownerId&&previous.targetArtworkId===a._id&&previous.status==='prepared'&&previous.expiresAt>now(),'SESSION_EXPIRED','本次准备已结束，请重新开始');return {sessionId:previous._id,playerId:a.ownerId,roster:await resources(previous.roster),rulesVersion:previous.rulesVersion};}
      await rate(authUid,'prepare',6);
      check(input.viewport&&Number.isFinite(input.viewport.width)&&Number.isFinite(input.viewport.height)&&input.viewport.width>=200&&input.viewport.height>=180,'VIEWPORT_INVALID','当前舞台太小，请调整窗口');
      const pool=await db.query('artworks',{status:'published'},100,[['randomKey','asc']]);
      const candidates=pool.filter(x=>x._id!==a._id&&x.imageHash!==a.imageHash);
      check(candidates.length,'POOL_INSUFFICIENT','云端暂时没有其他可用画作，请稍后再来',true);
      const preferred=candidates.filter(x=>x.ownerId!==a.ownerId);const source=shuffle(preferred.length?preferred:candidates);
      const ids=shuffle([a._id,...Array.from({length:49},(_,i)=>source[i%source.length]._id)]);
      const roster=ids.map(artworkId=>({spriteId:randomUUID(),artworkId,motionSeed:randomInt(2147483647)}));
      const saved=await db.transaction(async tx=>{
        const existing=await tx.get('game_sessions',sessionKey);if(existing)return {sessionId:sessionKey,roster:existing.roster};
        const p=await owner(authUid,a.ownerId,tx);
        if(p.activeSessionId){const old=await tx.get('game_sessions',p.activeSessionId);check(!old||['cancelled','finished','timeout','invalid'].includes(old.status)||(old.expiresAt&&old.expiresAt<=now()),'SESSION_ACTIVE','还有一局尚未结束，请先退出');}
        const id=sessionKey;await tx.set('game_sessions',id,{ownerId:a.ownerId,targetArtworkId:a._id,rulesVersion:RULES.version,roster,viewport:input.viewport,deviceClass:input.deviceClass==='mobile'?'mobile':'desktop',status:'prepared',preparedAt:now(),startsAt:null,expiresAt:now()+300000,lastSeq:0,lastClickAt:0,wrongClicks:0,artistNameSnapshot:a.artistNameSnapshot,riskStatus:'eligible'});
        await tx.set('users',a.ownerId,{...p,activeSessionId:id});return {sessionId:id,roster};
      });return {sessionId:saved.sessionId,playerId:a.ownerId,roster:await resources(saved.roster),rulesVersion:RULES.version};
    }
    if(action==='game.start')return db.transaction(async tx=>{
      const {s,p}=await ownedSession(authUid,input.sessionId,tx);
      if(s.status==='running'&&s.startRequestId===input.startRequestId)return {startsAt:s.startsAt,expiresAt:s.expiresAt};
      check(s.status==='prepared'&&s.expiresAt>receivedAt&&p.activeSessionId===s._id,'SESSION_EXPIRED','本局已失效，请重新准备');
      check(input.readyCount===50&&Number.isFinite(input.clockRttMs)&&input.clockRttMs<=1000&&Number.isFinite(input.clockErrorMs)&&input.clockErrorMs<=100,'ASSET_NOT_READY','图片或网络时钟尚未准备好',true);
      const startsAt=now()+3000,expiresAt=startsAt+180000;await tx.set('game_sessions',s._id,{...s,status:'running',startsAt,expiresAt,startRequestId:input.startRequestId});return {startsAt,expiresAt};
    });
    if(action==='game.click')return db.transaction(async tx=>{
      const {s,p}=await ownedSession(authUid,input.sessionId,tx);const clickId=hash(`${s._id}:${input.seq}`);
      const existing=await tx.get('game_clicks',clickId);if(existing){check(existing.spriteId===input.spriteId,'REQUEST_CONFLICT','点击编号已使用');return existing.responseSnapshot;}
      if(s.status==='finished')return s.result;
      check(s.status==='running'&&p.activeSessionId===s._id,'SESSION_CANCELLED','本局已取消');
      check(receivedAt>=s.startsAt,'SESSION_NOT_STARTED','倒数尚未结束');
      check(Number.isInteger(input.seq)&&input.seq===s.lastSeq+1,'SEQ_INVALID','点击顺序不一致，请重试',true);
      if(receivedAt>s.expiresAt){await tx.set('game_sessions',s._id,{...s,status:'timeout'});await tx.set('users',p._id,{...p,activeSessionId:null});return {outcome:'timeout'};}
      const sprite=s.roster.find(x=>x.spriteId===input.spriteId);check(sprite,'SPRITE_INVALID','猫咪不在本局阵容');
      const throttled=receivedAt-s.lastClickAt<250;
      let response={outcome:throttled?'throttled':'wrong'};
      let updated={...s,lastSeq:input.seq,lastClickAt:throttled?s.lastClickAt:receivedAt,wrongClicks:s.wrongClicks+(throttled?0:1)};
      if(!throttled&&sprite.artworkId===s.targetArtworkId){
        const a=await tx.get('artworks',s.targetArtworkId);check(a?.status==='published','CONTENT_REJECTED','目标作品目前不可公开');
        const elapsedMs=Math.max(0,Math.floor(receivedAt-s.startsAt));const bestId=hash(`${s.rulesVersion}:${p._id}`);const best=await tx.get('leaderboard_best',bestId);
        const bestChanged=!best||elapsedMs<best.bestElapsedMs;
        if(bestChanged)await tx.set('leaderboard_best',bestId,{rulesVersion:s.rulesVersion,userId:p._id,bestElapsedMs:elapsedMs,bestSessionId:s._id,artworkId:a._id,artistNameSnapshot:s.artistNameSnapshot,achievedAt:receivedAt,updatedAt:now(),status:'eligible'});
        response={outcome:'found',elapsedMs,bestElapsedMs:bestChanged?elapsedMs:best.bestElapsedMs,bestChanged,artistCode:short(p._id)};
        updated={...updated,status:'finished',wrongClicks:s.wrongClicks,foundAt:receivedAt,elapsedMs,result:response};await tx.set('users',p._id,{...p,activeSessionId:null});
      }
      await tx.set('game_sessions',s._id,updated);await tx.set('game_clicks',clickId,{sessionId:s._id,ownerId:p._id,spriteId:input.spriteId,seq:input.seq,receivedAt,outcome:response.outcome,responseSnapshot:response});return response;
    });
    if(action==='game.cancel')return db.transaction(async tx=>{const {s,p}=await ownedSession(authUid,input.sessionId,tx);if(!['finished','cancelled','timeout','invalid'].includes(s.status)){await tx.set('game_sessions',s._id,{...s,status:'cancelled',invalidReason:String(input.reason||'exit').slice(0,80)});if(p.activeSessionId===s._id)await tx.set('users',p._id,{...p,activeSessionId:null});}return {status:s.status==='finished'?'finished':'cancelled'};});
    if(action==='game.get'){const {s}=await ownedSession(authUid,input.sessionId);return {status:s.status,result:s.result||null};}
    if(action==='artwork.report'){
      check(['inappropriate','copyright','other'].includes(input.reason),'REQUEST_INVALID','请选择反馈原因');
      const a=await db.get('artworks',input.artworkId);check(a?.status==='published','ARTWORK_UNAVAILABLE','作品不可用');const id=hash(`${authUid}:${a._id}`);await db.transaction(async tx=>{if(!await tx.get('reports',id))await tx.set('reports',id,{artworkId:a._id,reporterId:authUid,reason:input.reason,status:'open',createdAt:now()});});return {reportId:id};
    }
    check(false,'NOT_FOUND','接口不存在');
  }};
}
module.exports={createService,hash,name};
