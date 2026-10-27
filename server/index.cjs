const {randomUUID}=require('node:crypto');
const {createService}=require('./service.cjs');
const {adapters}=require('./cloudbase.cjs');
let runtime;
exports.main=async(event,context)=>{
 const receivedAt=Date.now(),requestId=randomUUID();
 try{
  runtime??=adapters();
  const auth=await runtime.app.auth().getAuthContext(context);
  const service=createService(runtime);
  const data=await service.handle(String(event?.action||''),event?.input||{},auth.uid,receivedAt);
  return {ok:true,data,requestId,serverNow:Date.now()};
 }catch(error){
  if(!error.code)console.error(JSON.stringify({event:'api_error',requestId,message:String(error.message).slice(0,250)}));
  return {ok:false,error:{code:error.code||'INTERNAL_ERROR',message:error.code?error.message:'服务暂时不可用，请稍后重试',retryable:error.retryable??!error.code},requestId,serverNow:Date.now()};
 }
};
