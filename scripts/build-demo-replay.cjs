const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const dir = path.resolve(__dirname, '../docs/demo');
const scenes = [
  ['01-attendee-report.png', 5, 'Attendee · Create an incident', 'The attendee describes a fictional ankle injury and keeps “Use my location”. The recording sandbox supplies fictional GPS.'],
  ['02-attendee-sent.png', 4, 'Attendee · Report received', 'I-1 is saved. “Send report only” does not automatically request a volunteer; Mo can offer the incident manually.'],
  ['03-mo-new-map-pin.png', 5, 'Mo · New incident on the map', 'The same incident appears as an orange pin beside Priya’s blue volunteer pin. Mo opens I-1 from the map.'],
  ['04-mo-choose-priya.png', 5, 'Mo · Offer to Priya', 'Mo reviews the original report, chooses available Priya and sends an offer.'],
  ['05-priya-incoming-offer.png', 5, 'Volunteer · Incoming offer', 'Priya receives the incident details and destination. She has Accept and Decline controls.'],
  ['06-priya-accepted.png', 4, 'Volunteer · Accept the assignment', 'Priya accepts. The server assigns I-1 to her and marks her busy. Arrival still needs confirmation.'],
  ['07-priya-grey-path.png', 5, 'Volunteer · Grey dotted connection', 'The volunteer’s field map draws a decorative dotted curve between the starting ping and attendee.'],
  ['09-mo-movement.png', 4, 'Mo · Start fictional movement', 'Mo starts the existing 90-second movement demo. This is simulated movement, not real phone GPS.'],
  ['10-priya-progress-early.png', 3, 'Volunteer · Journey begins', 'Priya’s simulated moving pin advances. The grey dotted path starts gaining white fill.'],
  ['12-priya-progress-middle.png', 3, 'Volunteer · White progress advances', 'White centres extend along the same dotted curve as the simulated volunteer approaches.'],
  ['15-priya-progress-later.png', 3, 'Volunteer · Approaching the destination', 'The replay skips time between captured frames of the real app’s 90-second simulation.'],
  ['16-priya-progress-complete.png', 4, 'Volunteer · Full white progress', 'The backend reaches 100% and the dotted connection is filled white. The incident remains open.'],
  ['17-mo-progress-complete.png', 4, 'Mo · Same journey visible', 'Mo sees the incident, volunteer and completed decorative progress in the operations map.'],
  ['18-attendee-progress-complete.png', 6, 'Attendee · Private responder tracking', 'The attendee sees the frozen volunteer starting ping and white progress, without the volunteer’s moving pin.'],
  ['19-priya-human-arrival.png', 4, 'Volunteer · Human confirmation remains', 'At 100%, Priya still has “Mark arrived”. Movement never automatically confirms arrival or resolves the incident.']
].map(([file,seconds,title,caption], index, all) => ({ file,seconds,title,caption }));
let elapsed = 0;
for (const scene of scenes) { scene.start = elapsed; elapsed += scene.seconds; scene.end = elapsed; }
const time = seconds => `${String(Math.floor(seconds/3600)).padStart(2,'0')}:${String(Math.floor(seconds/60)%60).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')},000`;
const srt = scenes.map((s,i) => `${i+1}\n${time(s.start)} --> ${time(s.end)}\n${s.title}\n${s.caption}\n`).join('\n');
fs.writeFileSync(path.join(dir,'captions.srt'),srt);
fs.writeFileSync(path.join(dir,'captions.vtt'),'WEBVTT\n\n'+srt.replaceAll(',000','.000'));
fs.writeFileSync(path.join(dir,'scenes.json'),JSON.stringify(scenes,null,2)+'\n');
fs.writeFileSync(path.join(dir,'frames.ffconcat'),'ffconcat version 1.0\n'+scenes.map(s=>`file 'frames/${s.file}'\nduration ${s.seconds}\n`).join('')+`file 'frames/${scenes.at(-1).file}'\n`);
execFileSync('ffmpeg',['-y','-hide_banner','-loglevel','error','-f','concat','-safe','0','-i',path.join(dir,'frames.ffconcat'),
  '-i',path.join(dir,'captions.srt'),'-map','0:v','-map','1:s','-vf','fps=25,format=yuv420p',
  '-c:v','libx264','-preset','fast','-crf','20','-c:s','mov_text','-disposition:s:0','default',
  '-metadata','title=Riverside incident workflow demo','-metadata','comment=Edited replay of actual app screenshots. Fictional GPS and movement; simulated AI. No live AI calls.',
  '-movflags','+faststart','-t',String(elapsed),path.join(dir,'incident-demo.mp4')],{stdio:'inherit'});
