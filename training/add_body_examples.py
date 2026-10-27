"""Add manually reviewed full-body QuickDraw sketches, keeping original hash splits."""
import json
from pathlib import Path
import numpy as np
from prepare64 import ROOT,raster,normalize
from prepare_data import split_for
from paths import data_root

SELECTED=[7,9,11,19,20,22,24,26,30,34,36,39,42,45,47,57,65,68,71,73,74,76]
def main():
    review=ROOT/'training/artifacts/body-review';records=json.loads((review/'quickdraw-candidates.json').read_text());chosen=[records[i-1] for i in SELECTED]
    destination=data_root()/'curated-fullbody';destination.mkdir(parents=True,exist_ok=True)
    manifest=[];masks=[];ids=[];widths=[]
    for i,r in zip(SELECTED,chosen):
        assert split_for(str(r['key_id']))=='train'
        (destination/(str(r['key_id'])+'.json')).write_text(json.dumps(r))
        manifest.append({'id':str(r['key_id']),'reviewIndex':i,'label':'cat','fullBody':True,'split':'train','source':'Google Quick, Draw! Dataset','license':'CC BY 4.0','reviewMethod':'visual review of contact sheet; full body including torso/legs or tail','sourceFile':'cat/cat.ndjson'})
        for width in [2,3,4,5,6,8,10,12]:
            masks.append(raster(r['drawing'],width));ids.append(str(r['key_id']));widths.append(width)
    x=np.rint(normalize(masks)*255).astype(np.uint8)
    path=ROOT/'training/artifacts/quickdraw-64/train.npz'
    with np.load(path) as d:
        base={k:d[k].copy() for k in d.files}
    # Re-running replaces prior curated variants, never duplicating them indefinitely.
    if 'source' not in base:base['source']=np.full(len(base['labels']),'quickdraw',dtype='<U20')
    keep=base['source']!='curated-fullbody'
    base={k:v[keep] for k,v in base.items()}
    additions={'images':x,'labels':np.zeros(len(x),dtype=np.int64),'ids':np.array(ids),'widths':np.array(widths,dtype=np.uint8),'source':np.full(len(x),'curated-fullbody',dtype='<U20')}
    merged={k:np.concatenate([base[k],additions[k]]) for k in base};np.savez_compressed(path,**merged)
    (destination/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf8')
    print(json.dumps({'reviewedFullBodyOriginals':len(chosen),'widthVariants':len(x),'trainSamples':len(merged['labels']),'license':'CC BY 4.0'}),flush=True)
if __name__=='__main__':main()
