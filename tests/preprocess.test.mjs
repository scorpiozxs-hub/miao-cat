import test from 'node:test';
import assert from 'node:assert/strict';
import {preprocessAlpha,INPUT_SIZE,PREPROCESS_VERSION} from '../src/recognition/preprocess.mjs';
test('64px contract and blank input never become a model prediction',()=>{
  assert.equal(INPUT_SIZE,64);assert.equal(PREPROCESS_VERSION,'alpha-area-64-v2');
  assert.equal(preprocessAlpha(new Uint8Array(6400),80,80),null);
  assert.throws(()=>preprocessAlpha(new Uint8Array(10),80,80));
});
test('area sampling retains fine off-grid strokes and only uses alpha, with bounded values',()=>{
  const a=new Uint8Array(800*800);
  for(let y=100;y<700;y++)a[y*800+301]=255;
  const out=preprocessAlpha(a,800,800);assert.equal(out.length,4096);
  assert(out.every(x=>Number.isFinite(x)&&x>=0&&x<=1));
  assert(out.filter(x=>x>0).length>=50);
});
test('normalization is translation invariant away from image borders',()=>{
  const make=(dx,dy)=>{const a=new Uint8Array(128*128);for(let y=15;y<65;y++)for(let x=20;x<55;x++)if(x<23||y<18)a[(y+dy)*128+x+dx]=255;return preprocessAlpha(a,128,128);};
  assert.deepEqual(make(0,0),make(37,41));
});
test('stroke widths remain recognizable input without merging the whole background',()=>{
  for(const width of [1,2,4,8,12]){const a=new Uint8Array(256*256);for(let y=40;y<215;y++)for(let x=80;x<80+width;x++)a[y*256+x]=255;for(let x=80;x<180;x++)for(let y=40;y<40+width;y++)a[y*256+x]=255;
    const out=preprocessAlpha(a,256,256);assert(out.some(v=>v>0));assert(out.filter(v=>v===0).length>3000);
  }
});
test('a drawing occupying a small part of the board is cropped and enlarged like a larger drawing',()=>{
  const make=(scale,offsetX,offsetY)=>{const a=new Uint8Array(800*800);
    for(let y=0;y<60*scale;y++)for(let x=0;x<80*scale;x++)if(x<5*scale||y<5*scale||y>=55*scale)a[(y+offsetY)*800+x+offsetX]=255;
    return preprocessAlpha(a,800,800);
  };
  const small=make(1,413,307),large=make(4,101,97);
  let intersection=0,union=0;for(let i=0;i<small.length;i++){if(small[i]>.1&&large[i]>.1)intersection++;if(small[i]>.1||large[i]>.1)union++;}
  assert(intersection/union>.9,'normalised shapes should overlap after removing the unused board');
  for(const v of [small,large]){const occupied=[...v].map((x,i)=>x>0?i%64:-1).filter(x=>x>=0);assert(Math.max(...occupied)-Math.min(...occupied)>=54);}
});
