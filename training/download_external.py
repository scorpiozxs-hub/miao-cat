"""Download research candidates without silently treating cat labels as full-body annotations."""
import hashlib,json,urllib.request,zipfile
from pathlib import Path
from paths import data_root
BASE=data_root()/'external/tu-berlin'
URL='https://cislab.hkust-gz.edu.cn/projects/sketchkit/datasets/TUBerlin/sketches_svg.zip'
def main():
    BASE.mkdir(parents=True,exist_ok=True);archive=BASE/'sketches_svg.zip'
    if not archive.exists():
        req=urllib.request.Request(URL,headers={'User-Agent':'MiaoCatDatasetResearch/1.0'})
        with urllib.request.urlopen(req,timeout=45) as response,archive.with_suffix('.download').open('wb') as out:
            count=0
            while chunk:=response.read(1024*1024):
                out.write(chunk);count+=len(chunk)
                if count%(10*1024*1024)==0:print('Downloaded MB',count//1024//1024,flush=True)
        archive.with_suffix('.download').rename(archive)
    with zipfile.ZipFile(archive) as z:
        names=z.namelist();selected=[n for n in names if '/cat/' in '/'+n.replace('\\','/') and n.lower().endswith('.svg')]
        licenses=[n for n in names if any(k in Path(n).name.lower() for k in ['license','readme','copying'])]
        for n in selected+licenses:
            # Only flattened selected files, never extract untrusted archive paths.
            target=BASE/('cat' if n in selected else 'source-notices')/Path(n).name
            target.parent.mkdir(exist_ok=True);target.write_bytes(z.read(n))
    manifest={'source':URL,'originalProject':'http://cybertron.cg.tu-berlin.de/eitz/projects/classifysketch/','mirrorDocumentation':'https://github.com/CISLab-HKUST/SketchKit/blob/main/docs/source/manual/datasets/TUBerlin.md','sha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'catFiles':len(selected),'licenseFiles':licenses,'trainingApproved':False,'note':'Research quarantine: verify original dataset license, inspect full-body content, group split before training. Category cat does not imply full body.'}
    (BASE/'provenance.json').write_text(json.dumps(manifest,indent=2),encoding='utf8');print(json.dumps(manifest),flush=True)
if __name__=='__main__':main()
