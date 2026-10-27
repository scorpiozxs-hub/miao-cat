const tcb=require('@cloudbase/node-sdk');
function adapters(){
 const app=tcb.init({env:process.env.TCB_ENV||process.env.SCF_NAMESPACE});const database=app.database();
 const wrap=source=>({
  async get(collection,id){try{const r=await source.collection(collection).doc(id).get();const d=r.data;return (Array.isArray(d)?d[0]:d)||null;}catch(e){if(['DATABASE_DOCUMENT_NOT_EXIST','DOCUMENT_NOT_FOUND'].includes(e.code))return null;throw e;}},
  async set(collection,id,value){const {_id,...data}=value;await source.collection(collection).doc(id).set(data);},
  async remove(collection,id){await source.collection(collection).doc(id).remove();},
  async query(collection,where,limit=100,sort=[]){let q=source.collection(collection).where(where);for(const [field,order] of sort)q=q.orderBy(field,order);return (await q.limit(limit).get()).data||[];}
 });
 const db={...wrap(database),transaction:fn=>database.runTransaction(tx=>fn(wrap(tx)))};
 const files={
  isExpected(fileId,key){if(typeof fileId!=='string'||!fileId.startsWith('cloud://'))return false;return fileId.endsWith('/'+key)&&fileId.split('/')[2]?.startsWith((process.env.TCB_ENV||process.env.SCF_NAMESPACE)+'.');},
  async read(fileID){return (await app.downloadFile({fileID})).fileContent;},
  async write(cloudPath,bytes){return (await app.uploadFile({cloudPath,fileContent:bytes})).fileID;},
  async remove(fileID){await app.deleteFile({fileList:[fileID]});},
  async urls(ids){if(!ids.length)return {};const r=await app.getTempFileURL({fileList:ids.map(fileID=>({fileID,maxAge:600}))});return Object.fromEntries(r.fileList.map(x=>[x.fileID,x.tempFileURL]));}
 };return {app,database,db,files};
}
module.exports={adapters};
