import {useEffect,useRef,useState} from 'react';
import {ArrowRight,ArrowUpRight,Undo2,Redo2,Eraser,PenLine,Trash2,Check,Shuffle,Sparkles,ChevronDown,FlaskConical} from 'lucide-react';
import type {Artwork,Profile,Stroke} from './types';
import {clearDraft,readDraft,saveDraft,publishArtwork} from './storage';
import {paint,exportArt,inkBounds,SIZE,randomName} from './art';
import {useRecognition} from './useRecognition';
import {Modal,Mascot} from './ui';
const colors=['#353d37','#e49275','#ecb7c8','#e8c76b','#94af7f','#8babc6','#b4a1c4','#ffffff'];
const stages=['未知生物','疑似猫咪','发现猫咪','超级猫咪'];
const lines=['每一只猫，都从一笔开始。','等等，这个轮廓有点猫。','喵！！我发现它了！','天呐！这绝对是一只猫！'];
export function Draw({profile,onProfile,onPublished,toast,meow}:{profile:Profile;onProfile:(p:Profile)=>void;onPublished:(art:Artwork)=>void;toast:(s:string)=>void;meow:()=>void}){
 const canvas=useRef<HTMLCanvasElement>(null),strokes=useRef<Stroke[]>([]),redo=useRef<Stroke[]>([]),active=useRef<Stroke|null>(null),frame=useRef(0),lastInference=useRef(0),sessionId=useRef(crypto.randomUUID());
 const [ready,setReady]=useState(false),[count,setCount]=useState(0),[redos,setRedos]=useState(0),[hasInk,setHasInk]=useState(false),[saved,setSaved]=useState('草稿自动保存');
 const [color,setColor]=useState(colors[0]),[size,setSize]=useState(7),[erase,setErase]=useState(false),[confirmClear,setConfirmClear]=useState(false),[preview,setPreview]=useState<string|null>(null),[catName,setCatName]=useState(''),[artist,setArtist]=useState(profile.artistName),[publishing,setPublishing]=useState(false),[error,setError]=useState(''),[demo,setDemo]=useState<number|null>(null),[showDemo,setShowDemo]=useState(false),[celebrate,setCelebrate]=useState(false),[showTools,setShowTools]=useState(false);
 const recog=useRecognition(); const effectiveStage=demo??recog.stage;const mounted=useRef(true),lastStage=useRef(0),lastCelebration=useRef(0);
 useEffect(()=>{mounted.current=true;let alive=true;readDraft().then(d=>{if(!alive)return;if(d?.strokes.length){strokes.current=d.strokes;paint(canvas.current!.getContext('2d')!,d.strokes);setCount(d.strokes.length);setHasInk(!!inkBounds(canvas.current!));setSaved('已恢复上次画作');recog.recognize(canvas.current!);}setReady(true);}).catch(()=>{if(alive){setReady(true);setSaved('本地保存不可用');toast('无法读取草稿，请检查浏览器存储权限');}});return()=>{alive=false;mounted.current=false;cancelAnimationFrame(frame.current);};},[]);
 useEffect(()=>{if(recog.status==='ready'&&hasInk)recog.recognize(canvas.current!);},[recog.status]);
 useEffect(()=>{if(effectiveStage>=2&&effectiveStage!==lastStage.current&&Date.now()-lastCelebration.current>3000){setCelebrate(true);lastCelebration.current=Date.now();meow();const t=setTimeout(()=>setCelebrate(false),1600);lastStage.current=effectiveStage;return()=>clearTimeout(t);}lastStage.current=effectiveStage;},[effectiveStage]);
 const redraw=()=>paint(canvas.current!.getContext('2d')!,active.current?[...strokes.current,active.current]:strokes.current);
 const persist=()=>{const snapshot=strokes.current.map(s=>({...s,points:[...s.points]}));setSaved('保存中…');saveDraft(snapshot).then(()=>{if(mounted.current)setSaved('草稿已保存在此设备');}).catch(()=>{if(mounted.current)setSaved('保存失败，请下载作品备份');toast('草稿保存失败，可能是存储空间不足');});};
 const sync=()=>{redraw();setCount(strokes.current.length);setRedos(redo.current.length);const exists=!!inkBounds(canvas.current!);setHasInk(exists);if(exists)recog.recognize(canvas.current!);else recog.reset();persist();};
 const point=(e:{clientX:number;clientY:number})=>{const r=canvas.current!.getBoundingClientRect();return {x:Math.max(0,Math.min(SIZE,(e.clientX-r.left)/r.width*SIZE)),y:Math.max(0,Math.min(SIZE,(e.clientY-r.top)/r.height*SIZE))};};
 const end=()=>{if(!active.current)return;strokes.current.push(active.current);active.current=null;redo.current=[];sync();};
 const complete=()=>{end();const image=exportArt(canvas.current!);if(!image){toast('先画下你的第一笔吧');return;}setPreview(image);setCatName(randomName());setError('');};
 const publish=async()=>{
  if(publishing||!preview)return;setPublishing(true);setError('');
  try{
   const name=catName.trim()||randomName();const author=artist.trim();
   if(!author)throw new Error('请先填写艺术家昵称。');
   if([...name].length>16||[...author].length>16)throw new Error('猫名和昵称最多 16 个字符。');
   const art:Artwork={id:sessionId.current,ownerId:profile.id,catName:name,artistName:author,imageUrl:preview,catConfidence:demo!==null?null:(recog.score===null?null:recog.score/100),createdAt:Date.now(),motionPreset:parseInt(profile.id.replace(/-/g,'').slice(0,4),16)%5};
   await publishArtwork(art);
   try{await clearDraft();}catch{toast('作品已保存，但草稿清理失败');}
   onProfile({...profile,artistName:author,hasPublished:true});setPreview(null);onPublished(art);
  }catch(e){setError(e instanceof Error?e.message:'保存失败，请重试');}finally{setPublishing(false);}
 };
 return <main className={`draw-page tone-${effectiveStage}`}>
  <div className="page-heading"><div><span className="eyebrow">A LITTLE DOODLE, A LITTLE MAGIC</span><h1>画一只猫，<span>让它活过来。</span><Sparkles size={25}/></h1><p>不用画得很好，画得像你就好。</p></div><span className="chapter">01 <i>/</i> 创作时间</span></div>
  <div className="drawing-layout">
   <section className="studio" aria-label="绘画工作室">
    <div className="paper-top"><span><i className="status-dot"/>你的猫咪画布</span><small className="desktop-save">{saved}</small><small className="mobile-score">{demo!==null?'演示 · ':''}猫咪识别 {demo!==null?[12,38,68,94][demo]:recog.score??'--'}%</small></div>
    <div className="paper-wrap"><div className="paper">
     {!hasInk&&count===0&&<div className="canvas-hint"><div className="ghost-cat">ฅ^•ﻌ•^ฅ</div><p>这里，正在等一只猫</p><small>拿起画笔，随便画画</small><span className="hint-arrow">↙</span></div>}
     <canvas ref={canvas} width={SIZE} height={SIZE} aria-label="猫咪绘画画布" className={erase?'erasing':''} onContextMenu={e=>e.preventDefault()}
      onPointerDown={e=>{if(!ready||active.current||e.button!==0)return;e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);active.current={points:[point(e)],color,size:erase?size*4:size,erase};redraw();}}
      onPointerMove={e=>{if(!active.current)return;e.preventDefault();const events=e.nativeEvent.getCoalescedEvents?.()||[e.nativeEvent];for(const ev of events)active.current.points.push(point(ev));cancelAnimationFrame(frame.current);frame.current=requestAnimationFrame(redraw);if(Date.now()-lastInference.current>400){lastInference.current=Date.now();recog.recognize(canvas.current!);}}}
      onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end}/>
     <span className="paper-corner">每一笔，都算数。</span>
     {celebrate&&<div className="celebration" aria-hidden="true"><b>喵！！</b>{Array.from({length:18},(_,i)=><i key={i} style={{'--i':i} as React.CSSProperties}>✦</i>)}</div>}
    </div></div>
    <div className={`toolbox ${showTools?'expanded':''}`}>
     <div className="palette" aria-label="画笔颜色">{colors.map(c=><button key={c} className={`color-swatch ${c===color&&!erase?'selected':''}`} style={{background:c}} aria-label={`颜色 ${c}`} aria-pressed={c===color&&!erase} onClick={()=>{setColor(c);setErase(false);}}>{c===color&&!erase&&<Check size={14} color={c==='#353d37'?'white':'#3c4538'}/>}</button>)}<label className="custom-color" title="自定义颜色">＋<input type="color" aria-label="自定义颜色" value={color} onChange={e=>{setColor(e.target.value);setErase(false);}}/></label></div>
     <div className="tool-row"><div className="brush-tools"><button className={`icon-button ${!erase?'active':''}`} title="画笔" aria-label="画笔" aria-pressed={!erase} onClick={()=>setErase(false)}><PenLine size={19}/></button><button className={`icon-button ${erase?'active':''}`} title="橡皮擦" aria-label="橡皮擦" aria-pressed={erase} onClick={()=>setErase(true)}><Eraser size={19}/></button><span className="tool-divider"/><div className="sizes">{[4,7,12,20].map(s=><button key={s} aria-label={`画笔粗细 ${s}`} className={size===s?'active':''} onClick={()=>setSize(s)}><i style={{width:s/1.7+2,height:s/1.7+2}}/></button>)}</div></div>
      <div className="history-tools"><button className="icon-button" disabled={!count} aria-label="撤销" title="撤销" onClick={()=>{const s=strokes.current.pop();if(s)redo.current.push(s);sync();}}><Undo2 size={18}/></button><button className="icon-button" disabled={!redos} aria-label="重做" title="重做" onClick={()=>{const s=redo.current.pop();if(s)strokes.current.push(s);sync();}}><Redo2 size={18}/></button><button className="icon-button danger" disabled={!count} aria-label="清空画布" title="清空画布" onClick={()=>setConfirmClear(true)}><Trash2 size={18}/></button></div>
      <button className="icon-button more-tools" onClick={()=>setShowTools(!showTools)} aria-label="展开绘画工具"><ChevronDown size={20}/></button>
     </div>
    </div>
   </section>
   <aside className="companion"><div className="companion-title"><span className="mini-label">你的灵感搭子</span><span className="online-pill"><i/>知壹在这里</span></div><div className="mascot-area"><span className="doodle-star">✧</span><Mascot stage={effectiveStage}/><span className="doodle-loop">〰</span></div>
    <div className="speech"><span className="speech-label">知壹说</span><h2>{lines[effectiveStage]}</h2><p>{demo!==null?'正在演示识别成功的互动效果。':recog.status==='ready'?'你尽管画，我来发现猫咪的可能。':'先自由画画吧，抽象一点也没关系。'}</p></div>
    <div className="recognition"><div className="recognition-head"><span>猫咪识别度</span><strong>{demo!==null?[12,38,68,94][demo]:recog.score??'--'}<small>%</small></strong></div><div className="meter"><i style={{width:`${demo!==null?[12,38,68,94][demo]:recog.score??0}%`}}/></div><div className="recognition-foot"><span>{stages[effectiveStage]}</span><span>{demo!==null?'演示效果 · 非 AI 结果':recog.status==='ready'?'本地 AI 已就绪':recog.status==='loading'?'模型加载中…':'实时识别暂不可用'}</span></div></div>
    <button className="primary complete-button" disabled={!hasInk||!ready} onClick={complete}><Sparkles size={18}/>完成创作<ArrowRight size={19}/></button><p className="reassurance">不管多抽象，总有一只猫想来到这个世界。</p>
    <button className="demo-toggle" onClick={()=>setShowDemo(!showDemo)}><FlaskConical size={13}/>体验四阶段反馈<ArrowUpRight size={13}/></button>
    {showDemo&&<div className="demo-controls"><small>仅演示 UI，不参与作品评分</small><div>{stages.map((s,i)=><button key={s} className={demo===i?'active':''} onClick={()=>setDemo(i)}>{s}</button>)}</div><button onClick={()=>{setDemo(null);setShowDemo(false);}}>退出演示</button></div>}
   </aside>
  </div>
  <div className="draw-bottom"><span>✳ 每一只猫，都值得被看见</span><span>画作只保存在此浏览器 · 本地体验版</span></div>
  {confirmClear&&<Modal title="给新灵感腾个地方？" onClose={()=>setConfirmClear(false)}><p className="modal-copy">当前画作会被清空。想留下它，可以先完成创作。</p><div className="modal-actions"><button className="secondary" onClick={()=>setConfirmClear(false)}>继续画</button><button className="primary" onClick={()=>{strokes.current=[];redo.current=[];recog.reset();setDemo(null);sync();setConfirmClear(false);sessionId.current=crypto.randomUUID();}}>清空画布</button></div></Modal>}
  {preview&&<Modal title="一只新猫，诞生了！" onClose={()=>{if(!publishing)setPreview(null);}} locked={publishing}><div className="finish-preview"><img src={preview} alt="你刚刚画出的猫"/><span>{recog.score===null||demo!==null?'独一无二的猫咪':`${recog.score}% · ${stages[recog.stage]}`}</span></div><form onSubmit={e=>{e.preventDefault();void publish();}}><label className="field">给它起个名字<div className="input-action"><input maxLength={16} value={catName} onChange={e=>setCatName(e.target.value)} placeholder="例如：橘子团" disabled={publishing}/><button type="button" aria-label="随机猫名" onClick={()=>setCatName(randomName())} disabled={publishing}><Shuffle size={18}/></button></div></label><label className="field">艺术家昵称<input required value={artist} maxLength={16} onChange={e=>setArtist(e.target.value)} placeholder="请填写你的昵称" disabled={publishing}/></label><p className="local-note">保存至此浏览器的猫咪广场，尚未公开到云端。</p>{error&&<p role="alert" className="form-error">{error}</p>}<button className="primary full" disabled={publishing||!artist.trim()} type="submit">{publishing?'正在保存你的猫…':'放入猫咪广场'}<ArrowRight size={18}/></button></form></Modal>}
 </main>;
}
