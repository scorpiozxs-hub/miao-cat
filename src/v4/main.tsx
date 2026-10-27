import React,{useCallback,useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter,NavLink,Navigate,Route,Routes,useLocation,useNavigate} from 'react-router-dom';
import {Cat,Grid2X2,PenLine,Volume2,VolumeX} from 'lucide-react';
import {Draw} from './Draw';
import {Square,type SquareEntry} from './Square';
import {clearDraft} from '../storage';
import './styles.css';
function App(){
 const navigate=useNavigate(),location=useLocation();const [entry,setEntry]=useState<SquareEntry|null>(null),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[offline,setOffline]=useState(!navigator.onLine),[muted,setMuted]=useState(()=>localStorage.getItem('miao-muted')!=='false'),[round,setRound]=useState(0);const timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
 const notify=useCallback((s:string)=>{setNotice(s);clearTimeout(timer.current);timer.current=setTimeout(()=>setNotice(''),5500);},[]);
 useEffect(()=>{const fn=()=>setOffline(!navigator.onLine);addEventListener('online',fn);addEventListener('offline',fn);return()=>{removeEventListener('online',fn);removeEventListener('offline',fn);clearTimeout(timer.current);};},[]);
 useEffect(()=>{document.documentElement.classList.toggle('find-square',location.pathname==='/square');window.scrollTo(0,0);return()=>document.documentElement.classList.remove('find-square');},[location.pathname]);
 const restart=useCallback(()=>{void clearDraft().catch(()=>notify('旧草稿未能清理，请在画布上清空后重画'));setEntry(null);setRound(x=>x+1);navigate('/draw');},[navigate,notify]);
 const onBusy=useCallback((v:boolean)=>setBusy(v),[]);
 return <div className={`app-v4 ${location.pathname==='/square'?'square-app':''}`}><header className="site-header"><NavLink to="/draw" className="brand" onClick={e=>{if(busy)e.preventDefault();}}><span className="brand-icon"><Cat size={27} strokeWidth={1.6}/></span><span>摸凹猫<small>MIAO / FIND YOUR LITTLE CAT</small></span></NavLink><nav aria-label="主导航">{[{to:'/draw',label:'画一只猫',Icon:PenLine},{to:'/square',label:'找猫广场',Icon:Grid2X2}].map(({to,label,Icon})=><NavLink key={to} to={to} aria-disabled={busy} onClick={e=>{if(busy){e.preventDefault();notify('比赛进行中，可用“重新画猫”结束当前局');}else if(to==='/square'&&location.pathname!=='/square')setEntry(null);}}><Icon size={15}/>{label}</NavLink>)}</nav><div className="header-side"><span className="edition">找猫挑战 V4.1</span><button className="icon" aria-label={muted?'开启声音':'关闭声音'} onClick={()=>{setMuted(x=>{localStorage.setItem('miao-muted',String(!x));return !x;});}}>{muted?<VolumeX size={18}/>:<Volume2 size={18}/>}</button></div></header>
 {offline&&<div className="offline-notice" role="status">网络已断开，草稿仍可保存。正式挑战需要联网。</div>}
 <Routes><Route path="/draw" element={<Draw key={round} notify={notify} onPractice={image=>{setEntry({practice:true,image});setRound(x=>x+1);navigate('/square');}} onSubmitted={(artworkId,playerId)=>{setEntry({practice:false,artworkId,playerId});setRound(x=>x+1);navigate('/square');}}/>}/><Route path="/square" element={<Square key={round} entry={entry} onRestart={restart} onBusy={onBusy} notify={notify}/>}/><Route path="*" element={<Navigate to="/draw" replace/>}/></Routes>
 {location.pathname!=='/square'&&<footer className="site-footer"><span>© 摸凹猫 · 献给每一个随手画画的你</span><a href="https://app.notion.com/p/406045159e18809bb54dceb9fe915dc7" target="_blank" rel="noreferrer">关于这个小世界 ↗</a></footer>}{notice&&<div className="toast" role="status">{notice}</div>}
 </div>;
}
class ErrorBoundary extends React.Component<{children:React.ReactNode},{failed:boolean}>{state={failed:false};static getDerivedStateFromError(){return {failed:true};}render(){return this.state.failed?<div className="fatal"><h1>猫咪打了个盹</h1><p>页面遇到问题，已保存的草稿仍在本机。</p><button onClick={()=>location.reload()}>重新加载</button></div>:this.props.children;}}
createRoot(document.getElementById('root')!).render(<ErrorBoundary><BrowserRouter><App/></BrowserRouter></ErrorBoundary>);
