const {api,envId}=require('./cloud-api.cjs');const schema=require('../server/schema.json');
const response=api('DescribeTables',{MgoLimit:100,MgoOffset:0});const data=response.data||response;const existing=new Set((data.Tables||[]).map(x=>x.TableName));
for(const name of schema.collections){
 if(!existing.has(name)){api('CreateTable',{TableName:name,PermissionInfo:{EnvId:envId,AclTag:'ADMINONLY'}});console.log(name+': created, admin-only');}
 else console.log(name+': already exists');
 api('ModifyDatabaseACL',{CollectionName:name,AclTag:'ADMINONLY'});
 const indexes=(schema.indexes[name]||[]).map((fields,i)=>({IndexName:'miao_v41_'+i,MgoKeySchema:{MgoIndexKeys:Object.entries(fields).map(([Name,d])=>({Name,Direction:String(d)})),MgoIsUnique:false,MgoIsSparse:false}}));
 if(indexes.length){api('UpdateTable',{TableName:name,CreateIndexes:indexes});console.log(name+': indexes ready');}
}
