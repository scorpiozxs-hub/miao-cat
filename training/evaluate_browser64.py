import json
from pathlib import Path
import numpy as np
import onnxruntime as ort

ROOT=Path(__file__).resolve().parents[1];base=ROOT/'training/artifacts/model64'
cases=json.loads((base/'browser-cases.json').read_text());labels=np.array([x['label'] for x in cases]);widths=np.array([x['brushWidth'] for x in cases]);report={}
for version,size,filename in [('old28',28,'quickdraw-8class.onnx'),('new64',64,'quickdraw-8class-64.onnx')]:
    options=ort.SessionOptions();options.intra_op_num_threads=2
    session=ort.InferenceSession(str(ROOT/'public/models'/filename),sess_options=options,providers=['CPUExecutionProvider'])
    images=np.fromfile(base/f'browser-inputs{size}.bin',dtype=np.float32).reshape(-1,1,size,size);pred=[]
    for image in images:
        z=session.run(None,{session.get_inputs()[0].name:image[None]})[0].ravel();p=np.exp(z-z.max());p/=p.sum();pred.append(p)
    pred=np.stack(pred);report[version]={}
    for width in sorted(set(widths)):
        sel=widths==width;cats=sel&(labels==0);non=sel&(labels!=0)
        report[version][str(width)]={'accuracy':float((pred[sel].argmax(1)==labels[sel]).mean()),'catPassRate':float((pred[cats,0]>=.505).mean()),'nonCatFalsePassRate':float((pred[non,0]>=.505).mean()),'catSamples':int(cats.sum()),'nonCatSamples':int(non.sum())}
report['method']='Same 160 held-out raw drawings painted with actual H5 Canvas smoothing at 800px; brush widths 3/7/20; actual browser old/new preprocessing. No cloud requests. 20 cats per width is a small diagnostic, not population accuracy.'
out=ROOT/'docs/model-previews/browser-width-comparison.json';out.write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
