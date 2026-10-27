"""Create portable release assets from an explicit allowlist; never package credentials."""
import hashlib,json,sys,zipfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'training'))
from paths import data_root

def package(destination,source,prefix,predicate):
    manifest=[]
    with zipfile.ZipFile(destination,'w',zipfile.ZIP_DEFLATED,compresslevel=3) as z:
        for f in sorted(source.rglob('*')):
            if not f.is_file() or not predicate(f):continue
            name=(Path(prefix)/f.relative_to(source)).as_posix()
            if any(x in name.split('/') for x in ['node_modules','.git','.cloud-deploy','__pycache__']):raise ValueError('Forbidden archive path')
            z.write(f,name);manifest.append({'path':name,'bytes':f.stat().st_size,'sha256':hashlib.sha256(f.read_bytes()).hexdigest()})
        z.writestr('MIGRATION-FILES.json',json.dumps(manifest,ensure_ascii=False,indent=2))
    print(destination.name,len(manifest),'files',destination.stat().st_size,'bytes',flush=True)
    return {'name':destination.name,'bytes':destination.stat().st_size,'sha256':hashlib.sha256(destination.read_bytes()).hexdigest(),'files':len(manifest)}

def main():
    out=ROOT/'migration-assets';out.mkdir(exist_ok=True)
    assets=[]
    assets.append(package(out/'miao-cat-training-state.zip',ROOT/'training/artifacts','training/artifacts',lambda f:f.suffix not in ['.pyc','.log']))
    assets.append(package(out/'miao-cat-drawing-data.zip',data_root(),'training/data',lambda f:f.suffix.lower() in ['.ndjson','.json','.jsonl','.png','.svg','.md','.mjs'] and '.download' not in f.name))
    (out/'SHA256SUMS.txt').write_text(''.join(a['sha256']+'  '+a['name']+'\n' for a in assets),encoding='utf8')
    (out/'ASSETS.json').write_text(json.dumps({'repository':'scorpiozxs-hub/miao-cat','assets':assets},indent=2))
if __name__=='__main__':main()
