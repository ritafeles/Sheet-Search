/// <reference lib="webworker" />
import {loadBrowser} from './browser-loader';
import {meta,search,display,columns,encodeTable} from './engine';
import type {Dataset,Query,Result} from './types';
let data:Dataset,result:Result,query:Query,revision=0;
self.onmessage=async({data:message})=>{const {id,type,args}=message;try{let value:unknown;
 if(type==='load'){data=await loadBrowser(args.file,args.options);value=meta(data);}
 else if(type==='cancel'){revision++;value=null;}
 else if(type==='search'){const rev=++revision;const next=await search(data,args,()=>revision!==rev);if(rev!==revision)throw Error('キャンセルしました');result=next;query=args;value={count:result.hits.length,columns:result.columns,excluded:result.excluded,elapsed:result.elapsed};}
 else if(type==='header'){const s=data.sheets.find(s=>s.name===args.sheet);if(!s||!Number.isInteger(args.row)||args.row<0||args.row>Math.max(1,s.rows.length))throw Error('見出し行の番号を確認してください');s.headerRow=args.row;value=meta(data);}
 else if(type==='page')value=result.hits.slice(args.start,args.start+Math.min(args.count,200)).map(h=>display(data,h,result.columns,query));
 else if(type==='context'){const hit=result.hits[args.index];if(!hit)throw Error('行を選択してください');const s=data.sheets[hit.sheet],cc=columns(s);value={columns:cc,rows:Array.from({length:Math.min(s.rows.length,hit.row+4)-Math.max(s.headerRow,hit.row-3)},(_,i)=>display(data,{sheet:hit.sheet,row:Math.max(s.headerRow,hit.row-3)+i},cc,query))};}
 else if(type==='copy'){if(args.indices.length>10000)throw Error('コピーは10,000行までです。CSV保存をご利用ください。');value=encodeTable([['シート名','元行番号',...result.columns],...args.indices.map((i:number)=>{const r=display(data,result.hits[i],result.columns,query);return [r.sheet,String(r.row),...r.values];})],'\t');}
 else if(type==='export'){value='\uFEFF'+encodeTable([['シート名','元行番号',...result.columns],...result.hits.map(h=>{const r=display(data,h,result.columns,query);return [r.sheet,String(r.row),...r.values];})]);}
 self.postMessage({id,value});}catch(e){self.postMessage({id,error:e instanceof Error?e.message:String(e)});}};
