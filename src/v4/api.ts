import type {Prepared,Entry,ArtDetail,SpriteSpec,GameResult} from './types';
let cloudPromise:Promise<any>|undefined;
export const cloudEnabled=!!import.meta.env.VITE_CLOUDBASE_ENV_ID;
export class ApiError extends Error{constructor(public code:string,message:string,public retryable=false){super(message);}}
async function cloud(){
  if(!cloudEnabled)throw new ApiError('CLOUD_NOT_CONFIGURED','云端尚未连接，画作仍安全保存在本机草稿中');
  return cloudPromise??=(async()=>{
    const {default:cloudbase}=await import('@cloudbase/js-sdk');
    const app=cloudbase.init({env:import.meta.env.VITE_CLOUDBASE_ENV_ID,region:import.meta.env.VITE_CLOUDBASE_REGION||'ap-shanghai'});
    const auth=app.auth;
    // SDK v3 auth is a property; keep guest authentication separate from per-submission playerId.
    const state=await auth.getLoginState();if(!state)await auth.signInAnonymously();return app;
  })().catch(e=>{cloudPromise=undefined;throw e;});
}
export async function call<T>(action:string,input:Record<string,unknown>={}):Promise<T>{
  const app=await cloud();
  const response=await app.callFunction({name:import.meta.env.VITE_CLOUDBASE_API_FUNCTION||'miao-api',data:{action,input}});
  const data=typeof response.result==='string'?JSON.parse(response.result):response.result;
  if(!data?.ok)throw new ApiError(data?.error?.code||'NETWORK_RETRYABLE',data?.error?.message||'网络暂时不可用，请重试',data?.error?.retryable??true);
  return {...data.data,serverNow:data.serverNow};
}
export async function submitArt(payload:{imageUrl:string;artistName:string;catName:string;clientScore:number;modelVersion:string;clientRequestId:string},onProgress:(s:string)=>void){
  const blob=await (await fetch(payload.imageUrl)).blob();
  const imageHash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()))).map(n=>n.toString(16).padStart(2,'0')).join('');
  onProgress('正在建立本轮创作身份…');
  const u=await call<{uploadId:string;artworkId:string;playerId:string;objectKey:string;status:string}>('upload.create',{...payload,imageUrl:undefined,imageHash,mime:'image/png',byteSize:blob.size});
  if(u.status==='committed')return u;
  onProgress('正在上传你的猫…');
  const bytes=new Uint8Array(await blob.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
  const uploaded=await call<{fileId:string}>('upload.put',{uploadId:u.uploadId,pngBase64:btoa(binary)});
  onProgress('正在保存并检查画作…');await call('artwork.commit',{uploadId:u.uploadId,fileId:uploaded.fileId});return u;
}
export const getStatus=(artworkId:string)=>call<{status:string;rejectionCode:string|null;playerId:string}>('artwork.status',{artworkId});
export const prepare=(artworkId:string,viewport:{width:number;height:number})=>call<Prepared>('game.prepare',{artworkId,viewport,clientRequestId:crypto.randomUUID(),deviceClass:innerWidth<700?'mobile':'desktop'});
export const getBoard=()=>call<{entries:Entry[]}>('leaderboard');
export const getExplore=()=>call<{roster:SpriteSpec[]}>('explore');
export const getDetail=(artworkId:string)=>call<ArtDetail>('artwork.detail',{artworkId});
export const clickGame=(sessionId:string,seq:number,spriteId:string,clientElapsedMs:number)=>call<GameResult>('game.click',{sessionId,seq,spriteId,clientElapsedMs});
export async function clockSync(){
  const samples=[];
  for(let i=0;i<3;i++){const a=performance.now();const r=await call<{serverNow:number}>('time');const b=performance.now();samples.push({rtt:b-a,offset:r.serverNow-(a+b)/2});}
  const best=samples.sort((a,b)=>a.rtt-b.rtt)[0];
  if(best.rtt>1000||best.rtt/2>100)throw new ApiError('CLOCK_UNSTABLE','网络时延较高，请检查网络后重试',true);
  return best;
}