fs.writeFileSync(path.join(dir,'replay.html'),`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Riverside · Incident workflow demo</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#edf3f0;color:#193a34;font:16px/1.5 system-ui,sans-serif}main{max-width:1120px;margin:auto;padding:24px}h1{font-size:clamp(24px,4vw,34px);line-height:1.2;margin:0 0 8px}p{margin:6px 0 16px}.badge{display:inline-block;border:1px solid #aac8bd;border-radius:99px;padding:3px 10px;font-size:12px;font-weight:650;background:#fff}video{display:block;width:100%;background:#152c26;border-radius:12px 12px 0 0}.caption{background:white;padding:16px 20px;border-radius:0 0 12px 12px;min-height:110px}h2{font-size:20px;margin:0 0 5px}.caption p{margin:0;color:#4b605a}nav{display:flex;flex-wrap:wrap;gap:8px;margin-top:18px}button,a{font:inherit}button{padding:9px 13px;border:1px solid #b5c9c1;border-radius:8px;background:white;color:#193a34;cursor:pointer}button[aria-current=true]{background:#285e50;color:white}button:focus-visible,a:focus-visible{outline:3px solid #c66827;outline-offset:2px}.meta{font-size:13px;color:#536b62;margin:18px 0}.links{display:flex;gap:18px;flex-wrap:wrap}a{color:#285e50}details{margin-top:18px;background:#fff;padding:14px;border-radius:10px}summary{cursor:pointer}#still{width:100%;margin-top:12px;border:1px solid #d3e1da;border-radius:6px}footer{padding:20px 0;font-size:13px;color:#536b62}
</style></head><body><main>
<p class="badge">Actual app screens · Edited replay · Fictional GPS, AI and movement</p>
<h1>From incident report to volunteer response</h1><p>Attendee → Mo’s map → offer to Priya → acceptance → grey dots filling white.</p>
<video id="video" controls playsinline preload="metadata" poster="frames/12-priya-progress-middle.png"><source src="incident-demo.mp4" type="video/mp4"><track src="captions.vtt" kind="subtitles" srclang="en" label="English"><p><a href="incident-demo.mp4">Download the demo video</a></p></video>
<div class="caption" aria-live="polite"><h2 id="title"></h2><p id="caption"></p></div>
<nav aria-label="Demo chapters" id="chapters"></nav>
<p class="meta">${elapsed}-second replay assembled from browser screenshots of the running app. Time is shortened between stages. There is no audio. All reports, accounts and coordinates are fictional test data; the existing 90-second app simulator drives movement. No live AI calls were made.</p>
<div class="links"><a href="incident-demo.mp4" download>Download MP4</a><a href="verification.json">Measured verification</a></div>
<details><summary>Inspect the current stage as a still image</summary><img id="still" alt="Actual app screenshot for the selected demo stage"></details>
<footer>Verified: one report, Priya assigned, matching Mo/volunteer progress at 100%, incident still open, arrival still unconfirmed, original destination preserved. A separate guest could retrieve no incident or volunteer pins.</footer>
</main><script>
const scenes=${JSON.stringify(scenes)}, video=document.querySelector('#video'), nav=document.querySelector('#chapters');
let selected=-1;
const buttons=scenes.map((scene,index)=>{const button=document.createElement('button');button.type='button';button.textContent=(index+1)+'. '+scene.title;button.addEventListener('click',()=>{video.currentTime=scene.start+.05;show(index)});nav.append(button);return button});
function show(index){if(index===selected)return;selected=index;const scene=scenes[index];document.querySelector('#title').textContent=scene.title;document.querySelector('#caption').textContent=scene.caption;document.querySelector('#still').src='frames/'+scene.file;buttons.forEach((b,i)=>b.setAttribute('aria-current',String(i===index)));}
video.addEventListener('timeupdate',()=>show(Math.max(0,scenes.findLastIndex(s=>video.currentTime>=s.start))));show(0);
</script></body></html>`);
console.log(`Built ${elapsed}-second MP4 and replay.html in docs/demo.`);
