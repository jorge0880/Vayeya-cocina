const http=require('http'),fs=require('fs'),{WebSocketServer}=require('ws');
const RC={pizza:['masa:k','tomate:p','queso:p'],hamburguesa:['pan:c','carne:k','lechuga:p'],ensalada:['lechuga:p','tomate:p'],pollo:['pollo:k','papa:k'],sandwich:['pan:c','queso:p','tomate:p'],papasqueso:['papa:k','queso:p'],pizzacarne:['masa:k','queso:p','carne:k'],taco:['pan:c','pollo:k','lechuga:p']};
const OK=Object.values(RC).flat(),PROC={tabla:['tomate','queso','lechuga'],plancha:['carne','pollo'],freidora:['papa'],horno:['masa']},KEYS=Object.keys(RC);
const CR=['masa','tomate','queso','carne','pan','lechuga','pollo','papa'],COL=['#e33','#36e','#2a4','#c3c'];
const lay=md=>{const L=CR.map((a,i)=>({k:'caja',a,x:60+i*97,y:445}));
 [['tabla',100],['tabla',210],['plancha',330],['plancha',440],['freidora',560],['horno',670]].forEach(([k,x])=>L.push({k,x,y:215}));
 [['armar',150],['armar',270],['mesa',390],['basura',510]].forEach(([k,x])=>L.push({k,x,y:335}));
 (md=='b'?[[180,'ensalada'],[400,'papasqueso'],[620,'sandwich']].map(([x,a])=>({k:'bandeja',x,y:70,a})):[150,330,510,690].map(x=>({k:'cliente',x,y:95}))).forEach(d=>L.push(d));return L};
const R={},fresh=rm=>rm.ST.map(()=>({l:[],n:0})),tx=(w,m)=>w.readyState==1&&w.send(m),EV=(rm,t,x,y)=>rm.ev.push([t,x|0,y|0]);
const srv=http.createServer((q,r)=>{r.setHeader('Content-Type','text/html; charset=utf-8');r.end(fs.readFileSync(__dirname+'/index.html'))});
const wss=new WebSocketServer({server:srv});
const reset=(rm,md)=>{rm.md=md;rm.ST=lay(md);rm.st=fresh(rm);rm.cu=[];rm.cb=0;rm.sc=0;rm.t=180;rm.nx=Date.now()+(md=='b'?15000:2000);rm.ph=1;
 Object.values(rm.pl).forEach((p,i)=>{p.x=300+i*60;p.y=290;p.h=null;p.m=[0,0];tx(p.ws,JSON.stringify({w:{id:p.id,st:rm.ST}}))})};
