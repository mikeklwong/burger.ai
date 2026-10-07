import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { setTimeout as pause } from 'node:timers/promises';

test('one command starts frontend and API with no environment file or Base44 settings', {timeout:15000}, async t => {
  const directory = await mkdtemp(join(tmpdir(),'burger-startup-'));
  const child = spawn(process.execPath,['scripts/dev.mjs'],{env:{...process.env,DATA_DIR:directory,OPENAI_API_KEY:'',PORT:'3001',HOST:'127.0.0.1'},stdio:['ignore','pipe','pipe']});
  let logs='';child.stdout.on('data',bytes=>{logs+=bytes;});child.stderr.on('data',bytes=>{logs+=bytes;});
  t.after(async()=>{child.kill('SIGTERM');await new Promise(resolve=>{if(child.exitCode!==null)resolve();else child.once('exit',resolve);});await rm(directory,{recursive:true,force:true});});
  let html;
  for(let attempt=0;attempt<100;attempt++){
    if(child.exitCode!==null)assert.fail(logs);
    try{const response=await fetch('http://localhost:5173');if(response.ok){html=await response.text();break;}}catch{}
    await pause(80);
  }
  assert.match(html||'',/<title>burger.ai/);
  const settings=await fetch('http://localhost:5173/api/settings').then(r=>r.json());assert.equal(settings.ai_enabled,false);
  const demo=await fetch('http://localhost:5173/api/auth/demo',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
  assert.equal(demo.status,200);const cookie=demo.headers.get('set-cookie').split(';')[0];
  const posts=await fetch('http://localhost:5173/api/entities/Post',{headers:{Cookie:cookie}}).then(r=>r.json());assert.equal(posts.length,3);
  const sample=await fetch(`http://localhost:5173${posts[0].image_url}`);assert.equal(sample.status,200);assert.match(await sample.text(),/Sample outfit illustration/);
});
