"""Preserve and annotate the 2 user drawings + 26 supplied Internet reference screenshots."""
import hashlib,json,shutil,os
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw,ImageFilter
from prepare64 import ROOT,normalize
from paths import data_root

BASE=data_root()/'user-cats-20261028'
PERSONAL=[BASE/'originals/personal-01.png',BASE/'originals/personal-02.png']
# Remove disconnected captions, site navigation and neighboring drawings; retain cat accessories.
CROPS={3:(0,45,449,454),4:(0,95,490,425),5:(0,0,340,471),6:(0,0,355,467),7:(0,105,427,448),12:(0,0,223,247),13:(0,0,239,295),14:(7,0,235,273),15:(25,0,209,208),16:(15,26,296,179),17:(0,0,328,270),18:(0,0,149,181),19:(0,0,161,157),20:(0,23,159,161),21:(0,0,165,158),22:(0,0,287,257),23:(0,0,278,242),24:(0,0,615,337),25:(0,0,496,479),26:(0,0,525,734)}
# Local exclusion masks remove text or another illustration inside an otherwise useful crop.
ERASE={5:[(280,0,426,135)],6:[(320,0,435,120)],12:[(199,0,223,68)],13:[(220,0,271,160)],16:[(0,0,65,40),(0,120,20,223)],26:[(405,580,525,734)]}
CROPS.update({3:(0,0,449,454),4:(0,0,490,487),5:(0,0,426,471),6:(0,0,435,467),7:(0,0,427,448),15:(0,0,209,208),17:(0,0,328,294)})
ERASE.update({3:[(330,0,449,155)],4:[(0,0,325,145),(0,390,490,487)],5:[(295,0,426,180)],7:[(0,0,280,140)],15:[(0,145,27,208)]})

def main():
    (BASE/'originals').mkdir(parents=True,exist_ok=True);(BASE/'cleaned').mkdir(exist_ok=True)
    internet=sorted(Path(os.environ['MIAO_INTERNET_CATS_DIR']).glob('*.png')) if os.environ.get('MIAO_INTERNET_CATS_DIR') else sorted((BASE/'originals').glob('internet-*.png'))
    records=[];masks=[];fingerprints=set()
    for i,source in enumerate(PERSONAL+internet):
        personal=i<2;index=i+1 if personal else i-1;key=('personal-' if personal else 'internet-')+f'{index:02d}'
        original=BASE/'originals'/(key+'.png')
        if source.exists() and source.resolve()!=original.resolve():shutil.copy2(source,original)
        elif original.exists():source=original
        else:raise FileNotFoundError('Missing preserved original '+key)
        image=Image.open(original).convert('RGB');a=np.asarray(image).astype(np.float32)
        # Paper texture/color is not transparent ink. Dark line recovery excludes the photographed paper.
        if personal:
            alpha=np.clip((245-a.min(2))/160*255,0,255).astype(np.uint8)
        else:
            luma=.299*a[:,:,0]+.587*a[:,:,1]+.114*a[:,:,2]
            threshold=125 if index in [11,12,13,14,25,26] else 180
            alpha=np.clip((threshold-luma)/(85 if threshold==125 else 100)*255,0,255).astype(np.uint8)
            # Remove faint paper grain while retaining dark outlines and facial details.
            alpha[alpha<35]=0
        mask=Image.fromarray(alpha)
        for box in ([] if personal else ERASE.get(index,[])):ImageDraw.Draw(mask).rectangle(box,fill=0)
        crop=(0,0,image.width,image.height) if personal else CROPS.get(index,(0,0,image.width,image.height));mask=mask.crop(crop)
        array=np.asarray(mask);yy,xx=np.where(array>10)
        if not len(xx):raise ValueError('No visible cat '+key)
        bounds=(int(xx.min()),int(yy.min()),int(xx.max()+1),int(yy.max()+1));mask=mask.crop(bounds)
        mask.save(BASE/'cleaned'/(key+'-alpha.png'))
        mask.thumbnail((240,240),Image.Resampling.LANCZOS);transport=Image.new('L',(256,256));transport.paste(mask,((256-mask.width)//2,(256-mask.height)//2))
        digest=hashlib.sha256(np.asarray(transport).tobytes()).hexdigest()
        if digest in fingerprints:continue
        fingerprints.add(digest);masks.append(np.asarray(transport))
        records.append({'id':key,'source':str(source),'originalFile':str(original),'cleanAlphaFile':str(BASE/'cleaned'/(key+'-alpha.png')),'sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'alphaHash':digest,'category':'cat','split':'train','kind':'personal-drawing' if personal else 'user-provided-internet-reference','author':'user' if personal else 'unknown-original-artist','processingAuthorization':'User explicitly requested local model training in this conversation','license':'user-owned drawing' if personal else 'not supplied; original Internet source/redistribution license unverified','crop':crop,'inkBoundsAfterCrop':bounds,'notes':'Training examples, not independent acceptance test samples. Original source preserved. No permission to redistribute third-party images is inferred.'})
    normalized=normalize(masks);out=ROOT/'training/artifacts/model64/user-cats-64.npz'
    np.savez_compressed(out,images=np.rint(normalized*255).astype(np.uint8),labels=np.zeros(len(records),np.int64),ids=np.array([r['id'] for r in records]))
    (BASE/'manifest.json').write_text(json.dumps(records,ensure_ascii=False,indent=2),encoding='utf8')
    grid=Image.new('RGB',(7*132,4*154+30),'#f7f6ef');draw=ImageDraw.Draw(grid);draw.text((10,8),'28 supplied cats: cleaned and cropped 64px model inputs (training examples)',fill='#374136')
    for i,(record,tensor) in enumerate(zip(records,normalized)):
        x=i%7*132+2;y=i//7*154+30;img=Image.fromarray(np.rint(tensor*255).astype(np.uint8)).resize((128,128),Image.Resampling.NEAREST);grid.paste(img,(x,y));draw.text((x,y+133),record['id'],fill='#374136')
    grid.save(ROOT/'docs/model-previews/user-cats-cleaned.png')
    print(json.dumps({'originals':len(records),'personal':sum(r['kind']=='personal-drawing' for r in records),'internet':sum(r['kind']!='personal-drawing' for r in records),'dataset':str(out)}),flush=True)
if __name__=='__main__':main()
