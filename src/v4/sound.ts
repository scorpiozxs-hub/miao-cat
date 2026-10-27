let audio:AudioContext|undefined;
export function sound(success:boolean){
 if(localStorage.getItem('miao-muted')!=='false')return;
 try{const ctx=audio??=new AudioContext();void ctx.resume();const o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.setValueAtTime(success?640:240,ctx.currentTime);o.frequency.exponentialRampToValueAtTime(success?960:190,ctx.currentTime+.15);g.gain.setValueAtTime(.06,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.2);o.connect(g);g.connect(ctx.destination);o.start();o.stop(ctx.currentTime+.21);}catch{/* Silent browsers keep the same game behavior. */}
}
