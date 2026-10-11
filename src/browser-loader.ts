import ExcelJS from 'exceljs';
import Papa from 'papaparse';
import type {Dataset,LoadOptions} from './types';

export async function loadBrowser(file:File,options:LoadOptions):Promise<Dataset>{
 const ext=file.name.slice(file.name.lastIndexOf('.')).toLowerCase(),d:Dataset={name:file.name,sheets:[],warnings:[]};
 if(ext==='.csv'){
  const bytes=await file.arrayBuffer();let encoding=options.encoding;
  if(encoding==='auto'){try{new TextDecoder('utf-8',{fatal:true}).decode(bytes);encoding='utf-8';}catch{encoding='shift_jis';}}
  const text=new TextDecoder(encoding).decode(bytes).replace(/^\uFEFF/,'');const result=Papa.parse<string[]>(text,{delimiter:options.delimiter,skipEmptyLines:false,dynamicTyping:false});const serious=result.errors.filter(e=>e.code!=='UndetectableDelimiter');if(serious.length)throw Error(`CSV形式を確認してください：${serious[0].message}`);
  d.sheets.push({name:'CSV',rows:result.data,headerRow:1});d.warnings.push(`CSV文字コード：${encoding==='shift_jis'?'CP932':'UTF-8'} ／ 区切り：${result.meta.delimiter==='\t'?'タブ':result.meta.delimiter}`);
 }else if(ext==='.xlsx'){
  const workbook=new ExcelJS.Workbook();try{await workbook.xlsx.load(await file.arrayBuffer());}catch{throw Error('Excelを開けません。破損またはパスワード付きでないか確認してください。');}let missing=0;
  workbook.eachSheet(ws=>{const rows:string[][]=[];ws.eachRow({includeEmpty:true},row=>{const values:string[]=[];row.eachCell({includeEmpty:true},(cell,i)=>{let v=cell.value;if(v&&typeof v==='object'&&('formula'in v||'sharedFormula'in v)){v=v.result??null;if(v===null)missing++;}let text='';if(v instanceof Date)text=v.toISOString().replace(/T00:00:00\.000Z$/,'').replace(/\.000Z$/,'Z');else if(v&&typeof v==='object'){if('richText'in v)text=v.richText.map(x=>x.text).join('');else if('text'in v)text=String(v.text);else if('error'in v)text=v.error;}else if(v!=null){text=String(v);if(typeof v==='number'&&/^0+$/.test(cell.numFmt))text=text.padStart(cell.numFmt.length,'0');}values[i-1]=text;});rows[row.number-1]=Array.from({length:values.length},(_,i)=>values[i]||'');});d.sheets.push({name:ws.name,rows:Array.from({length:rows.length},(_,i)=>rows[i]||[]),headerRow:1});});if(missing)d.warnings.push(`保存済み計算結果がない数式が${missing}セルあります。空欄で表示します。Excelで再計算・保存すると表示できます。`);
 }else throw Error('.xlsx または .csv ファイルを選択してください。');return d;
}
