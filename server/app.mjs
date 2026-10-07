import { createServer } from 'node:http';
import { readFile, writeFile, unlink } from 'node:fs/promises';
import { resolve, join, extname, basename } from 'node:path';
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { createStore, add, now, entities, ratings, categories, matches, publicUser, tokenHash, styleVector } from './store.mjs';

const derive = promisify(scrypt);
const MAX_IMAGE = 8 * 1024 * 1024;
const SESSION_AGE = 7 * 86400000;
const owners = { Post: 'author_id', Rating: 'user_id', Follow: 'follower_id', PostInterest: 'user_id', Report: 'reporter_id', Block: 'blocker_id', UserTasteProfile: 'user_id', Collection: 'user_id', Notification: 'user_id', Comment: 'author_id', ProfileView: 'viewer_id', Subscription: 'user_id' };
const editable = {
  User: ['username', 'display_name', 'bio', 'profile_picture', 'favorite_categories', 'followed_tags', 'onboarding_complete'],
  Post: ['caption', 'category', 'tags', 'style_description', 'embedding', 'description_source'],
  PostInterest: ['post_id', 'value'], Report: ['target_type', 'target_id', 'reason'], Block: ['blocked_id'],
  UserTasteProfile: ['category_weights', 'tag_weights', 'taste_embedding'], Collection: ['name', 'post_ids', 'cover_post_id', 'is_public'],
  Notification: ['read'], Comment: ['post_id', 'text'], ProfileView: ['viewed_user_id', 'viewed_at'],
};
const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }); };
const pick = (obj, keys) => Object.fromEntries(keys.filter(k => Object.hasOwn(obj, k)).map(k => [k, obj[k]]));
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.json': 'application/json', '.ico': 'image/x-icon' };
function send(res, data, status = 200) { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(data)); }
async function body(req, max = 1000000) {
  let size = 0; const chunks = [];
  for await (const chunk of req) { size += chunk.length; if (size > max) fail('File or request is too large', 413); chunks.push(chunk); }
  return Buffer.concat(chunks);
}
async function json(req) { try { return JSON.parse((await body(req)).toString() || '{}'); } catch (e) { if (e.status) throw e; fail('Invalid JSON'); } }
function imageType(bytes) {
  if (bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return '.png';
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return '.jpg';
  if (/^GIF8[79]a/.test(bytes.subarray(0,6).toString())) return '.gif';
  if (bytes.subarray(0,4).toString() === 'RIFF' && bytes.subarray(8,12).toString() === 'WEBP') return '.webp';
  fail('Choose a PNG, JPEG, GIF, or WebP image');
}
function blocked(db, a, b) { return db.Block.some(x => x.blocker_id === a && x.blocked_id === b || x.blocker_id === b && x.blocked_id === a); }
function readable(db, entity, row, user) {
  if (entity === 'User') return row.id === user.id || !blocked(db, user.id, row.id);
  if (entity === 'Post') return !blocked(db, user.id, row.author_id);
  if (entity === 'Collection') return row.user_id === user.id || row.is_public && !blocked(db, user.id, row.user_id);
  if (entity === 'Follow') return !blocked(db, user.id, row.follower_id) && !blocked(db, user.id, row.following_id);
  if (entity === 'Rating' || entity === 'Comment') { const post = db.Post.find(x => x.id === row.post_id); return post && !blocked(db, user.id, post.author_id) && !blocked(db, user.id, row.user_id || row.author_id); }
  if (entity === 'Block') return row.blocker_id === user.id || row.blocked_id === user.id;
  if (entity === 'ProfileView') return row.viewer_id === user.id || row.viewed_user_id === user.id;
  return row[owners[entity]] === user.id;
}
function writable(entity, row, user) { return entity === 'User' ? row.id === user.id : row[owners[entity]] === user.id; }
function validateProfile(db, user, data) {
  if (Object.hasOwn(data, 'username')) {
    if (!/^[a-z0-9_]{3,30}$/.test(data.username)) fail('Use a handle with 3–30 lowercase letters, numbers, or underscores');
    if (db.User.some(x => x.id !== user.id && x.username === data.username)) fail('That handle is taken', 409);
  }
  for (const key of ['display_name', 'bio']) if (data[key] != null) data[key] = String(data[key]).slice(0, key === 'bio' ? 150 : 60);
  if (data.profile_picture && (typeof data.profile_picture !== 'string' || !/^\/uploads\/[a-f0-9]+\.(png|jpg|gif|webp)$/.test(data.profile_picture) || !(db.Upload || []).some(x => x.filename === basename(data.profile_picture) && x.user_id === user.id))) fail('Upload your own profile image first');
  if (data.favorite_categories) data.favorite_categories = data.favorite_categories.filter(x => categories.includes(x));
  if (data.followed_tags) data.followed_tags = data.followed_tags.slice(0,8).map(x => String(x).replace(/[^a-zA-Z0-9]/g,'').toLowerCase());
}
function validateData(db, entity, user, data) {
  if (entity === 'User') validateProfile(db, user, data);
  if (data.post_id) { const post = db.Post.find(x => x.id === data.post_id); if (!post || blocked(db,user.id,post.author_id)) fail('Post not found',404); }
  if (entity === 'Comment' && (!String(data.text || '').trim() || String(data.text).length > 500)) fail('Comments must contain 1–500 characters');
  if (entity === 'PostInterest' && !['interested','not_interested'].includes(data.value)) fail('Invalid interest');
  if (entity === 'Block' && (!db.User.some(x=>x.id===data.blocked_id) || data.blocked_id === user.id)) fail('Invalid account');
  if (entity === 'ProfileView') { if (!db.User.some(x=>x.id===data.viewed_user_id) || blocked(db,user.id,data.viewed_user_id)) fail('Profile not found',404); data.viewed_at = now(); }
  if (entity === 'Collection') {
    if (data.name !== undefined) { data.name = String(data.name).trim().slice(0,60); if (!data.name) fail('Name your collection'); }
    if (data.post_ids) { if (!Array.isArray(data.post_ids) || data.post_ids.length > 1000) fail('Invalid collection'); data.post_ids = [...new Set(data.post_ids)].filter(id=>db.Post.some(p=>p.id===id && !blocked(db,user.id,p.author_id))); }
  }
}
export async function createApp({ dataDirectory = resolve('.data'), distDirectory = resolve('dist'), publicDirectory = resolve('public'), apiKey = process.env.OPENAI_API_KEY, aiModel = process.env.OPENAI_MODEL || 'gpt-4.1-mini' } = {}) {
  const store = await createStore(dataDirectory); const attempts = new Map();
  function rateLimit(req, action, max = 40) {
    const key = `${req.socket.remoteAddress}:${action}`; const time = Date.now(); const entry = attempts.get(key);
    if (!entry || time - entry.start > 60000) { attempts.set(key, { start: time, count: 1 }); return; }
    if (++entry.count > max) fail('Please wait a minute before trying again',429);
    if (attempts.size > 10000) for (const [k,v] of attempts) if (time-v.start>60000) attempts.delete(k);
  }
  function sessionToken(req) { return /(?:^|;\s*)burger_session=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie || '')?.[1]; }
  function userFor(db, req) {
    const token = sessionToken(req); const session = token && db.sessions.find(x=>x.hash===tokenHash(token) && x.expires>Date.now());
    const user = session && db.User.find(x=>x.id===session.user_id); if (!user) fail('Please sign in',401); return user;
  }
  function setSession(db, res, user) {
    const token = randomBytes(32).toString('hex'); db.sessions = db.sessions.filter(x=>x.expires>Date.now());
    db.sessions.push({ hash: tokenHash(token), user_id:user.id, expires:Date.now()+SESSION_AGE });
    res.setHeader('Set-Cookie', `burger_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_AGE/1000}${process.env.COOKIE_SECURE==='true'?'; Secure':''}`);
  }
  async function imageData(imageUrl) {
    if (!/^\/uploads\/[a-f0-9]+\.(png|jpg|gif|webp)$/.test(imageUrl)) fail('Upload an image first');
    const filename=basename(imageUrl); const bytes=await readFile(join(dataDirectory,'uploads',filename)).catch(()=>fail('Image not found',404));
    return `data:${mime[extname(filename)]};base64,${bytes.toString('base64')}`;
  }
  async function vision(prompt, imageUrl) {
    const image = await imageData(imageUrl);
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method:'POST', headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'}, signal:AbortSignal.timeout(25000),
      body:JSON.stringify({model:aiModel,messages:[{role:'user',content:[{type:'text',text:prompt},{type:'image_url',image_url:{url:image,detail:'low'}}]}],response_format:{type:'json_object'}}),
    });
    if (!response.ok) throw new Error('Image analysis is temporarily unavailable');
    const result=await response.json(); return JSON.parse(result.choices[0].message.content);
  }
  async function functions(db, user, name, data) {
    if (name === 'createPost') {
      if (!categories.includes(data.category)) fail('Choose a category'); await imageData(data.image_url);
      if (!(db.Upload || []).some(x=>x.filename===basename(data.image_url) && x.user_id===user.id)) fail('Upload your own image first',403);
      const used=db.Post.filter(p=>p.author_id===user.id && Date.now()-Date.parse(p.created_date)<86400000).length;
      if (used>=20) return {error:'limit_reached',used};
      const tags=Array.isArray(data.tags)?data.tags.slice(0,12).map(x=>String(x).replace(/[^a-z0-9]/gi,'').toLowerCase()).filter(Boolean):[];
      const post=add(db,'Post',{author_id:user.id,image_url:data.image_url,caption:String(data.caption||'').slice(0,300),category:data.category,tags,style_description:`${data.category}${tags.length?` · ${tags.join(', ')}`:''}`,description_source:'tags',embedding:styleVector(data.category,tags),...Object.fromEntries(ratings.map(x=>[`rating_${x}`,0])),rating_count:0,rating_sum:0,avg_score:0,view_count:0,is_boosted:false});
      return {post,used:used+1};
    }
    if (name === 'ratePost') {
      const post=db.Post.find(x=>x.id===data.post_id); if (!post || blocked(db,user.id,post.author_id)) fail('Post not found',404);
      if (post.author_id===user.id) fail('You cannot rate your own outfit');
      if (!ratings.includes(data.value)) fail('Invalid rating');
      const recent=db.Rating.filter(x=>x.user_id===user.id && x.post_id!==post.id && Date.now()-Date.parse(x.created_date)<7*86400000);
      if (data.value==='iconic' && recent.filter(x=>x.value==='iconic').length>=Math.max(1,Math.floor(recent.length*.01))) return {error:'iconic_locked'};
      const previous=db.Rating.find(x=>x.user_id===user.id && x.post_id===post.id); db.Rating=db.Rating.filter(x=>x!==previous);
      const words=['fit','clean','cozy','bold','classy','edgy','fresh','minimal','timeless','trendy','effortless','statement','sharp','fun','elegant','street'];
      if (data.word && !words.includes(data.word)) fail('Invalid description word');
      add(db,'Rating',{user_id:user.id,post_id:post.id,value:data.value,score:ratings.indexOf(data.value)+1,word:data.word||previous?.word||null});
      const all=db.Rating.filter(x=>x.post_id===post.id); const counts=Object.fromEntries(ratings.map(x=>[`rating_${x}`,all.filter(r=>r.value===x).length]));
      const wordCounts={}; for (const r of all) if (r.word) wordCounts[r.word]=(wordCounts[r.word]||0)+1;
      const top_word=Object.keys(wordCounts).sort((a,b)=>wordCounts[b]-wordCounts[a])[0]||null;
      const rating_sum=all.reduce((sum,r)=>sum+ratings.indexOf(r.value)+1,0);
      Object.assign(counts,{rating_count:all.length,rating_sum,avg_score:rating_sum/all.length});
      Object.assign(post,counts,{top_word,updated_date:now()});
      if (!previous) add(db,'Notification',{user_id:post.author_id,type:'rating',actor_id:user.id,post_id:post.id,rating_value:data.value,read:false});
      return {counts,top_word};
    }
    if (name === 'toggleFollow') {
      const target=db.User.find(x=>x.id===data.target_id); if (!target || target.id===user.id || blocked(db,user.id,target.id)) fail('Cannot follow this account');
      const old=db.Follow.find(x=>x.follower_id===user.id && x.following_id===target.id);
      if (old) { db.Follow=db.Follow.filter(x=>x!==old); return {following:false}; }
      add(db,'Follow',{follower_id:user.id,following_id:target.id}); add(db,'Notification',{user_id:target.id,type:'follow',actor_id:user.id,read:false}); return {following:true};
    }
    fail('Feature not available',404);
  }
  async function serveFile(res, directory, path, fallback=false) {
    const filepath=resolve(directory, `.${path}`); if (!filepath.startsWith(resolve(directory)+ '/')) fail('Not found',404);
    try { const bytes=await readFile(filepath); res.writeHead(200,{'Content-Type':mime[extname(filepath)]||'application/octet-stream'}); res.end(bytes); }
    catch (error) { if(error.code!=='ENOENT') throw error; if(fallback) return serveFile(res,directory,'/index.html'); fail('Not found',404); }
  }
  const server=createServer(async(req,res)=>{
    res.setHeader('X-Content-Type-Options','nosniff'); res.setHeader('Referrer-Policy','same-origin');
    try {
      const url=new URL(req.url,'http://localhost'); const path=url.pathname;
      if (!['GET','HEAD'].includes(req.method) && req.headers.origin) {
        const origin=new URL(req.headers.origin); if (origin.host!==req.headers.host) fail('Cross-origin writes are not allowed',403);
      }
      if (path==='/api/health') return send(res,{ok:true});
      if (path==='/api/settings') return send(res,{id:'burger-ai',public_settings:{},ai_enabled:!!apiKey,post_limit:20});
      if (path.startsWith('/api/auth/')) {
        rateLimit(req,'auth',30); const action=path.split('/').at(-1); const data=req.method==='GET'?{}:await json(req);
        let credentials;
        if (action==='register') {
          if (typeof data.email!=='string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email) || data.email.length>254) fail('Enter a valid email');
          if (typeof data.password!=='string' || data.password.length<8 || data.password.length>128) fail('Use a password with 8–128 characters');
          const salt=randomBytes(16).toString('hex'); credentials={salt,password_hash:(await derive(data.password,salt,64)).toString('hex')};
        }
        return send(res,await store.run(async db=>{
          if (action==='me' && req.method==='GET') return publicUser(userFor(db,req),true);
          if (action==='register' && req.method==='POST') {
            const email=data.email.trim().toLowerCase(); if (db.User.some(x=>x.email===email)) fail('An account with that email already exists',409);
            const user=add(db,'User',{...credentials,email,username:`fit_${randomBytes(5).toString('hex')}`,display_name:'',bio:'',favorite_categories:[],followed_tags:[],onboarding_complete:false,is_pro:true}); setSession(db,res,user);return publicUser(user,true);
          }
          if (action==='login' && req.method==='POST') {
            if(typeof data.password!=='string'||data.password.length>128)fail('Invalid email or password',401);
            const user=db.User.find(x=>x.email===String(data.email).trim().toLowerCase());
            const hash=await derive(data.password,user?.salt||'missing-account',64);
            if(!user?.password_hash||!timingSafeEqual(hash,Buffer.from(user.password_hash,'hex')))fail('Invalid email or password',401);
            setSession(db,res,user);return publicUser(user,true);
          }
          if(action==='demo'&&req.method==='POST') {
            const user=add(db,'User',{username:`guest_${randomBytes(5).toString('hex')}`,display_name:'Guest stylist',bio:'Trying burger.ai',favorite_categories:['Streetwear'],followed_tags:[],onboarding_complete:true,is_pro:true,is_demo:true});setSession(db,res,user);return publicUser(user,true);
          }
          if(action==='logout'&&req.method==='POST') {const token=sessionToken(req);db.sessions=db.sessions.filter(x=>x.hash!==tokenHash(token||''));res.setHeader('Set-Cookie','burger_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');return {ok:true};}
          const user=userFor(db,req);
          if(action==='me'&&req.method==='PATCH') {const updates=pick(data,editable.User);validateProfile(db,user,updates);Object.assign(user,updates,{updated_date:now()});return publicUser(user,true);}
          if(action==='account'&&req.method==='DELETE') {
            const ownedPosts=new Set(db.Post.filter(p=>p.author_id===user.id).map(p=>p.id));
            const uploads=db.Upload?.filter(x=>x.user_id===user.id)||[];
            for(const entity of entities) db[entity]=db[entity].filter(row=>{
              if(entity==='User')return row.id!==user.id;
              return row[owners[entity]]!==user.id&&row.following_id!==user.id&&row.blocked_id!==user.id&&row.viewed_user_id!==user.id&&row.actor_id!==user.id&&!ownedPosts.has(row.post_id);
            });
            for(const post of db.Post){const rows=db.Rating.filter(r=>r.post_id===post.id);for(const rating of ratings)post[`rating_${rating}`]=rows.filter(r=>r.value===rating).length;post.rating_count=rows.length;post.rating_sum=rows.reduce((sum,r)=>sum+r.score,0);post.avg_score=rows.length?post.rating_sum/rows.length:0;}
            db.sessions=db.sessions.filter(x=>x.user_id!==user.id);db.Upload=(db.Upload||[]).filter(x=>x.user_id!==user.id);
            for(const upload of uploads)await unlink(join(dataDirectory,'uploads',upload.filename)).catch(()=>{});
            res.setHeader('Set-Cookie','burger_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');return {ok:true};
          }
          fail('Not found',404);
        }));
      }
      if (path==='/api/upload'&&req.method==='POST') {
        rateLimit(req,'uploads',20); const bytes=await body(req,MAX_IMAGE);const extension=imageType(bytes);const filename=randomBytes(16).toString('hex')+extension;
        await store.run(async db=>{const user=userFor(db,req);await writeFile(join(dataDirectory,'uploads',filename),bytes);db.Upload||=[];db.Upload.push({filename,user_id:user.id});});return send(res,{file_url:`/uploads/${filename}`});
      }
      if(path.startsWith('/api/functions/')&&req.method==='POST') {
        rateLimit(req,'functions',120); const name=path.split('/').at(-1);const data=await json(req);
        if(['checkImageSafety','generateStyleDescription'].includes(name))rateLimit(req,'image-analysis',40);
        await store.run(db=>{const user=userFor(db,req); if(['checkImageSafety','generateStyleDescription'].includes(name)&&!(db.Upload||[]).some(x=>x.filename===basename(String(data.image_url||''))&&x.user_id===user.id))fail('Upload your own image first',403);});
        if(name==='checkImageSafety') {
          await imageData(data.image_url);
          if(!apiKey)return send(res,{explicit:false,checked:false});
          try {const result=await vision('Return JSON {"explicit":boolean}. Is this image sexually explicit? Do not flag ordinary outfits, swimwear, or fashion photography.',data.image_url);return send(res,{explicit:result.explicit===true,checked:true});}catch{return send(res,{explicit:false,checked:false});}
        }
        if(name==='generateStyleDescription') {
          if(!categories.includes(data.category))fail('Invalid category');await imageData(data.image_url);
          const tags=Array.isArray(data.tags)?data.tags.slice(0,12).map(String):[];
          let description=`${data.category}${tags.length?` · ${tags.join(', ')}`:''}`;let source='tags';
          if(apiKey)try {const result=await vision('Describe only the clothes, colors and silhouette in 220 characters. Return JSON {"style_description":string}. Do not infer identity or personal traits.',data.image_url);if(typeof result.style_description==='string'){description=result.style_description.slice(0,220);source='ai';}}catch{/* A provider outage must not prevent posting. */}
          return send(res,{style_description:description,description_source:source,embedding:styleVector(data.category,tags)});
        }
        return send(res,await store.run(db=>functions(db,userFor(db,req),name,data)));
      }
      if(path.startsWith('/api/entities/')) {
        const [, , , entity, id]=path.split('/');if(!entities.includes(entity))fail('Not found',404);
        const data=req.method==='GET'?{}:await json(req);
        return send(res,await store.run(db=>{
          const user=userFor(db,req);const rows=db[entity];
          if(req.method==='GET') {
            const project=row=>entity==='User'?publicUser(row,row.id===user.id):row;
            if(id){const row=rows.find(x=>x.id===id);if(!row||!readable(db,entity,row,user))fail('Not found',404);return project(row);}
            let query;try{query=JSON.parse(url.searchParams.get('filter')||'{}');}catch{fail('Invalid filter');}
            const sort=url.searchParams.get('sort')||'-created_date';const key=sort.replace(/^-/,'');const direction=sort.startsWith('-')?-1:1;
            const limit=Math.min(1000,Math.max(1,Number(url.searchParams.get('limit'))||100));
            return rows.filter(row=>readable(db,entity,row,user)&&matches(row,query)).sort((a,b)=>direction*(a[key]>b[key]?1:a[key]<b[key]?-1:0)).slice(0,limit).map(project);
          }
          if(req.method==='POST'&&!id) {
            if(['User','Post','Follow','Rating','Subscription'].includes(entity))fail('Use the dedicated action for this record',403);
            if(entity==='Notification')return {ok:true}; // Comments notify on the server, not through a client-supplied recipient.
            const record=pick(data,editable[entity]||[]);record[owners[entity]]=user.id;validateData(db,entity,user,record);
            if(entity==='Collection')record.is_public=record.is_public===true;
            const row=add(db,entity,record);
            if(entity==='Comment'){const post=db.Post.find(x=>x.id===row.post_id);if(post.author_id!==user.id)add(db,'Notification',{user_id:post.author_id,type:'comment',actor_id:user.id,post_id:post.id,read:false});}
            return row;
          }
          if(id&&['PATCH','DELETE'].includes(req.method)) {
            const row=rows.find(x=>x.id===id);if(!row||!readable(db,entity,row,user))fail('Not found',404);
            if(req.method==='PATCH'&&entity==='Post'&&!writable(entity,row,user)) {
              if(Object.keys(data).length===1&&typeof data.view_count==='number'){row.view_count=(row.view_count||0)+1;return row;}fail('You cannot edit another person’s post',403);
            }
            if(!writable(entity,row,user))fail('You cannot change another person’s data',403);
            if(req.method==='DELETE'){db[entity]=rows.filter(x=>x!==row);return {ok:true};}
            const updates=pick(data,editable[entity]||[]);validateData(db,entity,user,updates);Object.assign(row,updates,{updated_date:now()});return entity==='User'?publicUser(row,true):row;
          }
          if(req.method==='DELETE'&&!id){const query=data.filter||{};db[entity]=rows.filter(row=>!(writable(entity,row,user)&&matches(row,query)));return {ok:true};}
          fail('Not found',404);
        }));
      }
      if(path.startsWith('/api/'))fail('Not found',404);
      if(!['GET','HEAD'].includes(req.method))fail('Method not allowed',405);
      if(/^\/uploads\/[a-f0-9]+\.(png|jpg|gif|webp)$/.test(path))return await serveFile(res,join(dataDirectory,'uploads'),path.replace('/uploads',''));
      if(path.startsWith('/uploads/'))fail('Not found',404);
      if(path.startsWith('/samples/'))return await serveFile(res,publicDirectory,path);
      return await serveFile(res,distDirectory,path === '/' ? '/index.html' : path,true);
    } catch(error) {if(!res.headersSent)send(res,{error:error.status?error.message:'Something went wrong. Please try again.'},error.status||500);else res.end();if(!error.status)console.error(error.message);}
  });
  return server;
}
