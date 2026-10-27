"""Approximate diagnostic only: a screenshot cannot recover the original canvas alpha."""
import argparse,json
from pathlib import Path
import numpy as np
import onnxruntime as ort
from PIL import Image
from prepare64 import ROOT,normalize

ap=argparse.ArgumentParser();ap.add_argument('image',type=Path);ap.add_argument('--crop',type=int,nargs=4,required=True);args=ap.parse_args()
image=Image.open(args.image).convert('RGB').crop(args.crop);a=np.asarray(image).astype(float)
mask=((a.min(2)<180)&((a.max(2)-a.min(2)>15)|(a.mean(2)<150)))
y,x=np.where(mask);image=Image.fromarray((mask*255).astype(np.uint8)).crop((int(x.min()),int(y.min()),int(x.max()+1),int(y.max()+1)));image.thumbnail((240,240),Image.Resampling.LANCZOS)
canvas=Image.new('L',(256,256));canvas.paste(image,((256-image.width)//2,(256-image.height)//2));input64=normalize([np.asarray(canvas)])[0]
options=ort.SessionOptions();options.intra_op_num_threads=2;session=ort.InferenceSession(str(ROOT/'public/models/quickdraw-8class-64.onnx'),sess_options=options,providers=['CPUExecutionProvider'])
z=session.run(None,{session.get_inputs()[0].name:input64[None,None]})[0].ravel();p=np.exp(z-z.max());p/=p.sum()
report={'catScore':int(np.floor(float(p[0])*100+.5)),'probabilities':dict(zip(['cat','dog','rabbit','fish','bear','mouse','face','house'],map(float,p))),'note':'Approximate binary mask from screenshot, not original canvas. Check drawing provenance: if the same drawing was supplied for training, this is training fit, not an unseen test.'}
(ROOT/'docs/model-previews/screenshot-diagnostic64.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
