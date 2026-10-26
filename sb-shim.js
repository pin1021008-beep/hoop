// Supabase 版的 window.claude.use：讓同一份遊戲程式在 GitHub Pages 上用 Supabase 做排行榜、雲端存檔和多人連線。
// 只實作遊戲用到的 API：user.id / isOwner、db.collection().doc().get/set、collection().limit().onSnapshot、db.doc().set、
// room.presence / onPeers / onConnection / join / leave（用 Supabase Realtime 的 presence）。
(function(){
  const cfg=window.SB_CONFIG;
  if(window.claude||!cfg||!cfg.url||!cfg.key)return;
  if(!window.supabase){window.addEventListener('load',()=>{try{window.dispatchEvent(new ErrorEvent('error',{message:'線上功能沒載入：supabase 程式庫下載失敗（可能被網路或 App 內建瀏覽器擋住）'}))}catch(x){}});return}
  let sb;try{sb=window.supabase.createClient(cfg.url,cfg.key,{auth:{persistSession:false,autoRefreshToken:false}})}catch(e){console.warn('supabase init',e);return}
  const report=(w,e)=>{const m='線上功能連線失敗（'+w+'）：'+(e&&(e.message||e.msg||e.error_description||e.code)||e);window.HG_ONLINE_ERR=m;console.warn(m,e);try{window.dispatchEvent(new ErrorEvent('error',{message:m}))}catch(x){}};
  // 身分：不登入，每台裝置自己產生 id + 密鑰（存在 localStorage），寫入一律透過資料庫函式驗證密鑰
  const ident=(()=>{let o=null;try{o=JSON.parse(localStorage.getItem('hgId')||'null')}catch(e){}
    if(!o||!o.id||!o.s){const hex=n=>Array.from(crypto.getRandomValues(new Uint8Array(n)),b=>b.toString(16).padStart(2,'0')).join('');
      const u=crypto.randomUUID?crypto.randomUUID():hex(4)+'-'+hex(2)+'-4'+hex(2).slice(1)+'-a'+hex(2).slice(1)+'-'+hex(6);o={id:u,s:hex(24)};try{localStorage.setItem('hgId',JSON.stringify(o))}catch(e){}}return o})();
  const ready=Promise.resolve(ident.id);
  // 路徑對應：data/users/<id>/save → saves 表；board/<id> → board 表。內容存成 JSON 字串（欄位 j）。
  const target=p=>{let m=/^data\/users\/([^/]+)\/save$/.exec(p);if(m)return{tb:'saves',id:m[1]};m=/^board\/([^/]+)$/.exec(p);return m?{tb:'board',id:m[1]}:null};
  const boardSubs=new Set();let boardLimit=500,boardTimer=null;
  async function loadBoard(){const {data,error}=await sb.from('board').select('id,j').order('t',{ascending:false}).limit(boardLimit);
    if(error){report('排行榜',error);boardSubs.forEach(s=>s.err&&s.err(error));return}
    const docs=[];for(const r of data||[]){let d=null;try{d=JSON.parse(r.j)}catch(e){}if(d)docs.push({id:r.id,exists:true,data:()=>d})}
    boardSubs.forEach(s=>s.cb({docs}))}
  const docRef=p=>{const tg=target(p);return{
    get:async()=>{if(!tg)return{exists:false,data:()=>null};let j=null;
      if(tg.tb==='saves'){const {data,error}=await sb.rpc('hg_get_save',{p_id:ident.id,p_secret:ident.s});if(error){report('讀取存檔',error);throw error}j=data}
      else{const {data,error}=await sb.from(tg.tb).select('j').eq('id',tg.id).maybeSingle();if(error)throw error;j=data&&data.j}
      let d=null;try{d=j?JSON.parse(j):null}catch(e){}return{exists:!!d,id:tg.id,data:()=>d}},
    set:async obj=>{if(!tg)throw new Error('bad path');if(tg.id!==ident.id)throw new Error('not owner');const {error}=await sb.rpc('hg_put',{p_tb:tg.tb,p_id:ident.id,p_secret:ident.s,p_j:JSON.stringify(obj)});if(error){report('寫入'+tg.tb,error);throw error}
      if(tg.tb==='board')setTimeout(loadBoard,300)}}};
  const dbApi={doc:p=>docRef(p),collection:c=>({doc:id=>docRef(c+'/'+id),limit:n=>({onSnapshot:(cb,err)=>{if(c!=='board'){if(err)err(new Error('unsupported'));return()=>{}}
    boardLimit=n;const s={cb,err};boardSubs.add(s);loadBoard();if(!boardTimer)boardTimer=setInterval(loadBoard,30000);return()=>boardSubs.delete(s)}})})};
  function makeRoom(name,uid){
    const lobby=name==='lobby',ch=sb.channel('hoop-'+name,{config:{presence:{key:uid}}});
    let last=null,lastSent=0,timer=null,subscribed=false,left=false;const peerCbs=[],connCbs=[];
    const peers=()=>{const st=ch.presenceState(),out=[];for(const k in st){if(k===uid)continue;const arr=st[k];const m=arr&&arr[arr.length-1];
      let pr=null;try{pr=m&&typeof m.p==='string'?JSON.parse(m.p):null}catch(e){}if(pr)out.push({peer:k,kind:'viewer',sameTab:false,presence:pr})}return out};
    const emit=()=>{const ps=peers();peerCbs.forEach(f=>{try{f({peers:ps})}catch(e){}})};
    ch.on('presence',{event:'sync'},emit);
    ch.subscribe(st=>{subscribed=st==='SUBSCRIBED';connCbs.forEach(f=>f(subscribed));if(subscribed&&last!=null)send()});
    const send=()=>{if(left||!subscribed||last==null)return Promise.resolve();lastSent=Date.now();return ch.track({p:last}).catch(()=>{})};
    return{
      presence(p){if(left)return Promise.resolve();last=JSON.stringify(p);const gap=lobby?330:100,wait=gap-(Date.now()-lastSent);
        if(wait<=0){clearTimeout(timer);timer=null;return send()}
        if(!timer)timer=setTimeout(()=>{timer=null;send()},wait);return Promise.resolve()},
      onPeers(cb,err){peerCbs.push(cb);setTimeout(()=>cb({peers:peers()}),0);return()=>{const i=peerCbs.indexOf(cb);if(i>=0)peerCbs.splice(i,1)}},
      onConnection(cb){connCbs.push(cb);cb(subscribed)},
      async join(n){const id=await ready;if(!id)throw new Error('no auth');return makeRoom(String(n).replace(/[^a-z0-9-]/gi,'').slice(0,32),id)},
      async leave(){left=true;clearTimeout(timer);try{await ch.untrack()}catch(e){}try{await sb.removeChannel(ch)}catch(e){}}}}
  let lobbyRoom=null;
  window.claude={use:async name=>{const uid=await ready;if(!uid)return null;
    if(name==='user')return{id:async()=>uid,isOwner:async()=>false,canEdit:async()=>false};
    if(name==='db')return dbApi;
    if(name==='room'){if(!lobbyRoom)lobbyRoom=makeRoom('lobby',uid);return lobbyRoom}
    return null}};
  window.HG_ONLINE='supabase';
})();
