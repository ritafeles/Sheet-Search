const {app,BrowserWindow}=require('electron');const path=require('node:path');
app.whenReady().then(()=>{const win=new BrowserWindow({width:1360,height:900,webPreferences:{contextIsolation:true,nodeIntegration:false,sandbox:true}});win.loadFile(path.resolve('release-browser/Sheet-Search-Browser.html'));});app.on('window-all-closed',()=>app.quit());
