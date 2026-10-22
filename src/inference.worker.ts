/// <reference lib="webworker" />
import * as ort from 'onnxruntime-web';
let session: ort.InferenceSession | undefined;
let size=28, catIndex=0;
self.onmessage=async(event:MessageEvent)=>{
  const {type,id,input}=event.data;
  try{
    if(type==='init'){
      size=event.data.size;catIndex=event.data.catIndex;
      ort.env.wasm.numThreads=1;
      session=await ort.InferenceSession.create(event.data.url,{executionProviders:['wasm']});
      self.postMessage({type:'ready'});
    }else if(type==='predict'&&session){
      const output=await session.run({[session.inputNames[0]]:new ort.Tensor('float32',input,[1,1,size,size])});
      const values=Array.from(output[session.outputNames[0]].data as Float32Array);
      if(values.length<2||catIndex<0||catIndex>=values.length||!values.every(Number.isFinite))throw new Error('模型输出不符合多类分类约定');
      const sum=values.reduce((a,b)=>a+b,0);
      const probabilities=values.every(v=>v>=0&&v<=1)&&Math.abs(sum-1)<0.02?values:(()=>{const max=Math.max(...values);const exps=values.map(v=>Math.exp(v-max));const total=exps.reduce((a,b)=>a+b,0);return exps.map(v=>v/total);})();
      self.postMessage({type:'result',id,confidence:probabilities[catIndex]});
    }
  }catch(error){self.postMessage({type:'error',id,message:String(error)});}
};
