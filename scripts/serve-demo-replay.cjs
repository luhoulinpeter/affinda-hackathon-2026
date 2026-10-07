// Local, read-only artifact preview, including byte ranges for video seeking.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const dir = path.resolve(__dirname, '../docs/demo');
const types = { '.html':'text/html', '.mp4':'video/mp4', '.png':'image/png', '.json':'application/json', '.vtt':'text/vtt' };
const server = http.createServer((req,res) => {
  if (req.headers.host !== `127.0.0.1:${server.address().port}`) { res.writeHead(403); res.end(); return; }
  if (!['GET','HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
  const name = new URL(req.url,'http://127.0.0.1').pathname.slice(1) || 'replay.html';
  if (!/^(replay\.html|incident-demo\.mp4|verification\.json|captions\.vtt|frames\/[\w-]+\.png)$/.test(name)) { res.writeHead(404); res.end(); return; }
  const file = path.join(dir,name);
  if (!fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
  const size = fs.statSync(file).size;
  res.setHeader('Content-Type',types[path.extname(file)]);
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Accept-Ranges','bytes');
  let start=0,end=size-1,status=200;
  if (req.headers.range) {
    const match=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
    if (!match || !match[1] && !match[2]) { res.writeHead(416,{'Content-Range':`bytes */${size}`});res.end();return; }
    if (!match[1]) start=Math.max(0,size-Number(match[2]));
    else { start=Number(match[1]); if(match[2])end=Math.min(end,Number(match[2])); }
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start<0 || start>end || start>=size) { res.writeHead(416,{'Content-Range':`bytes */${size}`});res.end();return; }
    status=206;res.setHeader('Content-Range',`bytes ${start}-${end}/${size}`);
  }
  res.writeHead(status,{'Content-Length':end-start+1});
  if (req.method==='HEAD')res.end();else fs.createReadStream(file,{start,end}).pipe(res);
});
server.listen(Number(process.env.DEMO_REPLAY_PORT || 8767),'127.0.0.1',()=>console.log(`Demo replay: http://127.0.0.1:${server.address().port}/replay.html`));
