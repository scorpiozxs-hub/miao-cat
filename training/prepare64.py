"""Render vector records; normalize using the exact JavaScript browser preprocessor."""
import argparse, hashlib, json, random, subprocess
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
from prepare_data import CLASSES, split_for
from paths import data_root

ROOT=Path(__file__).resolve().parents[1]

def raster(drawing, width=5):
    points=[(x,y) for s in drawing for x,y in zip(s[0],s[1])]
    if not points:return np.zeros((256,256),np.uint8)
    xs,ys=zip(*points);x0,x1,y0,y1=min(xs),max(xs),min(ys),max(ys);span=max(x1-x0,y1-y0,1)
    scale=224/span;ox=(256-(x1-x0)*scale)/2;oy=(256-(y1-y0)*scale)/2
    image=Image.new('L',(256,256));d=ImageDraw.Draw(image)
    for s in drawing:
        line=[(round(ox+(x-x0)*scale),round(oy+(y-y0)*scale)) for x,y in zip(s[0],s[1])]
        if not line:continue
        if len(line)>1:d.line(line,fill=255,width=width,joint='curve')
        radius=width/2
        for x,y in (line[0],line[-1]):d.ellipse((x-radius,y-radius,x+radius,y+radius),fill=255)
    return np.asarray(image)

def normalize(masks):
    result=subprocess.run(['node',str(ROOT/'scripts/preprocess-batch.mjs')],input=np.stack(masks).tobytes(),stdout=subprocess.PIPE,stderr=subprocess.PIPE,check=True)
    return np.frombuffer(result.stdout,dtype='<f4').reshape(-1,64,64).copy()

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--data-dir',type=Path,default=data_root());ap.add_argument('--limit',type=int,default=12000);args=ap.parse_args()
    out=ROOT/'training/artifacts/quickdraw-64';out.mkdir(parents=True,exist_ok=True)
    # Keep the previous 20k/category validation/test IDs as a stable comparison set.
    selection=random.Random(20261028);width_rng=random.Random(6402)
    buckets={s:{'images':[],'labels':[],'ids':[],'widths':[]} for s in ('train','validation','test')};counts={}
    for label,(source,folder) in enumerate(CLASSES):
        selected=[];seen=0
        with (args.data_dir/folder/(source+'.ndjson')).open(encoding='utf8') as f:
            for line in f:
                record=json.loads(line)
                if not record.get('recognized') or not record.get('drawing'):continue
                seen+=1
                if len(selected)<20000:selected.append(record)
                else:
                    i=selection.randrange(seen)
                    if i<20000:selected[i]=record
        samples={s:[] for s in buckets}
        for r in selected:samples[split_for(str(r['key_id']))].append(r)
        # More training cats than before: include additional ID-disjoint cats, not just resized copies.
        if source=='cat':
            used={str(r['key_id']) for r in selected};extra=[]
            with (args.data_dir/folder/(source+'.ndjson')).open(encoding='utf8') as f:
                for line in f:
                    r=json.loads(line);key=str(r['key_id'])
                    if r.get('recognized') and key not in used and split_for(key)=='train':extra.append(r)
            random.Random(6403).shuffle(extra)
            samples['train']+=extra[:8000]
        # CPU-friendly balanced baseline, plus 8k extra cats. All official held-out IDs retained.
        random.Random(6404+label).shuffle(samples['train'])
        cap=args.limit+(8000 if source=='cat' else 0)
        samples['train']=samples['train'][:cap]
        counts[source]={s:len(samples[s]) for s in buckets}
        for split,records in samples.items():
            for start in range(0,len(records),256):
                batch=records[start:start+256]
                widths=[width_rng.choice([2,3,4,5,6,8,10,12]) if split=='train' else 5 for _ in batch]
                normalized=normalize([raster(r['drawing'],w) for r,w in zip(batch,widths)])
                buckets[split]['images'].append(np.rint(normalized*255).astype(np.uint8))
                buckets[split]['labels']+=([label]*len(batch));buckets[split]['ids'] += [str(r['key_id']) for r in batch];buckets[split]['widths']+=widths
        print(source,counts[source],flush=True)
    for split,b in buckets.items():
        images=np.concatenate(b['images']);labels=np.array(b['labels'],dtype=np.int64);ids=np.array(b['ids']);widths=np.array(b['widths'],dtype=np.uint8)
        order=np.random.default_rng(6405).permutation(len(labels));np.savez_compressed(out/(split+'.npz'),images=images[order],labels=labels[order],ids=ids[order],widths=widths[order])
    metadata={'preprocessVersion':'alpha-area-64-v2','size':64,'padding':4,'sharedImplementation':'src/recognition/preprocess.mjs','counts':counts,'strokeWidthsAt256':[2,3,4,5,6,8,10,12],'split':'same hash(key_id) as v1; all variants stay with original','license':'CC BY 4.0; Google Quick, Draw! Dataset','bodyLabels':'QuickDraw does not annotate full body; extra cats are NOT claimed to be full-body examples'}
    (out/'metadata.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2),encoding='utf8')

if __name__=='__main__':main()
