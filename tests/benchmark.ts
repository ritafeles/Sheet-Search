import {mkdir,writeFile} from 'node:fs/promises';
import {load} from '../electron/loader';
import {search} from '../src/engine';
const target='test-output';await mkdir(target,{recursive:true});
const text=[Array.from({length:20},(_,i)=>`列${i+1}`).join(','),...Array.from({length:100000},(_,i)=>Array.from({length:20},(_,j)=>j===0?String(i):j===1?(i%100===0?'東京':'大阪'):`値${i}-${j}`).join(','))].join('\r\n');
await writeFile(`${target}/100k.csv`,text);const start=performance.now();const d=await load(`${target}/100k.csv`,{encoding:'auto',delimiter:''});const loadMs=performance.now()-start;
const r=await search(d,{text:'東京',exact:false,caseSensitive:false,mode:'and',sheet:'',column:'',filters:[]});
const report={rows:100000,columns:20,loadMs:Math.round(loadMs),searchMs:Math.round(r.elapsed),matches:r.hits.length,rssMB:Math.round(process.memoryUsage().rss/1024/1024)};await writeFile(`${target}/benchmark.json`,JSON.stringify(report,null,2));console.log(report);if(r.hits.length!==1000)throw Error('wrong results');
