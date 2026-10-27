import {sampleArtworks} from '../art';
import type {SpriteSpec,ArtDetail} from './types';
export function practiceRoster(targetImage?:string){
 const examples=sampleArtworks.map(a=>({id:a.id,catName:a.catName,artistName:'官方示例插画',artistCode:'示例',createdAt:a.createdAt,imageUrl:a.imageUrl,downloadUrl:a.imageUrl,source:'sample'}));
 const target=targetImage?{...examples[0],id:'practice-target',catName:'你的练习猫',artistName:'本机创作',imageUrl:targetImage,downloadUrl:targetImage}:examples[0];
 const distractors=examples.filter(a=>a.id!==target.id);
 const arts=[target,...Array.from({length:49},(_,i)=>distractors[i%distractors.length])];
 for(let i=49;i>0;i--){const j=Math.floor(Math.random()*(i+1));[arts[i],arts[j]]=[arts[j],arts[i]];}
 const roster:SpriteSpec[]=arts.map((a,i)=>({spriteId:`practice-${i}`,artworkId:a.id,imageUrl:a.imageUrl,motionSeed:Math.floor(Math.random()*2147483647)}));
 return {roster,targetId:target.id,details:new Map<string,ArtDetail>([...examples,target].map(a=>[a.id,a]))};
}
