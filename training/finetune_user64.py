"""Mix supplied cat styles with balanced replay, retaining an independent negative evaluation."""
import json,time,sys
from pathlib import Path
import numpy as np
import torch
from torch import nn
from torch.nn import functional as F
from torch.utils.data import TensorDataset,DataLoader
from train64 import ROOT,Sketch64,load,augment,evaluate

def main():
    torch.manual_seed(6410);np.random.seed(6410);torch.set_num_threads(6)
    base=ROOT/'training/artifacts/model64';data=ROOT/'training/artifacts/quickdraw-64'
    replay=load(data/'train.npz');personal=load(base/'user-cats-64.npz');labels=replay.tensors[1].numpy()
    rng=np.random.default_rng(6410);ix=np.concatenate([rng.choice(np.where(labels==c)[0],2000,replace=False) for c in range(8)])
    x=torch.cat([replay.tensors[0][ix],personal.tensors[0].repeat(80,1,1)]);y=torch.cat([replay.tensors[1][ix],personal.tensors[1].repeat(80)])
    train=DataLoader(TensorDataset(x,y),batch_size=256,shuffle=True);val=DataLoader(load(data/'validation.npz'),batch_size=512);test=DataLoader(load(data/'test.npz'),batch_size=512)
    model=Sketch64();checkpoint=torch.load(base/'best.pt',weights_only=True);model.load_state_dict(checkpoint['model']);baseline=evaluate(model,val)
    optimizer=torch.optim.AdamW(model.parameters(),lr=.00025,weight_decay=.0001);scheduler=torch.optim.lr_scheduler.CosineAnnealingLR(optimizer,6,eta_min=.00003)
    history=[];best=float('inf');selected=None
    for epoch in range(6):
        started=time.time();model.train()
        for images,labels in train:
            optimizer.zero_grad(set_to_none=True);z=model(augment(images.float().unsqueeze(1)/255));loss=F.cross_entropy(z,labels);loss.backward();optimizer.step()
        scheduler.step();validation=evaluate(model,val)
        model.eval()
        with torch.inference_mode():p=model(personal.tensors[0].float().unsqueeze(1)/255).softmax(1)[:,0].numpy()
        scores=np.floor(p*100+.5).astype(int);fit={'personalScores':scores[:2].tolist(),'all28TrainingPassRate':float((scores>50).mean()),'trainingScores':scores.tolist()}
        row={'epoch':epoch+1,'validation':validation,'trainingFitOnly':fit,'seconds':round(time.time()-started,1)};history.append(row);print(json.dumps(row),flush=True)
        # Small changes in independent validation are allowed, but no cat-only collapse or unchecked false positives.
        eligible=validation['accuracy']>=baseline['accuracy']-.01 and validation['nonCatFalsePassRate']<=baseline['nonCatFalsePassRate']+.008 and min(scores[:2])>50
        if eligible and validation['loss']<best:
            best=validation['loss'];selected=epoch+1;torch.save({'model':model.state_dict(),'epoch':epoch+1,'baseEpoch':checkpoint['epoch']},base/'user-best.pt')
        (base/'user-finetune-history.json').write_text(json.dumps(history,indent=2))
    if selected is None:raise RuntimeError('No fine-tune passed independent validation and the two supplied examples; base checkpoint retained')
    model.load_state_dict(torch.load(base/'user-best.pt',weights_only=True)['model']);model.eval()
    original=json.loads((base/'quickdraw-8class-64.metrics.json').read_text());(base/'base-quickdraw-8class-64.metrics.json').write_text(json.dumps(original,indent=2))
    original.update({'validation':evaluate(model,val),'test':evaluate(model,test),'userFineTune':{'selectedEpoch':selected,'independentBaselineValidation':baseline,'history':history,'sources':{'personalDrawings':2,'userProvidedInternetImages':26,'thirdPartySourceLicenses':'not supplied; private local training requested by user; originals/provenance retained'},'warning':'All 28 supplied examples are training data. Their fitted scores are NOT held-out accuracy.'}})
    (base/'quickdraw-8class-64.metrics.json').write_text(json.dumps(original,indent=2))
    torch.onnx.export(model,(torch.zeros(1,1,64,64),),str(base/'quickdraw-8class-64.onnx'),input_names=['image'],output_names=['logits'],opset_version=18,dynamo=True,verify=True)
    print('COMPLETE '+json.dumps({'selectedEpoch':selected,'test':original['test']}),flush=True)
if __name__=='__main__':main()
