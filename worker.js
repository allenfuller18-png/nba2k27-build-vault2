// Serve static Build Vault assets and recover missing real NBA player portraits.
// No AI-generated images; only known comparison player IDs are accepted.
const PLAYERS={"87":"Dikembe Mutombo","165":"Hakeem Olajuwon","406":"Shaquille O’Neal","431":"Shawn Kemp","717":"Arvydas Sabonis","764":"David Robinson","937":"Scottie Pippen","1112":"Ben Wallace","1495":"Tim Duncan","1890":"Shawn Marion","1905":"Andrei Kirilenko","2548":"Dwyane Wade","76631":"Mark Eaton","77142":"Magic Johnson","101108":"Chris Paul","201142":"Kevin Durant","201188":"Marc Gasol","201933":"Blake Griffin","202331":"Paul George","202681":"Kyrie Irving","202710":"Jimmy Butler","203110":"Draymond Green","203497":"Rudy Gobert","203507":"Giannis Antetokounmpo","203932":"Aaron Gordon","203944":"Julius Randle","203999":"Nikola Jokić","1627732":"Ben Simmons","1627734":"Domantas Sabonis","1627742":"Brandon Ingram","1628369":"Jayson Tatum","1628389":"Bam Adebayo","1628991":"Jaren Jackson Jr.","1629027":"Trae Young","1629029":"Luka Dončić","1629627":"Zion Williamson","1630162":"Anthony Edwards"};
const WIKI_API='https://en.wikipedia.org/w/api.php';
const COMMONS_API='https://commons.wikimedia.org/w/api.php';

async function wikiJson(base,params){
 const url=new URL(base);
 for(const [k,v] of Object.entries(params))url.searchParams.set(k,String(v));
 const res=await fetch(url.toString(),{headers:{'Accept':'application/json','User-Agent':'NBA2K27BuildVault/1.0 (real NBA portrait lookup)'}});
 if(!res.ok)throw Error('Photo catalog lookup failed: '+res.status);
 return res.json();
}
function normalized(t){
 return String(t||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
}
async function wikipediaPhoto(name){
 const data=await wikiJson(WIKI_API,{action:'query',format:'json',redirects:'1',prop:'pageimages',piprop:'thumbnail',pithumbsize:600,titles:name.replace(/[\u2018\u2019]/g,"'")});
 return Object.values(data.query?.pages||{}).find(p=>p.ns===0&&!p.missing&&p.thumbnail?.source)?.thumbnail?.source||'';
}
async function commonsPhoto(name){
 const data=await wikiJson(COMMONS_API,{action:'query',format:'json',generator:'search',gsrnamespace:6,gsrlimit:30,gsrsearch:'"'+name+'" basketball',prop:'imageinfo',iiprop:'url|mime',iiurlwidth:600});
 const words=normalized(name).split(' ').filter(x=>x.length>1);
 const candidates=Object.values(data.query?.pages||{}).filter(p=>{
  const i=p.imageinfo?.[0];
  return words.every(w=>normalized(p.title).includes(w))&&/^image\/(jpeg|png|webp)$/i.test(i?.mime||'')&&
   !/signature|autograph|logo|jersey|poster|card|trophy|arena|sculpture|statue|memorial|grave|drawing|painting|illustration|artwork|politician/i.test(p.title||'')&&
   !!(i.thumburl||i.url);
 });
 candidates.sort((a,b)=>Number(/portrait|headshot|close.up/i.test(b.title))-Number(/portrait|headshot|close.up/i.test(a.title)));
 const i=candidates[0]?.imageinfo?.[0];return i?.thumburl||i?.url||'';
}
async function imageResponse(url){
 if(!url||!url.startsWith('https://'))return null;
 const res=await fetch(url,{redirect:'follow',headers:{'Accept':'image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8'}});
 if(!res.ok||!String(res.headers.get('content-type')||'').toLowerCase().startsWith('image/'))return null;
 if(Number(res.headers.get('content-length')||0)>8000000)return null;
 return res;
}
async function playerPhoto(request,id){
 const name=PLAYERS[id];
 if(!name)return new Response('Unknown player',{status:404});
 const cached=await caches.default.match(request);
 if(cached)return cached;
 let img=null;
 try{img=await imageResponse('https://cdn.nba.com/headshots/nba/latest/1040x760/'+id+'.png')}catch{}
 if(!img){try{img=await imageResponse(await wikipediaPhoto(name))}catch{}}
 if(!img){try{img=await imageResponse(await commonsPhoto(name))}catch{}}
 if(!img)return new Response('Real player photo unavailable',{status:404,headers:{'Cache-Control':'no-store'}});
 const headers=new Headers(img.headers);
 headers.set('Cache-Control','public, max-age=86400');
 headers.delete('set-cookie');
 const result=new Response(img.body,{status:200,headers});
 await caches.default.put(request,result.clone());
 return result;
}
export default {
 async fetch(request,env){
  const u=new URL(request.url);
  const m=u.pathname.match(/^\/player-photo\/(\d+)$/);
  if(m)return playerPhoto(request,m[1]);
  if(!env.ASSETS)return new Response('Static assets binding is not configured.',{status:500});
  return env.ASSETS.fetch(request);
 }
};
