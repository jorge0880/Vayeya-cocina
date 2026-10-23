const http=require('http'),fs=require('fs'),{WebSocketServer}=require('ws');
const RC={pizza:['masa:k','tomate:p','queso:p'],hamburguesa:['pan:c','carne:k','lechuga:p'],ensalada:['lechuga:p','tomate:p'],pollo:['pollo:k','papa:k'],sandwich:['pan:c','queso:p','tomate:p'],papasqueso:['papa:k','queso:p'],pizzacarne:['masa:k','queso:p','carne:k'],taco:['pan:c','pollo:k','lechuga:p']};
const OK=Object.values(RC).flat(),PROC={tabla:['tomate','queso','lechuga'],plancha:['carne','pollo'],freidora:['papa'],horno:['masa']},KEYS=Object.keys(RC);
const CR=['masa','tomate','queso','carne','pan','lechuga','pollo','papa'],COL=['#e33','#36e','#2a4','#c3c'];
const lay=md=>{const L=CR.map((a,i)=>({k:'caja',a,x:55+i*98,y:40}));
 [['tabla',120],['tabla',240],['plancha',360],['plancha',480],['freidora',600],['horno',720]].forEach(([k,x])=>L.push({k,x,y:250}));
 (md=='b'?[['armar',90],['armar',200],['basura',310],['bandeja',440,'ensalada'],['bandeja',570,'papasqueso'],['bandeja',700,'sandwich']]:[['armar',100],['armar',220],['mesa',340],['mesa',460],['basura',580],['entrega',720]]).forEach(([k,x,a])=>L.push({k,x,y:435,a}));return L};
const R={},fresh=rm=>rm.ST.map(()=>({l:[],n:0})),tx=(w,m)=>w.readyState==1&&w.send(m);
const srv=http.createServer((q,r)=>{r.setHeader('Content-Type','text/html; charset=utf-8');r.end(fs.readFileSync(__dirname+'/index.html'))});
const wss=new WebSocketServer({server:srv});
const reset=(rm,md)=>{rm.md=md;rm.ST=lay(md);rm.st=fresh(rm);rm.o=[];rm.sc=0;rm.t=180;rm.nx=md=='b'?Date.now()+15000:0;rm.ph=1;
 Object.values(rm.pl).forEach((p,i)=>{p.x=300+i*60;p.y=150;p.h=null;p.m=[0,0];tx(p.ws,JSON.stringify({w:{id:p.id,st:rm.ST}}))})};
