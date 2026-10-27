import {useEffect,useMemo,useState} from 'react';
import {useSearchParams} from 'react-router-dom';
import {ArrowUpRight,ArrowRight,Trophy,Download,Link,Flag,Plus} from 'lucide-react';
import type {Artwork} from './types';
import {getArtworks,saveReport} from './storage';
import {sampleArtworks,motionNames} from './art';
import {Stage} from './Stage';
import {Modal} from './ui';
export function Square({onDraw,toast}:{onDraw:()=>void;toast:(s:string)=>void}){
 const [items,setItems]=useState<Artwork[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[report,setReport]=useState(false),[reportReason,setReportReason]=useState('不适宜内容'),[reporting,setReporting]=useState(false),[copyFallback,setCopyFallback]=useState('');
 const [params,setParams]=useSearchParams();const id=params.get('artwork')||'',born=params.get('new')||'';
 const load=()=>{setLoading(true);setError('');getArtworks().then(setItems).catch(()=>setError('作品暂时没加载出来，请再试一次。')).finally(()=>setLoading(false));};
 useEffect(()=>{document.documentElement.classList.add('square-screen');return()=>document.documentElement.classList.remove('square-screen');},[]);
 useEffect(load,[]);
 const all=useMemo(()=>[...items,...sampleArtworks],[items]);
 const selected=[...items,...sampleArtworks].find(a=>a.id===id);
 const ranking=useMemo(()=>{const map=new Map<string,{name:string;count:number;latest:number;image:string}>();for(const a of all){const x=map.get(a.ownerId);if(x)x.count++;else map.set(a.ownerId,{name:a.artistName,count:1,latest:a.createdAt,image:a.imageUrl});}return [...map.values()].sort((a,b)=>b.count-a.count||b.latest-a.latest).slice(0,50);},[all]);
 const open=(a:Artwork)=>{setParams({artwork:a.id},{replace:true,preventScrollReset:true});setCopyFallback('');};
 const close=()=>{setParams({},{replace:true,preventScrollReset:true});setReport(false);};
 const share=async()=>{const link=`${location.origin}/square?artwork=${id}`;try{await navigator.clipboard.writeText(link);toast(selected?.sample?'示例作品链接已复制':'本机作品链接已复制，仅此浏览器可查看');}catch{setCopyFallback(link);}};
 return <main className="square-page"><div className="square-layout"><div className="square-main"><div className="page-heading"><div><span className="eyebrow">A SMALL WORLD OF WONDERFULLY WEIRD CATS</span><h1>所有奇奇怪怪，<span>都很可爱。</span></h1><p>欢迎来到猫咪广场。点点它们，认识新的小家伙。</p></div></div>
  <section className="playground"><div className="playground-label"><span><i className="status-dot"/>猫咪们正在摸鱼</span><span>{all.length} 只猫 · 本地广场</span></div><div className="sun-doodle" aria-hidden="true">☼</div><div className="grass grass-one">〰</div><div className="grass grass-two">〰</div><Stage artworks={all} onSelect={open} newId={born}/>{!all.length&&!loading&&<div className="stage-empty">广场还很安静，画第一只猫吧。<button className="secondary" onClick={onDraw}>开始画猫<ArrowRight size={16}/></button></div>}<div className="playground-bottom"><span>自由生长，随意撒娇。</span><span>悬停看资料 · 点击看详情 ↗</span></div></section>
  {error&&<div role="alert" className="square-status">{error}<button onClick={load}>重新加载</button></div>}
  {loading&&<div role="status" className="square-status">正在召集猫咪…</div>}
  <p className="square-note">作品与排行仅来自此浏览器。示例猫咪为预置插画，云端广场尚未连接。</p></div><aside className="artist-rail"><button className="primary rail-draw" onClick={onDraw}><Plus size={17}/>再画一只<ArrowUpRight size={15}/></button><div className="rail-card"><div className="rail-title"><Trophy size={15}/><span>艺术家排行</span></div><div className="rail-list">{ranking.slice(0,8).map((a,i)=><div className="rail-row" key={a.name+i}><b className={i<3?'top-rank':''}>{String(i+1).padStart(2,'0')}</b><img src={a.image} alt=""/><span>{a.name}<small>{a.count} 只猫咪</small></span></div>)}</div><small className="rail-foot">每一份创作都值得被看见</small></div></aside></div>
  {id&&!loading&&!selected&&<Modal title="这只猫暂时不在这里" onClose={close}><p className="modal-copy">本地作品只能在创建它的浏览器中查看。云端分享将在接入服务端后开放。</p><button className="primary full" onClick={close}>回到广场</button></Modal>}
  {selected&&<Modal title={selected.catName} onClose={close} locked={reporting}><div className={`detail-preview motion-${selected.motionPreset}`}><img src={selected.imageUrl} alt={selected.catName}/><span>{motionNames[selected.motionPreset]}</span></div><div className="detail-meta"><span>艺术家<strong>{selected.artistName}</strong></span><span>猫咪识别度<strong>{selected.catConfidence===null?'未评分':`${Math.round(selected.catConfidence*100)}%`}</strong></span></div><p className="detail-date">{selected.sample?'预置示例插画':`创作于 ${new Date(selected.createdAt).toLocaleString('zh-CN')}`}</p><div className="modal-actions"><button className="secondary" onClick={share}><Link size={16}/>复制链接</button><a className="primary" href={selected.imageUrl} download={`${selected.catName}.${selected.sample?'svg':'png'}`}><Download size={16}/>带走这只猫</a></div>{copyFallback&&<label className="field">请复制链接<input readOnly value={copyFallback} onFocus={e=>e.target.select()}/></label>}<button className="text-button report-link" onClick={()=>setReport(!report)}><Flag size={13}/>反馈作品</button>{report&&<form className="report-form" onSubmit={async e=>{e.preventDefault();setReporting(true);try{await saveReport(selected.id,reportReason);toast('反馈已保存在本机，接入服务端后可提交审核');setReport(false);}catch{toast('反馈未保存，请重试');}finally{setReporting(false);}}}><label className="field">反馈原因<select value={reportReason} onChange={e=>setReportReason(e.target.value)}><option>不适宜内容</option><option>疑似侵权</option><option>其他问题</option></select></label><small>本地记录，暂未发送给管理员。</small><button disabled={reporting} className="secondary full">{reporting?'保存中…':'保存反馈'}</button></form>}</Modal>}
 </main>;
}
