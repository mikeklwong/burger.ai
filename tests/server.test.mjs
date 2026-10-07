import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../server/app.mjs';

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a1WQAAAAASUVORK5CYII=', 'base64');
async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(),'burger-test-'));
  let server = await createApp({dataDirectory:directory,apiKey:''});
  const listen = () => new Promise(resolve => server.listen(0,'127.0.0.1',resolve)); await listen();
  let origin = `http://127.0.0.1:${server.address().port}`;
  t.after(async()=>{await new Promise(resolve=>server.close(resolve));await rm(directory,{recursive:true,force:true});});
  function client() {
    let cookie = '';
    return async (path, data, method = 'GET', extraHeaders={}) => {
      const headers = { Cookie:cookie,...extraHeaders };
      if(data!==undefined && !Buffer.isBuffer(data))headers['Content-Type']='application/json';
      const res = await fetch(origin+path,{method,headers,body:data===undefined?undefined:Buffer.isBuffer(data)?data:JSON.stringify(data)});
      if(res.headers.get('set-cookie'))cookie=res.headers.get('set-cookie').split(';')[0];
      const result=await res.json();return {status:res.status,data:result};
    };
  }
  async function restart(){await new Promise(resolve=>server.close(resolve));server=await createApp({dataDirectory:directory,apiKey:''});await listen();origin=`http://127.0.0.1:${server.address().port}`;}
  return {client,restart};
}
async function register(client,email){const result=await client('/api/auth/register',{email,password:'valid-password'},'POST');assert.equal(result.status,200);return result.data;}
async function post(client){const upload=await client('/api/upload',png,'POST',{'Content-Type':'image/png'});assert.equal(upload.status,200);const result=await client('/api/functions/createPost',{image_url:upload.data.file_url,category:'Streetwear',tags:['cozy'],caption:'My outfit'},'POST');assert.equal(result.status,200);return result.data.post;}

