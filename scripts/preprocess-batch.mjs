import {preprocessAlpha} from '../src/recognition/preprocess.mjs';
// Binary stdin: N consecutive 256x256 alpha masks; stdout: N Float32 64x64 tensors.
const chunks=[];for await(const chunk of process.stdin)chunks.push(chunk);
const input=Buffer.concat(chunks),pixels=256*256;
if(input.length%pixels)throw Error('Incomplete raster batch');
for(let i=0;i<input.length;i+=pixels){const tensor=preprocessAlpha(input.subarray(i,i+pixels),256,256)||new Float32Array(4096);process.stdout.write(Buffer.from(tensor.buffer));}
