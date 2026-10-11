import {_electron as electron} from '@playwright/test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {mkdir,readFile} from 'node:fs/promises';
import ExcelJS from 'exceljs';
await mkdir('test-output',{recursive:true});const fixture=path.resolve('test-output/browser-demo.xlsx');
const book=new ExcelJS.Workbook(),sheet=book.addWorksheet('一覧');sheet.addRow(['ID','名前','金額','リンク']);sheet.addRow(['001','東京支店','1200','公式 https://example.com/a と詳細 https://example.org/b。']);sheet.addRow(['002','大阪支店','300','']);await book.xlsx.writeFile(fixture);
const app=await electron.launch({args:['tests/browser-host.cjs']});
try{const page=await app.firstWindow();const errors=[],logs=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>logs.push(m.text()));try{await page.locator('.app').waitFor({timeout:5000});}catch(e){throw Error(`ブラウザ版を起動できません: ${JSON.stringify({errors,logs,url:page.url()})}`,{cause:e});}await page.getByText('必要なデータに、すぐ届く。').waitFor();
 const bytes=[...await readFile(fixture)];await page.evaluate(bytes=>{const transfer=new DataTransfer();transfer.items.add(new File([new Uint8Array(bytes)],'browser-demo.xlsx',{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));document.querySelector('.app').dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:transfer}));},bytes);await page.getByRole('heading',{name:'browser-demo.xlsx'}).waitFor();await page.waitForFunction(()=>document.querySelector('.result-head strong')?.textContent==='2');
 await page.getByLabel('検索キーワード').fill('東京');await page.waitForFunction(()=>document.querySelector('.result-head strong')?.textContent==='1');assert.equal(await page.locator('[role="gridcell"]').first().innerText(),'001');
 await page.locator('[role="gridcell"]').nth(3).click({button:'right'});assert.equal(await page.getByRole('menuitem').count(),2);const popup=page.waitForEvent('popup');await page.getByRole('menuitem').nth(1).click();assert.equal((await popup).url(),'https://example.org/b');
 await page.evaluate(()=>{window.downloadAttempt=null;const original=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){if(this.download){window.downloadAttempt={name:this.download,href:this.href};return;}return original.call(this);};});await page.getByRole('button',{name:'↓ CSVに保存'}).click();await page.getByText('検索結果をCSVに保存しました').waitFor();const attempt=await page.evaluate(()=>window.downloadAttempt);assert.match(attempt.name,/browser-demo-検索結果\.csv/);assert.match(attempt.href,/^blob:/);assert.deepEqual(errors,[]);await page.screenshot({path:'test-output/browser.png'});console.log('Browser file checks passed');
}finally{await app.close();}