test('register, session, upload, ratings, comments, follows and persistence work without configuration',async t=>{
  const f=await fixture(t);const a=f.client(),b=f.client();const alice=await register(a,'alice@example.com');const bob=await register(b,'bob@example.com');
  const p=await post(a);
  const rating=await b('/api/functions/ratePost',{post_id:p.id,value:'fire'},'POST');assert.equal(rating.status,200);assert.equal(rating.data.counts.rating_fire,1);assert.equal(rating.data.counts.avg_score,3);
  await b('/api/functions/ratePost',{post_id:p.id,value:'tuff',word:'clean'},'POST');
  const updated=await a(`/api/entities/Post/${p.id}`);assert.equal(updated.data.rating_count,1);assert.equal(updated.data.rating_tuff,1);assert.equal(updated.data.rating_fire,0);assert.equal(updated.data.top_word,'clean');
  assert.equal((await b('/api/entities/Comment',{post_id:p.id,text:'Nice fit'},'POST')).status,200);
  const follow=await b('/api/functions/toggleFollow',{target_id:alice.id},'POST');assert.equal(follow.data.following,true);
  const notifications=await a('/api/entities/Notification');assert.equal(notifications.data.length,3);assert.ok(notifications.data.every(x=>x.user_id===alice.id));
  await f.restart();assert.equal((await a('/api/auth/me')).data.id,alice.id);assert.equal((await b(`/api/entities/Post/${p.id}`)).data.rating_count,1);
  assert.equal((await b('/api/auth/logout',{},'POST')).status,200);assert.equal((await b('/api/auth/me')).status,401);
  assert.equal((await b('/api/auth/login',{email:bob.email,password:'valid-password'},'POST')).status,200);
});
test('ownership, private collections, user projection, image ownership and CSRF are enforced',async t=>{
  const {client}=await fixture(t);const a=client(),b=client();const alice=await register(a,'alice@example.com');const bob=await register(b,'bob@example.com');const p=await post(a);
  assert.equal((await b(`/api/entities/Post/${p.id}`,{caption:'Changed'},'PATCH')).status,403);
  assert.equal((await b(`/api/entities/Post/${p.id}`,{},'DELETE')).status,403);
  const collection=await a('/api/entities/Collection',{name:'Private',post_ids:[p.id]},'POST');assert.equal((await b(`/api/entities/Collection/${collection.data.id}`)).status,404);
  assert.equal((await b('/api/entities/Collection')).data.length,0);
  const users=await b('/api/entities/User');const projected=users.data.find(x=>x.id===alice.id);assert.equal(projected.email,undefined);assert.equal(projected.password_hash,undefined);assert.equal(projected.salt,undefined);
  const forged=await b('/api/auth/me',{id:alice.id,email:alice.email,is_pro:false},'PATCH');assert.equal(forged.data.id,bob.id);assert.equal(forged.data.email,bob.email);assert.equal(forged.data.is_pro,true);
  assert.equal((await b('/api/functions/createPost',{image_url:p.image_url,category:'Streetwear'},'POST')).status,403);
  assert.equal((await b('/api/auth/me',{profile_picture:p.image_url},'PATCH')).status,400);
  assert.equal((await a('/api/auth/me',{profile_picture:'https://example.com'+p.image_url},'PATCH')).status,400);
  assert.equal((await b('/api/entities/Collection',{name:'Nope'},'POST',{Origin:'https://evil.example'})).status,403);
  assert.equal((await b('/api/upload',Buffer.from('<svg/>'),'POST',{'Content-Type':'image/svg+xml'})).status,400);
  assert.equal((await a('/api/entities/Post',{author_id:bob.id},'POST')).status,403);
});
test('blocking prevents interactions and failed mutations leave no partial rating',async t=>{
  const {client}=await fixture(t);const a=client(),b=client();const alice=await register(a,'alice@example.com');const bob=await register(b,'bob@example.com');const p=await post(a);
  await b('/api/functions/ratePost',{post_id:p.id,value:'fire'},'POST');
  assert.equal((await b('/api/functions/ratePost',{post_id:p.id,value:'tuff',word:'invalid'},'POST')).status,400);
  const ratings=await b('/api/entities/Rating');assert.equal(ratings.data.length,1);assert.equal(ratings.data[0].value,'fire');
  await a('/api/entities/Block',{blocked_id:bob.id},'POST');
  assert.equal((await b(`/api/entities/Post/${p.id}`)).status,404);assert.equal((await b('/api/functions/toggleFollow',{target_id:alice.id},'POST')).status,400);
  assert.equal((await b('/api/functions/ratePost',{post_id:p.id,value:'tuff'},'POST')).status,404);
});
test('demo, optional AI fallback and account deletion work without keys',async t=>{
  const {client}=await fixture(t);const guest=client();assert.equal((await guest('/api/auth/demo',{},'POST')).data.is_demo,true);
  const samples=await guest('/api/entities/Post');assert.equal(samples.data.length,3);
  const own=await post(guest);
  const style=await guest('/api/functions/generateStyleDescription',{image_url:own.image_url,category:'Streetwear',tags:['cozy']},'POST');assert.equal(style.data.description_source,'tags');assert.equal(style.data.embedding.length,32);assert.match(style.data.style_description,/cozy/);
  const safety=await guest('/api/functions/checkImageSafety',{image_url:own.image_url},'POST');assert.equal(safety.data.checked,false);
  const b=client();await register(b,'reader@example.com');await b('/api/functions/ratePost',{post_id:own.id,value:'fire'},'POST');
  assert.equal((await b('/api/auth/account',{},'DELETE')).status,200);assert.equal((await guest(`/api/entities/Post/${own.id}`)).data.rating_count,0);
  assert.equal((await guest('/api/auth/account',{},'DELETE')).status,200);assert.equal((await guest('/api/auth/me')).status,401);assert.equal((await b('/api/entities/Post')).status,401);
});
