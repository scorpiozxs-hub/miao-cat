import json
from pathlib import Path
import numpy as np
from prepare64 import ROOT,CLASSES
from paths import data_root

with np.load(ROOT/'training/artifacts/quickdraw-64/test.npz') as d:
    selected={str(key):int(label) for c in range(8) for key,label in zip(d['ids'][d['labels']==c][:20],d['labels'][d['labels']==c][:20])}
records=[]
for label,(source,folder) in enumerate(CLASSES):
    with (data_root()/folder/(source+'.ndjson')).open(encoding='utf8') as f:
        for line in f:
            r=json.loads(line)
            if str(r['key_id']) in selected:records.append({'id':str(r['key_id']),'label':label,'drawing':r['drawing']})
out=ROOT/'training/artifacts/model64';out.mkdir(exist_ok=True)
(out/'browser-fixtures.json').write_text(json.dumps(records),encoding='utf8')
print(len(records),'held-out drawings selected')
