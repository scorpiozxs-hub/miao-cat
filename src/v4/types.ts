export type SpriteSpec={spriteId:string;artworkId:string;imageUrl:string;motionSeed:number};
export type Prepared={sessionId:string;playerId:string;roster:SpriteSpec[];rulesVersion:string};
export type GameResult={outcome:'wrong'|'found'|'throttled'|'timeout';elapsedMs?:number;bestElapsedMs?:number;bestChanged?:boolean;artistCode?:string};
export type Entry={rank:number;artistName:string;artistCode:string;elapsedMs:number};
export type ArtDetail={id:string;catName:string;artistName:string;artistCode:string;createdAt:number;imageUrl:string;downloadUrl:string;source:string};
export type ModelManifest={modelVersion:string;preprocessVersion:string;url:string;sha256?:string;externalData?:{path:string;url:string;sha256?:string}[];input:{name?:string;shape:number[];dtype:string;padding:number};output:{name?:string;type:'logits'|'probabilities';classes:string[];catIndex:number}};
export type PlayState='PREPARING'|'READY'|'COUNTDOWN'|'PLAYING'|'RESULT_PENDING'|'FINISHED'|'EXPLORE'|'CANCELLED';
