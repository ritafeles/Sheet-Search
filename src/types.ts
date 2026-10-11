export type Cell = string;
export type Sheet = {name:string; rows:Cell[][]; headerRow:number};
export type Dataset = {name:string; sheets:Sheet[]; warnings:string[]};
export type Filter = {id:string; column:string; type:'text'|'number'|'date'; op:'contains'|'equals'|'gte'|'lte'|'range'; value:string; end:string};
export type Sort = {column:string; direction:'asc'|'desc'};
export type Query = {text:string; exact:boolean; caseSensitive:boolean; mode:'and'|'or'; sheet:string; column:string; filters:Filter[]; sort?:Sort};
export type Hit = {sheet:number; row:number};
export type Result = {hits:Hit[]; columns:string[]; excluded:string[]; elapsed:number};
export type DisplayRow = {sheet:string; row:number; values:string[]; matched:number[]};
export type Meta = {name:string; warnings:string[]; sheets:{name:string; count:number; headerRow:number; columns:string[]}[]};
export type LoadOptions = {encoding:'auto'|'utf-8'|'shift_jis'; delimiter:string};
export type Api = {choose:()=>Promise<string|null>; path:(file:File)=>string; open:(path:string,options:LoadOptions)=>Promise<Meta>; search:(query:Query)=>Promise<Omit<Result,'hits'>&{count:number}>; page:(start:number,count:number)=>Promise<DisplayRow[]>; context:(index:number)=>Promise<{columns:string[];rows:DisplayRow[]}>; header:(sheet:string,row:number)=>Promise<Meta>; cancel:()=>Promise<void>; copy:(indices:number[])=>Promise<void>; copyText:(text:string)=>Promise<void>; openUrl:(url:string)=>Promise<void>; export:()=>Promise<boolean>};
declare global {interface Window {sheetApi?:Api}}
