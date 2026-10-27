"""Verify release SHA256 sums and restore allowlisted training folders without overwriting."""
import argparse,hashlib,json,zipfile
from pathlib import Path,PurePosixPath
ROOT=Path(__file__).resolve().parents[1]

def main():
    p=argparse.ArgumentParser();p.add_argument('archive_directory',type=Path);args=p.parse_args()
    checks={line.split('  ',1)[1]:line.split('  ',1)[0] for line in (args.archive_directory/'SHA256SUMS.txt').read_text().splitlines() if line.strip()}
    assets=json.loads((args.archive_directory/'ASSETS.json').read_text())['assets']
    for name in ['miao-cat-training-state.zip','miao-cat-drawing-data.zip']:
        archive=args.archive_directory/name
        if not archive.exists():
            asset=next(a for a in assets if a['name']==name)
            temporary=archive.with_suffix('.rebuilding')
            if temporary.exists():raise ValueError('Remove or inspect the incomplete rebuilding file before retrying: '+str(temporary))
            with temporary.open('xb') as out:
                for part in asset['parts']:
                    if Path(part['name']).name!=part['name']:raise ValueError('Invalid part name')
                    data=(args.archive_directory/part['name']).read_bytes()
                    if len(data)!=part['bytes'] or hashlib.sha256(data).hexdigest()!=part['sha256']:raise ValueError('Part checksum mismatch: '+part['name'])
                    out.write(data)
            if hashlib.sha256(temporary.read_bytes()).hexdigest()!=checks[name]:raise ValueError('Reassembled checksum mismatch: '+name)
            temporary.rename(archive)
        if hashlib.sha256(archive.read_bytes()).hexdigest()!=checks[name]:raise ValueError('Checksum mismatch: '+name)
        with zipfile.ZipFile(archive) as z:
            manifest=json.loads(z.read('MIGRATION-FILES.json'));expected={entry['path']:entry for entry in manifest}
            for item in z.infolist():
                if item.filename=='MIGRATION-FILES.json':continue
                rel=PurePosixPath(item.filename)
                if rel.is_absolute() or '..' in rel.parts or rel.parts[:2] not in [('training','data'),('training','artifacts')]:raise ValueError('Unexpected archive path')
                target=(ROOT/Path(*rel.parts)).resolve()
                if not target.is_relative_to(ROOT.resolve()):raise ValueError('Path escapes workspace')
                data=z.read(item);entry=expected[item.filename]
                if len(data)!=entry['bytes'] or hashlib.sha256(data).hexdigest()!=entry['sha256']:raise ValueError('Invalid file: '+item.filename)
                if target.exists():
                    if hashlib.sha256(target.read_bytes()).hexdigest()!=entry['sha256']:raise ValueError('Refusing to overwrite changed file: '+str(target))
                else:target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data)
        print('Verified and restored',name)
if __name__=='__main__':main()
