import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../server/app.mjs';
test('production serves the home page and client routes but never private server data',async t=>{
  const directory=await mkdtemp(join(tmpdir(),'burger-production-'));const dist=join(directory,'dist');await mkdir(dist);await writeFile(join(dist,'index.html'),'<html><title>burger.ai</title></html>');
  const server=await createApp({dataDirectory:join(directory,'data'),distDirectory:dist,apiKey:''});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin=`http://127.0.0.1:${server.address().port}`;
  t.after(async()=>{await new Promise(resolve=>server.close(resolve));await rm(directory,{recursive:true,force:true});});
  for(const path of ['/','/profile/me','/explore']){const response=await fetch(origin+path);assert.equal(response.status,200);assert.match(await response.text(),/<title>burger.ai/);}
  const privateFile=await fetch(origin+'/.data/database.json');assert.doesNotMatch(await privateFile.text(),/sessions|password_hash/);
});
