import {useEffect,useRef} from 'react';
import {X} from 'lucide-react';
export function Dialog({title,onClose,locked=false,children}:{title:string;onClose:()=>void;locked?:boolean;children:React.ReactNode}){
 const ref=useRef<HTMLDialogElement>(null);const callback=useRef(onClose);callback.current=onClose;
 useEffect(()=>{const d=ref.current!;d.showModal();return()=>d.close();},[]);
 return <dialog ref={ref} className="v4-dialog" onCancel={e=>{e.preventDefault();if(!locked)callback.current();}}><header><h2>{title}</h2><button className="icon" aria-label="关闭" disabled={locked} onClick={onClose}><X size={19}/></button></header>{children}</dialog>;
}
