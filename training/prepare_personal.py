"""Prepare explicitly annotated personal drawings; never silently train on UI screenshots."""
import argparse,json,hashlib
from pathlib import Path
import numpy as np
from PIL import Image
from prepare64 import normalize

def main():
    ap=argparse.ArgumentParser();ap.add_argument('manifest',type=Path);args=ap.parse_args()
    records=[json.loads(line) for line in args.manifest.read_text(encoding='utf8').splitlines() if line.strip()]
    seen={};by_split={s:[] for s in ['train','validation','test']}
    for r in records:
        if not all(k in r for k in ['file','drawingId','author','label','split','permission']):raise ValueError('Missing provenance fields')
        if r['label']!='cat' or r['permission'] is not True:raise ValueError('Only explicitly authorized cat drawings are accepted')
        split=r['split']
        if split not in by_split:raise ValueError('Invalid split')
        if r['drawingId'] in seen and seen[r['drawingId']]!=split:raise ValueError('Same original drawing cannot cross splits')
        seen[r['drawingId']]=split
        image=Image.open(args.manifest.parent/r['file']).convert('RGBA')
        if 'crop' in r:image=image.crop(tuple(r['crop']))
        a=np.asarray(image)
        if r.get('kind')=='screenshot':
            if 'crop' not in r:raise ValueError('Screenshots require an explicit drawing-only crop')
            alpha=(255-a[:,:,:3].min(2)).astype(np.uint8);alpha[alpha<20]=0
        else:
            if np.all(a[:,:,3]==255):raise ValueError('Opaque images need screenshot mode and explicit crop')
            alpha=a[:,:,3]
        image=Image.fromarray(alpha);image.thumbnail((240,240),Image.Resampling.LANCZOS)
        mask=Image.new('L',(256,256));mask.paste(image,((256-image.width)//2,(256-image.height)//2))
        fingerprint=hashlib.sha256(np.asarray(mask).tobytes()).hexdigest()
        by_split[split].append((r,np.asarray(mask),fingerprint))
    hashes={}
    for split,rows in by_split.items():
        for _,_,h in rows:
            if h in hashes and hashes[h]!=split:raise ValueError('Pixel-identical drawing crosses splits')
            hashes[h]=split
        if rows:
            tensors=normalize([row[1] for row in rows]);out=args.manifest.parent/(split+'-64.npz')
            np.savez_compressed(out,images=np.rint(tensors*255).astype(np.uint8),labels=np.zeros(len(rows),np.int64),ids=np.array([r['drawingId'] for r,_,_ in rows]))
            print(split,len(rows),out)
    print('Prepared only; no model trained and no existing split modified.')
if __name__=='__main__':main()