const upd=(s,k,now)=>{if(!s.b)return;const a=(now-s.t0)/1000,t=s.b.split(':')[0];s.pr=Math.min(1,a/(k=='tabla'?2.5:9));s.it=t+(k=='tabla'?(a>=2.5?':p':':c'):a>=9?':q':a>=4?':k':':c')};
function act(rm,p,now){
 let b=0,bd=1e9;rm.ST.forEach((d,i)=>{const e=(d.x-p.x)**2+(d.y-p.y)**2;if(e<bd){bd=e;b=i}});
 if(bd>6400)return;
 const d=rm.ST[b],s=rm.st[b],h=p.h;
 if(d.k=='caja'){if(!h)p.h=d.a+':c'}
 else if(d.k=='basura')p.h=null;
 else if(d.k=='entrega'){if(h&&h.startsWith('plato:')){const i=rm.o.findIndex(o=>o.r==h.slice(6));if(i>=0){rm.sc+=10+Math.round(rm.o[i].p/6);rm.o.splice(i,1);p.h=null;rm.ev.push('ok')}else rm.ev.push('bad')}}
 else if(d.k=='bandeja'){if(h=='plato:'+d.a&&s.n<2){s.n+=3;p.h=null;rm.ev.push('ok')}else if(h&&h.startsWith('plato:'))rm.ev.push('bad')}
 else if(d.k=='armar'){
  if(h&&!s.d&&s.l.length<3&&OK.includes(h)){s.l.push(h);p.h=null;for(const r in RC)if(RC[r].length==s.l.length&&RC[r].every(i=>s.l.includes(i))){s.l=[];s.d='plato:'+r}}
  else if(!h){if(s.d){p.h=s.d;s.d=null}else if(s.l.length)p.h=s.l.pop()}}
 else if(d.k=='mesa'){if(h&&!s.it){s.it=h;p.h=null}else if(!h&&s.it){p.h=s.it;s.it=null}}
 else if(h&&!s.b&&h.endsWith(':c')&&PROC[d.k].includes(h.split(':')[0])){s.b=h;s.t0=now;s.it=h;s.bq=0;p.h=null}
 else if(!h&&s.b){upd(s,d.k,now);p.h=s.it;s.b=s.it=null;s.pr=0}
 if(p.h!==h)rm.ev.push('pop')
}
setInterval(()=>{const now=Date.now(),dt=.05;for(const c in R){const rm=R[c];
 if(rm.ph==1){rm.t-=dt;
  for(const p of Object.values(rm.pl)){p.x=Math.max(20,Math.min(780,p.x+p.m[0]*140*dt));p.y=Math.max(20,Math.min(480,p.y+p.m[1]*140*dt))}
  rm.ST.forEach((d,i)=>{const s=rm.st[i];if(s.b){upd(s,d.k,now);if(s.it.endsWith(':q')&&!s.bq){s.bq=1;rm.ev.push('burn')}}});
  if(rm.md=='b'){if(now>rm.nx){const f=rm.st.filter(s=>s.n>0);if(f.length){f[Math.random()*f.length|0].n--;rm.sc+=8;rm.ev.push('ok')}else{rm.sc=Math.max(0,rm.sc-5);rm.ev.push('bad')}rm.nx=now+4500+Math.random()*3000}}
  else{if(now>rm.nx&&rm.o.length<Math.min(5,2+Object.keys(rm.pl).length)){rm.o.push({r:KEYS[Math.random()*KEYS.length|0],p:60});rm.nx=now+9000+Math.random()*5000}
   rm.o.forEach(o=>o.p-=dt);const n=rm.o.length;rm.o=rm.o.filter(o=>o.p>0);if(n>rm.o.length){rm.sc=Math.max(0,rm.sc-5*(n-rm.o.length));rm.ev.push('bad')}}
  if(rm.t<=0)rm.ph=2}
 const msg=JSON.stringify({ph:rm.ph,md:rm.md,sc:rm.sc,t:Math.max(0,rm.t),o:rm.o,ev:rm.ev,p:Object.values(rm.pl).map(p=>[p.id,p.x|0,p.y|0,p.h,p.n,p.c]),s:rm.st.map(s=>[s.it||null,s.l,s.d||null,s.n,s.b?s.pr:0])});
 rm.ev=[];Object.values(rm.pl).forEach(p=>tx(p.ws,msg))}},50);
let uid=0;
wss.on('connection',ws=>{let rm,p;
 ws.on('message',raw=>{let d;try{d=JSON.parse(raw)}catch{return}
  if(d.j&&!rm){const c=String(d.j).slice(0,12).toLowerCase();let r=R[c];if(!r){r=R[c]={pl:{},o:[],sc:0,t:180,ph:0,nx:0,ev:[],md:'p',ST:lay('p')};r.st=fresh(r)}
   if(Object.keys(r.pl).length>=4||r.ph==1){tx(ws,JSON.stringify({e:r.ph==1?'La partida ya empezó, prueba otro código':'Sala llena (máx. 4)'}));return}
   rm=r;const id=++uid;p=rm.pl[id]={id,ws,n:String(d.n||'Chef').slice(0,10),c:COL.find(c=>!Object.values(rm.pl).some(q=>q.c==c)),x:300,y:150,h:null,m:[0,0]};
   tx(ws,JSON.stringify({w:{id,st:rm.ST}}))}
  else if(p){if(Array.isArray(d.m)){let x=+d.m[0]||0,y=+d.m[1]||0;const l=Math.hypot(x,y);if(l>1){x/=l;y/=l}p.m=[x,y]}
   if(d.a&&rm.ph==1)act(rm,p,Date.now());
   if(d.go&&rm.ph!=1)reset(rm,d.md=='b'?'b':'p')}});
 ws.on('close',()=>{if(rm&&p){delete rm.pl[p.id];if(!Object.keys(rm.pl).length)for(const c in R)if(R[c]==rm)delete R[c]}})});
srv.listen(process.env.PORT||3000,()=>console.log('Vayeya Cocina en puerto',process.env.PORT||3000));
