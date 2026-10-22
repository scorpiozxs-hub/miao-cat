import { useCallback,useEffect,useRef,useState } from 'react';
import { getStage,modelInput } from './art';
export function useRecognition(){
  const [status,setStatus]=useState<'loading'|'ready'|'unavailable'>('loading');
  const [score,setScore]=useState<number|null>(null);const [stage,setStage]=useState(0);
  const worker=useRef<Worker|null>(null),busy=useRef(false),latest=useRef<HTMLCanvasElement|null>(null),revision=useRef(0),history=useRef<number[]>([]),timeout=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
  const size=Number(import.meta.env.VITE_MODEL_SIZE||28);
  const pump=useCallback(()=>{
    if(busy.current||!worker.current||!latest.current)return;
    const input=modelInput(latest.current,size);latest.current=null;if(!input)return;
    busy.current=true;worker.current.postMessage({type:'predict',input,id:revision.current},[input.buffer]);
    timeout.current=setTimeout(()=>{worker.current?.terminate();worker.current=null;busy.current=false;setStatus('unavailable');setScore(null);setStage(0);},10000);
  },[size]);
  useEffect(()=>{
    const url=import.meta.env.VITE_MODEL_URL;
    if(!url){setStatus('unavailable');return;}
    const w=new Worker(new URL('./inference.worker.ts',import.meta.url),{type:'module'});worker.current=w;
    const initTimer=setTimeout(()=>{w.terminate();worker.current=null;setStatus('unavailable');},20000);
    w.onmessage=({data})=>{
      if(data.type==='ready'){clearTimeout(initTimer);setStatus('ready');pump();}
      if(data.type==='result'){clearTimeout(timeout.current);busy.current=false;if(data.id===revision.current){history.current=[...history.current,data.confidence].slice(-3);const weights=history.current.map((_,i)=>i+1);const n=Math.round(history.current.reduce((s,v,i)=>s+v*weights[i],0)/weights.reduce((a,b)=>a+b,0)*100);setScore(n);setStage(p=>getStage(n,p));}pump();}
      if(data.type==='error'){clearTimeout(initTimer);clearTimeout(timeout.current);busy.current=false;setStatus('unavailable');setScore(null);w.terminate();worker.current=null;}
    };
    w.onerror=()=>{clearTimeout(initTimer);setStatus('unavailable');w.terminate();worker.current=null;};
    w.postMessage({type:'init',url,size,catIndex:Number(import.meta.env.VITE_CAT_CLASS_INDEX||0)});
    return()=>{w.terminate();worker.current=null;clearTimeout(initTimer);clearTimeout(timeout.current);};
  },[pump,size]);
  const recognize=useCallback((canvas:HTMLCanvasElement)=>{revision.current++;latest.current=canvas;if(status==='ready')pump();},[status,pump]);
  const reset=useCallback(()=>{revision.current++;latest.current=null;history.current=[];setScore(null);setStage(0);},[]);
  return {status,score,stage,recognize,reset};
}
