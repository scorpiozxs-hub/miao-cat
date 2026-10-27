/// <reference lib="webworker" />
import * as ort from 'onnxruntime-web/wasm';
import wasmUrl from 'onnxruntime-web/ort-wasm-simd-threaded.wasm?url';
import type {ModelManifest} from './types';
let session:ort.InferenceSession|undefined;let manifest:ModelManifest;
self.onmessage=async({data})=>{try{
  if(data.type==='init'){
    manifest=data.manifest;ort.env.wasm.numThreads=1;ort.env.wasm.wasmPaths={wasm:wasmUrl};
    const response=await fetch(manifest.url);if(!response.ok)throw Error('模型文件尚未就绪');
    const bytes=await response.arrayBuffer();
    if(manifest.sha256){const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(x=>x.toString(16).padStart(2,'0')).join('');if(digest!==manifest.sha256.toLowerCase())throw Error('模型校验不一致');}
    const externalData=await Promise.all((manifest.externalData||[]).map(async file=>{
      const response=await fetch(file.url);if(!response.ok)throw Error('模型权重文件尚未就绪');const data=await response.arrayBuffer();
      if(file.sha256){const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data))).map(x=>x.toString(16).padStart(2,'0')).join('');if(digest!==file.sha256.toLowerCase())throw Error('模型权重校验不一致');}
      return {path:file.path,data:new Uint8Array(data)};
    }));
    session=await ort.InferenceSession.create(bytes,{executionProviders:['wasm'],externalData});self.postMessage({type:'ready'});
  }else if(data.type==='predict'&&session){
    const inputName=manifest.input.name||session.inputNames[0];const outputName=manifest.output.name||session.outputNames[0];
    const result=await session.run({[inputName]:new ort.Tensor('float32',data.input,manifest.input.shape)});
    const values=Array.from(result[outputName].data as Float32Array);
    if(values.length!==manifest.output.classes.length||!values.every(Number.isFinite))throw Error('模型输出与manifest不一致');
    let probabilities=values;
    if(manifest.output.type==='logits'){const m=Math.max(...values);const ex=values.map(v=>Math.exp(v-m));const sum=ex.reduce((a,b)=>a+b,0);probabilities=ex.map(v=>v/sum);}
    if(!probabilities.every(v=>v>=0&&v<=1)||Math.abs(probabilities.reduce((a,b)=>a+b,0)-1)>.02)throw Error('模型概率无效');
    self.postMessage({type:'result',id:data.id,confidence:probabilities[manifest.output.catIndex]});
  }
}catch(e){self.postMessage({type:'error',id:data.id,message:String(e)});}};
