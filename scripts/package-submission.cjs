// Dependency-free ZIP builder. Explicit source allowlist; never walks local stores/config.
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const { createHash } = require('node:crypto');
const root = path.resolve(__dirname,'..');
const rootFiles = ['README.md','JUDGES.md','SETUP.md','SUBMISSION.md','HACKATHON.md','package.json','.env.example','index.html'];
const sourceDirs = ['src','server','data','demo','scripts','tests'];
const excluded = new Set(['DEMO-VIDEO-DRAFT.md','recording-demo.cjs','verify-recording-demo.cjs','serve-demo-replay.cjs','build-demo-replay.cjs']); // Existing untracked team draft; not a final submission artifact.
const crcTable = Array.from({length:256},(_,n) => { for (let i=0;i<8;i++) n = n&1 ? 0xedb88320^(n>>>1) : n>>>1; return n>>>0; });
function crc32(buffer) { let n = 0xffffffff; for (const b of buffer) n = crcTable[(n^b)&255]^(n>>>8); return (n^0xffffffff)>>>0; }
function packageFiles() {
  const files = rootFiles.filter(f => fs.existsSync(path.join(root,f)));
  function walk(relative) {
    for (const entry of fs.readdirSync(path.join(root,relative),{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))) {
      if (entry.name.startsWith('.') || excluded.has(entry.name) || entry.name === 'node_modules' || entry.name === '__pycache__') continue;
      const name = `${relative}/${entry.name}`;
      if (entry.isSymbolicLink()) throw new Error(`Refusing symlink in submission: ${name}`);
      if (entry.isDirectory()) walk(name); else if (entry.isFile()) files.push(name);
    }
  }
  sourceDirs.forEach(walk);
  for (const file of ['docs/checks/SUBMISSION-READINESS.md','docs/checks/submission-tests.txt','docs/checks/judge-demo.png']) if (fs.existsSync(path.join(root,file))) files.push(file);
  return files.sort();
}
function buildZip(files) {
  let offset = 0; const local = [], central = [];
  const date = new Date(), dosTime = date.getHours()<<11 | date.getMinutes()<<5 | date.getSeconds()>>1, dosDate = (date.getFullYear()-1980)<<9 | (date.getMonth()+1)<<5 | date.getDate();
  for (const relative of files) {
    const name = Buffer.from(`hi-vis/${relative}`), data = fs.readFileSync(path.join(root,relative)), compressed = zlib.deflateRawSync(data), crc = crc32(data);
    const header = Buffer.alloc(30); header.writeUInt32LE(0x04034b50); header.writeUInt16LE(20,4); header.writeUInt16LE(8,8); header.writeUInt16LE(dosTime,10); header.writeUInt16LE(dosDate,12); header.writeUInt32LE(crc,14); header.writeUInt32LE(compressed.length,18); header.writeUInt32LE(data.length,22); header.writeUInt16LE(name.length,26);
    local.push(header,name,compressed);
    const record = Buffer.alloc(46); record.writeUInt32LE(0x02014b50); record.writeUInt16LE(20,4); record.writeUInt16LE(20,6); record.writeUInt16LE(8,10); record.writeUInt16LE(dosTime,12); record.writeUInt16LE(dosDate,14); record.writeUInt32LE(crc,16); record.writeUInt32LE(compressed.length,20); record.writeUInt32LE(data.length,24); record.writeUInt16LE(name.length,28); record.writeUInt32LE(offset,42); central.push(record,name);
    offset += header.length+name.length+compressed.length;
  }
  const directory = Buffer.concat(central), end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50); end.writeUInt16LE(files.length,8); end.writeUInt16LE(files.length,10); end.writeUInt32LE(directory.length,12); end.writeUInt32LE(offset,16);
  return Buffer.concat([...local,directory,end]);
}
if (require.main === module) {
  const files = packageFiles(), archive = buildZip(files), out = path.join(root,'dist'); fs.mkdirSync(out,{recursive:true});
  fs.writeFileSync(path.join(out,'hi-vis-submission.zip'),archive);
  const sha256 = createHash('sha256').update(archive).digest('hex');
  fs.writeFileSync(path.join(out,'hi-vis-submission.sha256'),`${sha256}  hi-vis-submission.zip\n`);
  console.log(`Prepared dist/hi-vis-submission.zip (${files.length} files, ${archive.length} bytes).\nSHA-256: ${sha256}\nExcluded: .env, .riverside, .git, dependencies/build output, internal project history and video work in progress. Nothing published.`);
}
module.exports = { packageFiles, buildZip };
