// Local-only UI verification. All API calls use fixtures; no production writes.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.png':'image/png'};
http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost');
  const relative=decodeURIComponent(url.pathname).replace(/^\/+/, '')||'command-center-98/app-v130.html';
  const file=path.resolve(root,relative);
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end('Not found');return}
  let content=fs.readFileSync(file);
  if(relative==='command-center-98/app.html')content=content.toString().replace('<head>','<head><script src="/scripts/ui-fixtures.js"></script>');
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(content);
}).listen(8787,'127.0.0.1',()=>console.log('Fixture preview: http://127.0.0.1:8787/command-center-98/app-v130.html'));
