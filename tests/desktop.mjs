import {_electron as electron} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import path from 'node:path';
import ExcelJS from 'exceljs';
await mkdir('test-output',{recursive:true});
const fixture=path.resolve('test-output/demo.xlsx'),output=path.resolve('test-output/export.csv');
const book=new ExcelJS.Workbook();const s=book.addWorksheet('受注一覧');s.addRow(['注文番号','顧客名','地域','金額','受注日','ステータス','リンク']);for(let i=0;i<300;i++)s.addRow([`ORD-${String(i+1).padStart(4,'0')}`,['田中商事','青山デザイン','鈴木工業','山田製作所'][i%4],i%3===0?'東京':'大阪',(i+1)*1000,'2026-09-10',i%2?'確認中':'完了',i===0?'公式 https://example.com/a と詳細 https://example.org/detail。':'']);book.addWorksheet('顧客メモ').addRows([['顧客名','備考'],['田中商事','東京の新規顧客']]);await book.xlsx.writeFile(fixture);
const executablePath=process.env.SHEET_EXE;
const app=await electron.launch(executablePath?{executablePath,args:[]}:{args:['.']});
try{
 const page=await app.firstWindow();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.getByText('必要なデータに、すぐ届く。').waitFor();await page.screenshot({path:'test-output/empty.png'});
 await app.evaluate(({dialog},fixture)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[fixture]});},fixture);
 await page.getByRole('button',{name:'＋ ファイルを開く',exact:true}).click();await page.getByRole('heading',{name:'demo.xlsx'}).waitFor();await page.waitForFunction(()=>document.querySelectorAll('.data-row').length>0);
 assert.equal(await page.locator('.result-head strong').innerText(),'301');
 await page.getByLabel('検索キーワード',{exact:true}).fill('東京');await page.waitForFunction(()=>document.querySelector('.result-head strong')?.textContent==='101');assert.ok(await page.locator('.matched').count()>0);
 // Select and copy one cell without selecting the full row.
 const firstCell=page.locator('[role="gridcell"]').first();await firstCell.click();await page.keyboard.press('Control+C');assert.equal(await app.evaluate(({clipboard})=>clipboard.readText()),'ORD-0001');
 // Right-click shows every URL and opens only the selected item externally.
 await app.evaluate(({shell})=>{globalThis.openedUrls=[];shell.openExternal=async url=>{globalThis.openedUrls.push(url);};});await page.locator('[role="gridcell"]').nth(6).click({button:'right'});assert.equal(await page.getByRole('menuitem').count(),2);await page.screenshot({path:'test-output/url-menu.png'});await page.getByRole('menuitem').nth(1).click();assert.deepEqual(await app.evaluate(()=>globalThis.openedUrls),['https://example.org/detail']);assert.equal(await page.evaluate(()=>window.sheetApi.openUrl('javascript:alert(1)').then(()=>false,()=>true)),true);
 // Hide and restore one displayed column.
 const statusToggle=page.locator('.column-picker label').filter({hasText:'ステータス'}).locator('input');await statusToggle.uncheck();assert.equal(await page.locator('.table-header').getByText('ステータス',{exact:true}).count(),0);await statusToggle.check();
 // Header clicks cycle ascending, descending and off.
 const amountHeader=page.locator('button[title="金額で並べ替え"]');await amountHeader.click();await page.waitForFunction(()=>document.querySelectorAll('[role="gridcell"]')[3]?.textContent==='1000');await amountHeader.click();await page.waitForFunction(()=>document.querySelectorAll('[role="gridcell"]')[3]?.textContent==='298000');await amountHeader.click();await page.waitForFunction(()=>document.querySelectorAll('[role="gridcell"]')[0]?.textContent==='ORD-0001');
 // Dark mode is applied and persisted.
 await page.getByRole('button',{name:'ダークモードに切り替え'}).click();assert.ok(await page.locator('.app').evaluate(e=>e.classList.contains('theme-dark')));assert.equal(await page.evaluate(()=>localStorage.getItem('theme')),'dark');await page.screenshot({path:'test-output/dark.png'});await page.getByRole('button',{name:'ライトモードに切り替え'}).click();
 await page.locator('.data-row .origin').first().click();await page.getByText('元データの前後の行',{exact:true}).waitFor();await page.getByRole('button',{name:'選択行をコピー'}).click();const clip=await app.evaluate(({clipboard})=>clipboard.readText());assert.ok(clip.includes('シート名\t元行番号'));assert.ok(clip.includes('ORD-0001'));
 await app.evaluate(({dialog},output)=>{dialog.showSaveDialog=async()=>({canceled:false,filePath:output});},output);
 await page.getByRole('button',{name:'↓ CSVに保存'}).click();await page.getByText('検索結果をCSVに保存しました',{exact:false}).waitFor();const csv=await readFile(output,'utf8');assert.equal(csv.charCodeAt(0),0xfeff);assert.ok(csv.includes('顧客メモ'));assert.equal(csv.trim().split('\r\n').length,102);
 await page.getByRole('button',{name:'＋ 条件を追加'}).click();await page.getByLabel('条件の列',{exact:true}).selectOption('金額');await page.getByLabel('条件の種類',{exact:true}).selectOption('number');await page.getByLabel('条件値',{exact:true}).fill('1000');await page.getByLabel('終了値',{exact:true}).fill('20000');await page.waitForFunction(()=>document.querySelector('.result-head strong')?.textContent==='7');await page.getByText('顧客メモ：列「金額」がありません',{exact:true}).waitFor();await page.screenshot({path:'test-output/results.png'});
 await page.getByRole('button',{name:'条件をすべてクリア'}).click();await page.getByLabel('検索キーワード',{exact:true}).fill('');await page.waitForFunction(()=>document.querySelector('.result-head strong')?.textContent==='301');await page.locator('.table-scroll').evaluate(e=>{e.scrollTop=6000;});await page.waitForFunction(()=>Number(document.querySelector('.data-row .origin b')?.textContent)>100);assert.ok(await page.locator('.data-row').count()<=60);
 // Exercise actual worker cancellation, stale searches and a second file load.
 const bench=path.resolve('test-output/100k.csv');const stats=await page.evaluate(async bench=>{await window.sheetApi.open(bench,{encoding:'auto',delimiter:''});const q={text:'東京',exact:false,caseSensitive:false,mode:'and',sheet:'',column:'',filters:[]};const old=window.sheetApi.search(q).then(()=>false,()=>true);await window.sheetApi.cancel();const canceled=await old;const result=await window.sheetApi.search(q);return {canceled,count:result.count,ms:result.elapsed};},bench);assert.equal(stats.canceled,true);assert.equal(stats.count,1000);
 assert.deepEqual(errors,[]);await writeFile('test-output/desktop-report.json',JSON.stringify({packaged:!!executablePath,stats,errors},null,2));console.log('Desktop checks passed',stats);
}finally{await app.close();}
