import {app,BrowserWindow,dialog,ipcMain,clipboard,shell} from 'electron';
import {Worker} from 'node:worker_threads';
import path from 'node:path';
import {rename,unlink} from 'node:fs/promises';
let worker:Worker|undefined,window:BrowserWindow,source='',loading=false,id=0;
const pending=new Map<number,{resolve:(v:any)=>void;reject:(e:Error)=>void}>();
function stop(){worker?.terminate();worker=undefined;for(const p of pending.values())p.reject(Error('キャンセルしました'));pending.clear();}
function spawn(){const w=new Worker(path.join(__dirname,'worker.cjs'));worker=w;w.on('message',m=>{const p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(Error(m.error)):p.resolve(m.value);}});w.on('error',e=>{if(worker===w){for(const p of pending.values())p.reject(e);pending.clear();worker=undefined;}});}
function call(type:string,args:any={}){if(!worker)return Promise.reject(Error('ファイルを開いてください'));return new Promise<any>((resolve,reject)=>{const key=++id;pending.set(key,{resolve,reject});worker!.postMessage({id:key,type,args});});}
app.whenReady().then(()=>{window=new BrowserWindow({width:1360,height:900,minWidth:1000,minHeight:700,backgroundColor:'#f5f7fa',title:'Sheet Search',webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});window.setMenuBarVisibility(false);window.webContents.setWindowOpenHandler(()=>({action:'deny'}));window.webContents.on('will-navigate',e=>e.preventDefault());window.loadFile(path.join(__dirname,'../dist/index.html'));
 ipcMain.handle('choose',async()=>{const r=await dialog.showOpenDialog(window,{properties:['openFile'],filters:[{name:'Excel・CSV',extensions:['xlsx','csv']}]});return r.canceled?null:r.filePaths[0];});
 ipcMain.handle('open',async(_,p:string,options)=>{if(typeof p!=='string'||!['.xlsx','.csv'].includes(path.extname(p).toLowerCase()))throw Error('Excel・CSVファイルを選択してください');stop();spawn();source=path.resolve(p);loading=true;try{return await call('load',{path:source,options});}finally{loading=false;}});
 ipcMain.handle('cancel',async()=>{if(loading)stop();else await call('cancel');});
 for(const type of ['search','page','context','header'])ipcMain.handle(type,(_,args)=>call(type,args));
 ipcMain.handle('copy',async(_,indices)=>clipboard.writeText(await call('copy',{indices})));
 ipcMain.handle('copyText',(_,text)=>{if(typeof text!=='string'||text.length>10_000_000)throw Error('コピーする文字列が大きすぎます');clipboard.writeText(text);});
 ipcMain.handle('openUrl',async(_,value)=>{if(typeof value!=='string'||value.length>8192)throw Error('URLが正しくありません');let url:URL;try{url=new URL(value);}catch{throw Error('URLが正しくありません');}if(!['http:','https:'].includes(url.protocol))throw Error('httpまたはhttpsのURLだけを開けます');await shell.openExternal(url.href);});
 ipcMain.handle('export',async()=>{const r=await dialog.showSaveDialog(window,{defaultPath:'検索結果.csv',filters:[{name:'CSV',extensions:['csv']}]});if(r.canceled||!r.filePath)return false;if(path.resolve(r.filePath).toLowerCase()===source.toLowerCase())throw Error('元ファイルと別の名前で保存してください');const temp=r.filePath+'.'+Date.now()+'.tmp';try{await call('export',{path:temp});await rename(temp,r.filePath);return true;}finally{await unlink(temp).catch(()=>{});}});
});
app.on('window-all-closed',()=>{stop();app.quit();});
