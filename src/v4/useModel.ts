import {useEffect,useRef,useState} from 'react';
import {modelInput} from '../art';
import type {ModelManifest} from './types';
import {scoreOf} from './scoring';
import {INPUT_SIZE,PADDING,PREPROCESS_VERSION} from '../recognition/preprocess.mjs';
type Job={input:Float32Array;revision:number;resolve?:(n:number)=>void;reject?:(e:Error)=>void};
export function useModel(){
 const [status,setStatus]=useState<'loading'|'ready'|'unavailable'>('loading');const [score,setScore]=useState<number|null>(null);const [message,setMessage]=useState('正在检查模型…');
 const worker=useRef<Worker|null>(null),manifest=useRef<ModelManifest|null>(null),active=useRef<Job|null>(null),pending=useRef<Job|null>(null),revision=useRef(0),history=useRef<number[]>([]),id=useRef(0),timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
 const pump=()=>{if(active.current||!pending.current||!worker.current)return;active.current=pending.current;pending.current=null;const job=active.current;worker.current.postMessage({type:'predict',id:++id.current,input:job.input},[job.input.buffer]);timer.current=setTimeout(()=>fail('识别超时，请稍后重新加载'),10000);};
 const fail=(m:string)=>{clearTimeout(timer.current);active.current?.reject?.(Error(m));pending.current?.reject?.(Error(m));active.current=null;pending.current=null;worker.current?.terminate();worker.current=null;setStatus('unavailable');setScore(null);setMessage(m);};
 useEffect(()=>{let alive=true;const controller=new AbortController();
  (async()=>{
    let m:ModelManifest;
    const manifestUrl=import.meta.env.VITE_MODEL_MANIFEST_URL||'/models/manifest.json';
    const r=await fetch(manifestUrl,{signal:controller.signal});if(!r.ok)throw Error('模型manifest尚未就绪');m=await r.json();
    if(m.preprocessVersion!==PREPROCESS_VERSION||m.input.shape.join(',')!==`1,1,${INPUT_SIZE},${INPUT_SIZE}`||m.input.dtype!=='float32'||m.input.padding!==PADDING||!Number.isInteger(m.output.catIndex)||m.output.classes[m.output.catIndex]!=='cat')throw Error('模型输入合同不匹配，请刷新或联系开发者');
    if(!alive)return;manifest.current=m;const w=new Worker(new URL('./model.worker.ts',import.meta.url),{type:'module'});worker.current=w;timer.current=setTimeout(()=>fail('模型加载超时'),30000);
    w.onmessage=({data})=>{if(!alive)return;if(data.type==='ready'){clearTimeout(timer.current);setStatus('ready');setMessage('本地识别已就绪');pump();}else if(data.type==='result'&&data.id===id.current){clearTimeout(timer.current);const job=active.current;active.current=null;if(job?.resolve){const value=scoreOf(data.confidence);if(value===null)job.reject?.(Error('评分无效'));else job.resolve(value);}else if(job?.revision===revision.current){history.current=[...history.current,data.confidence].slice(-3);const total=history.current.reduce((sum,v,i)=>sum+v*(i+1),0);const weights=history.current.reduce((sum,_,i)=>sum+i+1,0);setScore(scoreOf(total/weights));}pump();}else if(data.type==='error')fail(data.message||'实时识别不可用');};
    w.onerror=()=>{if(alive)fail('模型运行失败，请重新加载');};w.postMessage({type:'init',manifest:m});
  })().catch(e=>{if(alive)fail(e.message||'实时识别暂不可用');});
  return()=>{alive=false;controller.abort();clearTimeout(timer.current);worker.current?.terminate();worker.current=null;active.current?.reject?.(Error('页面已关闭'));pending.current?.reject?.(Error('页面已关闭'));};
 },[]);
 const invalidate=()=>{revision.current++;history.current=[];setScore(null);pending.current?.reject?.(Error('画作已修改'));pending.current=null;};
 const recognize=(canvas:HTMLCanvasElement)=>{revision.current++;if(status!=='ready')return;const input=modelInput(canvas,INPUT_SIZE);if(!input){setScore(null);history.current=[];return;}if(pending.current?.resolve)return;pending.current={input,revision:revision.current};pump();};
 const finalScore=(canvas:HTMLCanvasElement)=>new Promise<number>((resolve,reject)=>{if(status!=='ready'||!worker.current)return reject(Error('模型尚未就绪，暂时不能正式提交'));const input=modelInput(canvas,INPUT_SIZE);if(!input)return reject(Error('先画一只猫吧'));revision.current++;pending.current?.reject?.(Error('新的评分请求已替代'));pending.current={input,revision:revision.current,resolve,reject};pump();});
 return {status,score,message,invalidate,recognize,finalScore,modelVersion:manifest.current?.modelVersion||''};
}
