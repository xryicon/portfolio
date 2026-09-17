const enc = new TextEncoder();
const reply = (status, data, headers = {}) => new Response(JSON.stringify(data), {status, headers: {'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}});
const equal = (a,b) => {let x=enc.encode(a),y=enc.encode(b),d=x.length^y.length;for(let i=0;i<Math.max(x.length,y.length);i++) d|=(x[i]||0)^(y[i]||0);return d===0};
async function digest(s){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(s)))].map(x=>x.toString(16).padStart(2,'0')).join('')}
async function sign(s,key){const k=await crypto.subtle.importKey('raw',enc.encode(key),{name:'HMAC',hash:'SHA-256'},false,['sign']);return [...new Uint8Array(await crypto.subtle.sign('HMAC',k,enc.encode(s)))].map(x=>x.toString(16).padStart(2,'0')).join('')}
async function authorized(req,env){
  if(!env.ADMIN_SESSION_SECRET)return false;
  const value=req.headers.get('Cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith('rynden_admin='))?.slice(13);
  const m=/^(\d{10,13})\.([a-f0-9]{64})$/.exec(value||'');
  return !!m&&Number(m[1])>Date.now()/1000&&equal(m[2],await sign(m[1],env.ADMIN_SESSION_SECRET));
}
async function contact(req,env,url){
  const origin=req.headers.get('Origin');
  const allowed=origin===url.origin||origin==='https://www.ryndendesigns.es'||origin==='https://ryndendesigns.es';
  const cors=origin&&origin!==url.origin&&allowed?{'Access-Control-Allow-Origin':origin,Vary:'Origin'}:{};
  const send=(status,data)=>reply(status,data,cors);
  if(req.method==='OPTIONS'){
    if(!allowed)return reply(403,{error:'Invalid origin'});
    return new Response(null,{status:204,headers:{...cors,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Access-Control-Max-Age':'600'}});
  }
  if(req.method!=='POST')return send(405,{error:'Method not allowed'});
  if(origin&&!allowed)return reply(403,{error:'Invalid origin'});
  if(!req.headers.get('Content-Type')?.startsWith('application/json'))return send(415,{error:'Expected JSON'});
  if(Number(req.headers.get('Content-Length')||0)>8192)return send(413,{error:'Message too large'});
  let d;try{const raw=await req.text();if(raw.length>8192)return send(413,{error:'Message too large'});d=JSON.parse(raw)}catch{return send(400,{error:'Invalid request'})}
  if(d.website)return send(200,{ok:true});
  const name=String(d.name||'').trim(),email=String(d.email||'').trim(),message=String(d.message||'').trim();
  if(!name||name.length>120||/[\r\n]/.test(name)||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||message.length<20||message.length>5000)return send(400,{error:'Please check your details'});
  const {success}=await env.CONTACT_RATE_LIMIT.limit({key:req.headers.get('CF-Connecting-IP')||'unknown'});
  if(!success)return send(429,{error:'Please wait before sending another message'});
  if(!env.SUPABASE_URL||!env.SUPABASE_SECRET_KEY)return send(503,{error:'Contact service unavailable'});
  try{
    const res=await fetch(new URL('/rest/v1/contact_enquiries',env.SUPABASE_URL),{method:'POST',headers:{apikey:env.SUPABASE_SECRET_KEY,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify({name,email,message})});
    if(!res.ok){console.error('Supabase insert failed',res.status);return send(502,{error:'Contact service unavailable'})}
    return send(201,{ok:true});
  }catch{return send(502,{error:'Contact service unavailable'})}
}
async function admin(req,env,url){
  if(url.pathname==='/api/admin/login'){
    if(req.method!=='POST')return reply(405,{error:'Method not allowed'});
    if(req.headers.get('Origin')!==url.origin)return reply(403,{error:'Invalid origin'});
    if(!req.headers.get('Content-Type')?.startsWith('application/json'))return reply(415,{error:'Expected JSON'});
    if(Number(req.headers.get('Content-Length')||0)>1024)return reply(413,{error:'Request too large'});
    const {success}=await env.ADMIN_RATE_LIMIT.limit({key:req.headers.get('CF-Connecting-IP')||'unknown'});
    if(!success)return reply(429,{error:'Too many attempts. Please try again in a minute.'});
    if(!env.ADMIN_PASSWORD_HASH||!env.ADMIN_SESSION_SECRET)return reply(503,{error:'Admin login unavailable'});
    let password;try{const raw=await req.text();if(raw.length>1024)return reply(413,{error:'Request too large'});password=JSON.parse(raw).password}catch{return reply(400,{error:'Invalid request'})}
    if(typeof password!=='string'||password.length>256||!equal(await digest(password),env.ADMIN_PASSWORD_HASH))return reply(401,{error:'Incorrect password'});
    const expires=String(Math.floor(Date.now()/1000)+28800),token=expires+'.'+await sign(expires,env.ADMIN_SESSION_SECRET);
    return reply(200,{ok:true},{'Set-Cookie':'rynden_admin='+token+'; HttpOnly; Secure; SameSite=Strict; Path=/api/admin; Max-Age=28800'});
  }
  if(url.pathname==='/api/admin/logout'){
    if(req.method!=='POST')return reply(405,{error:'Method not allowed'});
    if(req.headers.get('Origin')!==url.origin)return reply(403,{error:'Invalid origin'});
    return reply(200,{ok:true},{'Set-Cookie':'rynden_admin=; HttpOnly; Secure; SameSite=Strict; Path=/api/admin; Max-Age=0'});
  }
  if(url.pathname!=='/api/admin/enquiries')return reply(404,{error:'Not found'});
  if(req.method!=='GET')return reply(405,{error:'Method not allowed'});
  if(!await authorized(req,env))return reply(401,{error:'Sign in to view enquiries'});
  if(!env.SUPABASE_URL||!env.SUPABASE_SECRET_KEY)return reply(503,{error:'Inbox unavailable'});
  const page=Number(url.searchParams.get('page')||1);
  if(!Number.isSafeInteger(page)||page<1||page>1000)return reply(400,{error:'Invalid page'});
  const endpoint=new URL('/rest/v1/contact_enquiries',env.SUPABASE_URL);
  endpoint.searchParams.set('select','id,name,email,message,created_at');
  endpoint.searchParams.set('order','created_at.desc');
  endpoint.searchParams.set('limit','51');
  endpoint.searchParams.set('offset',String((page-1)*50));
  try{
    const res=await fetch(endpoint,{headers:{apikey:env.SUPABASE_SECRET_KEY,Accept:'application/json'}});
    if(!res.ok){console.error('Supabase inbox read failed',res.status);return reply(502,{error:'Inbox unavailable'})}
    const rows=await res.json();
    if(!Array.isArray(rows))return reply(502,{error:'Inbox unavailable'});
    return reply(200,{enquiries:rows.slice(0,50),hasMore:rows.length>50,page});
  }catch{return reply(502,{error:'Inbox unavailable'})}
}
export default {async fetch(req,env){
  const url=new URL(req.url);
  if(url.pathname==='/api/contact')return contact(req,env,url);
  if(url.pathname.startsWith('/api/admin/'))return admin(req,env,url);
  if(url.pathname==='/admin'||url.pathname==='/admin/'){
    const res=await env.ASSETS.fetch(new Request(new URL('/admin',url),req));
    const headers=new Headers(res.headers);headers.set('Cache-Control','no-store');headers.set('X-Robots-Tag','noindex, nofollow');
    return new Response(res.body,{status:res.status,headers});
  }
  return env.ASSETS.fetch(req);
}};
