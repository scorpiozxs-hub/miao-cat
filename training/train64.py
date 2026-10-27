"""64px classifier with training-only stroke, pose and contrast augmentation."""
import argparse,json,time,sys
from pathlib import Path
import numpy as np
import torch
from torch import nn
from torch.nn import functional as F
from torch.utils.data import DataLoader,TensorDataset,ConcatDataset

ROOT=Path(__file__).resolve().parents[1]
if hasattr(sys.stdout,'reconfigure'):sys.stdout.reconfigure(encoding='utf-8')
CLASSES=['cat','dog','rabbit','fish','bear','mouse','face','house']
class Sketch64(nn.Module):
    def __init__(self):
        super().__init__()
        self.features=nn.Sequential(nn.Conv2d(1,16,5,stride=2,padding=2),nn.BatchNorm2d(16),nn.ReLU(),nn.Conv2d(16,32,3,stride=2,padding=1),nn.BatchNorm2d(32),nn.ReLU(),nn.Conv2d(32,64,3,stride=2,padding=1),nn.BatchNorm2d(64),nn.ReLU(),nn.Conv2d(64,64,3,padding=1),nn.ReLU(),nn.AdaptiveAvgPool2d((3,3)))
        self.head=nn.Sequential(nn.Flatten(),nn.Linear(576,96),nn.ReLU(),nn.Dropout(.2),nn.Linear(96,8))
    def forward(self,x):return self.head(self.features(x))

def load(path):
    with np.load(path) as d:return TensorDataset(torch.from_numpy(d['images'].copy()),torch.from_numpy(d['labels'].copy()).long())

def augment(x):
    # Mixed stroke widths, per image, only on train; do not distort held-out data.
    r=torch.rand(len(x),1,1,1,device=x.device)
    thick=F.max_pool2d(x,3,1,1)
    # Mild erosion preserves a fraction of thin strokes, rather than deleting them.
    thin=.5*x+.5*(-F.max_pool2d(-x,3,1,1))
    x=torch.where(r<.18,thick,torch.where(r<.36,thin,x))
    flip=torch.rand(len(x),1,1,1,device=x.device)<.5;x=torch.where(flip,x.flip(-1),x)
    theta=torch.zeros(len(x),2,3,device=x.device);angle=(torch.rand(len(x),device=x.device)-.5)*.32;scale=.9+torch.rand(len(x),device=x.device)*.2
    theta[:,0,0]=angle.cos()*scale;theta[:,0,1]=-angle.sin()*scale;theta[:,1,0]=angle.sin()*scale;theta[:,1,1]=angle.cos()*scale;theta[:,:,2]=(torch.rand(len(x),2,device=x.device)-.5)*.1
    x=F.grid_sample(x,F.affine_grid(theta,x.shape,align_corners=False),align_corners=False)
    return x*(.75+torch.rand(len(x),1,1,1,device=x.device)*.25)

def evaluate(model,loader):
    confusion=np.zeros((8,8),dtype=np.int64);passed=np.zeros(8,dtype=np.int64);total=np.zeros(8,dtype=np.int64);loss=0
    model.eval()
    with torch.inference_mode():
        for images,labels in loader:
            x=images.float().unsqueeze(1)/255;z=model(x);p=z.softmax(1);pred=z.argmax(1);loss+=float(F.cross_entropy(z,labels,reduction='sum'))
            np.add.at(confusion,(labels.numpy(),pred.numpy()),1)
            for c in range(8):total[c]+=int((labels==c).sum());passed[c]+=int(((labels==c)&(p[:,0]>=.505)).sum())
    return {'accuracy':float(np.trace(confusion)/confusion.sum()),'perClassAccuracy':(np.diag(confusion)/np.maximum(confusion.sum(1),1)).tolist(),'confusionMatrix':confusion.tolist(),'catPassRateAt51':float(passed[0]/max(total[0],1)),'nonCatFalsePassRate':float(passed[1:].sum()/max(total[1:].sum(),1)),'loss':loss/int(confusion.sum()),'samples':int(confusion.sum())}

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--epochs',type=int,default=12);ap.add_argument('--threads',type=int,default=8);ap.add_argument('--personal-dir',type=Path);args=ap.parse_args()
    torch.manual_seed(6406);np.random.seed(6406);torch.set_num_threads(args.threads)
    directory=ROOT/'training/artifacts/quickdraw-64';out=ROOT/'training/artifacts/model64';out.mkdir(exist_ok=True)
    train_data=load(directory/'train.npz')
    if args.personal_dir:
        personal=args.personal_dir/'train-64.npz'
        if not personal.is_file():raise ValueError('Prepare an explicitly split personal train-64.npz first')
        train_data=ConcatDataset([train_data,load(personal)])
    train=DataLoader(train_data,batch_size=256,shuffle=True);val=DataLoader(load(directory/'validation.npz'),batch_size=512);test=DataLoader(load(directory/'test.npz'),batch_size=512)
    model=Sketch64();optimizer=torch.optim.AdamW(model.parameters(),lr=.0015,weight_decay=.0001);scheduler=torch.optim.lr_scheduler.CosineAnnealingLR(optimizer,args.epochs)
    best=float('inf');stale=0;history=[]
    for epoch in range(args.epochs):
        started=time.time();model.train();losses=0
        for images,labels in train:
            x=augment(images.float().unsqueeze(1)/255);optimizer.zero_grad(set_to_none=True);loss=F.cross_entropy(model(x),labels);loss.backward();optimizer.step();losses+=float(loss.detach())
        metrics=evaluate(model,val);scheduler.step();row={'epoch':epoch+1,'trainLoss':losses/len(train),'validation':metrics,'seconds':round(time.time()-started,1)};history.append(row);print(json.dumps(row),flush=True)
        if metrics['loss']<best:
            best=metrics['loss'];stale=0;torch.save({'model':model.state_dict(),'epoch':epoch+1},out/'best.pt')
        else:
            stale+=1
            if stale>=4:break
        (out/'history.json').write_text(json.dumps(history,indent=2))
    model.load_state_dict(torch.load(out/'best.pt',weights_only=True)['model']);model.eval()
    metrics={'modelVersion':'quickdraw-8class-64-v2','preprocessVersion':'alpha-area-64-v2','classes':CLASSES,'validation':evaluate(model,val),'test':evaluate(model,test),'input':{'shape':[1,1,64,64],'dtype':'float32'},'trainingHistory':history,'augmentation':'random raw widths 2-12px/256, mild erosion/dilation, flips, rotations +/-9 degrees, scale, translations, contrast; training only','limitations':'QuickDraw held-out drawings, not artist-disjoint or independent real user evaluation'}
    if args.personal_dir:
        metrics['personalEvaluation']={}
        for split in ['validation','test']:
            p=args.personal_dir/(split+'-64.npz')
            if p.is_file():metrics['personalEvaluation'][split]=evaluate(model,DataLoader(load(p),batch_size=128))
    (out/'quickdraw-8class-64.metrics.json').write_text(json.dumps(metrics,indent=2))
    torch.onnx.export(model,(torch.zeros(1,1,64,64),),str(out/'quickdraw-8class-64.onnx'),input_names=['image'],output_names=['logits'],opset_version=18,dynamo=True,verify=True)
    print('COMPLETE '+json.dumps(metrics['test']),flush=True)

if __name__=='__main__':main()
