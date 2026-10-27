// A missing strategy or provider failure never publishes an artwork.
async function moderate(art,bytes){
 if(!process.env.IMS_BIZ_TYPE||!process.env.TMS_BIZ_TYPE)return {status:'pending',reason:'moderation_not_configured'};
 const {ims}=require('tencentcloud-sdk-nodejs-ims');const {tms}=require('tencentcloud-sdk-nodejs-tms');
 const credential={secretId:process.env.TENCENTCLOUD_SECRETID,secretKey:process.env.TENCENTCLOUD_SECRETKEY,token:process.env.TENCENTCLOUD_SESSIONTOKEN};
 const config={credential,region:process.env.MODERATION_REGION||'ap-shanghai',profile:{httpProfile:{reqTimeout:30}}};
 const imageClient=new ims.v20201229.Client(config),textClient=new tms.v20201229.Client(config);
 const [image,text]=await Promise.all([
  imageClient.ImageModeration({FileContent:bytes.toString('base64'),BizType:process.env.IMS_BIZ_TYPE,DataId:art._id}),
  textClient.TextModeration({Content:Buffer.from(`${art.catName}\n${art.artistNameSnapshot}`).toString('base64'),BizType:process.env.TMS_BIZ_TYPE,DataId:art._id})
 ]);
 if(image.Suggestion==='Block'||text.Suggestion==='Block')return {status:'rejected',reason:'content_rejected'};
 if(image.Suggestion==='Pass'&&text.Suggestion==='Pass')return {status:'published',reason:null};
 return {status:'pending',reason:'manual_review'};
}
module.exports={moderate};
