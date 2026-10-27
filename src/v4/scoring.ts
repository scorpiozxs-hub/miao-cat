export function scoreOf(p:number|null){return p!==null&&Number.isFinite(p)&&p>=0&&p<=1?Math.round(p*100):null;}
export function maySubmit(score:number|null){return score!==null&&Number.isInteger(score)&&score>50&&score<=100;}
export function stageOf(score:number|null){return score===null?2:score<=25?0:score<=50?1:score<=75?2:3;}
