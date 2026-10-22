import React,{useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter,NavLink,Navigate,Route,Routes,useNavigate,useLocation} from 'react-router-dom';
import {Cat,PenLine,Grid2X2,Volume2,VolumeX,ArrowUpRight} from 'lucide-react';
import {Draw} from './Draw';
import {Square} from './Square';
import {getProfile,saveProfile} from './storage';
import type {Profile} from './types';
import './styles.css';
function App(){
 const [profile,setProfile]=useState(getProfile),[notice,setNotice]=useState(''),[offline,setOffline]=useState(!navigator.onLine);const timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);const navigate=useNavigate();
 const route=useLocation();useEffect(()=>{window.scrollTo(0,0);},[route.pathname]);
 const onProfile=(p:Profile)=>{setProfile(p);saveProfile(p);};
 useEffect(()=>{saveProfile(profile);},[]);
 useEffect(()=>{const update=()=>setOffline(!navigator.onLine);addEventListener('online',update);addEventListener('offline',update);return()=>{removeEventListener('online',update);removeEventListener('offline',update);clearTimeout(timer.current);};},[]);
 const toast=(s:string)=>{setNotice(s);clearTimeout(timer.current);timer.current=setTimeout(()=>setNotice(''),4200);};
 const audio=useRef<AudioContext|null>(null);
 const meow=()=>{if(profile.muted)return;try{const context=audio.current??=new AudioContext();void context.resume();const o=context.createOscillator(),g=context.createGain();o.type='sine';o.frequency.setValueAtTime(720,context.currentTime);o.frequency.exponentialRampToValueAtTime(420,context.currentTime+.24);g.gain.setValueAtTime(.001,context.currentTime);g.gain.exponentialRampToValueAtTime(.12,context.currentTime+.04);g.gain.exponentialRampToValueAtTime(.001,context.currentTime+.3);o.connect(g);g.connect(context.destination);o.start();o.stop(context.currentTime+.31);}catch{/* Browser audio unavailable */}};
 return <><header className="site-header"><NavLink className="brand" to="/draw" aria-label="摸凹猫首页"><span className="brand-icon"><Cat size={27} strokeWidth={1.7}/></span><span>摸凹猫<small>MIAO / A CAT IS BORN</small></span></NavLink><nav><NavLink to="/draw"><PenLine size={16}/>画一只猫</NavLink><NavLink to="/square"><Grid2X2 size={16}/>猫咪广场</NavLink></nav><div className="header-right"><span className="local-pill">本地体验版</span><button className="icon-button" aria-label={profile.muted?'开启声音':'关闭声音'} title={profile.muted?'开启声音':'关闭声音'} onClick={()=>onProfile({...profile,muted:!profile.muted})}>{profile.muted?<VolumeX size={18}/>:<Volume2 size={18}/>}</button></div></header>
 {offline&&<div className="offline-banner" role="status">网络离线中，仍可继续绘画和保存本地作品。</div>}
 <Routes><Route path="/draw" element={<Draw profile={profile} onProfile={onProfile} onPublished={art=>{navigate(`/square?artwork=${art.id}&new=${art.id}`);toast('你的猫已加入本地广场！');}} toast={toast} meow={meow}/>}/><Route path="/square" element={<Square profile={profile} onDraw={()=>navigate('/draw')} toast={toast}/>}/><Route path="*" element={<Navigate to={profile.hasPublished?'/square':'/draw'} replace/>}/></Routes>
 <footer className="site-footer"><span>© 摸凹猫 <i>·</i> 献给每一个随手画画的你</span><a href="https://app.notion.com/p/400045159e1880bf9093de53fe0eb675" target="_blank" rel="noreferrer">关于这个小世界<ArrowUpRight size={13}/></a></footer>{notice&&<div role="status" className="toast">{notice}</div>}</>;
}
class ErrorBoundary extends React.Component<{children:React.ReactNode},{failed:boolean}>{state={failed:false};static getDerivedStateFromError(){return {failed:true};}render(){return this.state.failed?<div className="fatal"><h1>猫咪打了个盹</h1><p>页面遇到了一点问题，已保存的作品仍在本机。</p><button className="primary" onClick={()=>location.reload()}>刷新重试</button></div>:this.props.children;}}
createRoot(document.getElementById('root')!).render(<ErrorBoundary><BrowserRouter><App/></BrowserRouter></ErrorBoundary>);