const pts=(rm,v)=>{rm.cb++;rm.sc+=Math.round(v*(1+Math.min(rm.cb-1,4)*.25))},bad=(rm,v,x,y)=>{rm.cb=0;rm.sc=Math.max(0,rm.sc-v);EV(rm,'bad',x,y)};
const upd=(s,k,now)=>{if(!s.b)return;const a=(now-s.t0)/1000,t=s.b.split(':')[0];s.pr=Math.min(1,a/(k=='tabla'?2.5:9));s.it=t+(k=='tabla'?(a>=2.5?':p':':c'):a>=9?':q':a>=4?':k':':c')};
function act(rm,p,now){
 let b=0,bd=1e9;rm.ST.forEach((d,i)=>{const e=(d.x-p.x)**2+(d.y-p.y)**2;if(e<bd){bd=e;b=i}});
 if(bd>6400)return;
 const d=rm.ST[b],s=rm.st[b],h=p.h;
 if(d.k=='caja'){if(!h)p.h=d.a+':c'}
 else if(d.k=='basura'){if(h)bad(rm,2,d.x,d.y);p.h=null}
 else if(d.k=='cliente'){if(h&&h.startsWith('plato:')){const c=rm.cu.find(c=>c.tb==b&&c.s=='wait'&&c.r==h.slice(6));if(c){pts(rm,10+Math.round(c.p/5));c.s='eat';c.e=3;p.h=null;EV(rm,'ok',d.x,d.y)}else bad(rm,0,d.x,d.y)}}
 else if(d.k=='bandeja'){if(h=='plato:'+d.a&&s.n<2){s.n+=3;p.h=null;EV(rm,'ok',d.x,d.y)}else if(h&&h.startsWith('plato:'))bad(rm,0,d.x,d.y)}
 else if(d.k=='armar'){
  if(h&&!s.d&&s.l.length<3&&OK.includes(h)){s.l.push(h);p.h=null;for(const r in RC)if(RC[r].length==s.l.length&&RC[r].every(i=>s.l.includes(i))){s.l=[];s.d='plato:'+r}}
  else if(!h){if(s.d){p.h=s.d;s.d=null}else if(s.l.length)p.h=s.l.pop()}}
 else if(d.k=='mesa'){if(h&&!s.it){s.it=h;p.h=null}else if(!h&&s.it){p.h=s.it;s.it=null}}
 else if(h&&!s.b&&h.endsWith(':c')&&PROC[d.k].includes(h.split(':')[0])){s.b=h;s.t0=now;s.it=h;s.bq=0;p.h=null}
 else if(!h&&s.b){upd(s,d.k,now);p.h=s.it;s.b=s.it=null;s.pr=0}
 if(p.h!==h)EV(rm,'pop',d.x,d.y)
}
let cid=0;
setInterval(()=>{const now=Date.now(),dt=.05;for(const c in R){const rm=R[c];
 if(rm.ph==1){rm.t-=dt;
  for(const p of Object.values(rm.pl)){p.x=Math.max(20,Math.min(780,p.x+p.m[0]*140*dt));p.y=Math.max(20,Math.min(480,p.y+p.m[1]*140*dt))}
  rm.ST.forEach((d,i)=>{const s=rm.st[i];if(s.b){upd(s,d.k,now);if(s.it.endsWith(':q')&&!s.bq){s.bq=1;bad(rm,3,d.x,d.y);EV(rm,'burn',d.x,d.y)}}});
  if(now>rm.nx){const B=rm.md=='b',ids=rm.ST.map((d,i)=>i).filter(i=>B?rm.ST[i].k=='bandeja':rm.ST[i].k=='cliente'&&!rm.cu.some(c=>c.tb==i));
   if(ids.length){const i=ids[Math.random()*ids.length|0],d=rm.ST[i];rm.cu.push({id:++cid,x:-30,y:B?160:48,tx:d.x,ty:B?160:48,ey:B?160:48,s:'in',tb:i,bd:B,r:KEYS[Math.random()*KEYS.length|0],p:50,k:Math.random()*5|0});}
   rm.nx=now+(B?4500:6000)+Math.random()*3000}
  for(const c of rm.cu){const dx=c.tx-c.x,dy=c.ty-c.y,l=Math.hypot(dx,dy);c.w=l>3?1:0;
   if(l>3){c.x+=dx/l*90*dt;c.y+=dy/l*90*dt}
   else if(c.s=='in'){if(c.bd){const s=rm.st[c.tb];if(s.n>0){s.n--;pts(rm,8);EV(rm,'ok',c.x,c.y)}else{bad(rm,5,c.x,c.y);c.m=1}c.s='out';c.tx=-40}else c.s='wait'}
   else if(c.s=='out')c.del=1;
   if(c.s=='wait'){c.p-=dt;if(c.p<=0){bad(rm,5,c.x,c.y);c.m=1;c.s='out';c.tx=-40;c.ty=c.ey}}
   if(c.s=='eat'){c.e-=dt;if(c.e<=0){c.s='out';c.tx=-40;c.ty=c.ey}}}
  rm.cu=rm.cu.filter(c=>!c.del);
  if(rm.t<=0)rm.ph=2}
 const msg=JSON.stringify({ph:rm.ph,md:rm.md,sc:rm.sc,cb:rm.cb,t:Math.max(0,rm.t),ev:rm.ev,cu:rm.cu.map(c=>[c.id,c.x|0,c.y|0,c.s,c.r,Math.round(c.p),c.k,c.w|0,c.m|0]),p:Object.values(rm.pl).map(p=>[p.id,p.x|0,p.y|0,p.h,p.n,p.c]),s:rm.st.map(s=>[s.it||null,s.l,s.d||null,s.n,s.b?s.pr:0])});
 rm.ev=[];Object.values(rm.pl).forEach(p=>tx(p.ws,msg))}},50);
let uid=0;
wss.on('connection',ws=>{let rm,p;
 ws.on('message',raw=>{let d;try{d=JSON.parse(raw)}catch{return}
  if(d.j&&!rm){const c=String(d.j).slice(0,12).toLowerCase();let r=R[c];if(!r){r=R[c]={pl:{},cu:[],cb:0,sc:0,t:180,ph:0,nx:0,ev:[],md:'p',ST:lay('p')};r.st=fresh(r)}
   if(Object.keys(r.pl).length>=4||r.ph==1){tx(ws,JSON.stringify({e:r.ph==1?'La partida ya empezó, prueba otro código':'Sala llena (máx. 4)'}));return}
   rm=r;const id=++uid;p=rm.pl[id]={id,ws,n:String(d.n||'Chef').slice(0,10),c:COL.find(c=>!Object.values(rm.pl).some(q=>q.c==c)),x:300,y:290,h:null,m:[0,0]};
   tx(ws,JSON.stringify({w:{id,st:rm.ST}}))}
  else if(p){if(Array.isArray(d.m)){let x=+d.m[0]||0,y=+d.m[1]||0;const l=Math.hypot(x,y);if(l>1){x/=l;y/=l}p.m=[x,y]}
   if(d.a&&rm.ph==1)act(rm,p,Date.now());
   if(d.go&&rm.ph!=1)reset(rm,d.md=='b'?'b':'p')}});
 ws.on('close',()=>{if(rm&&p){delete rm.pl[p.id];if(!Object.keys(rm.pl).length)for(const c in R)if(R[c]==rm)delete R[c]}})});
srv.listen(process.env.PORT||3000,()=>console.log('Vayeya Cocina en puerto',process.env.PORT||3000));
