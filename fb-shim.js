// Firebase 版的 window.claude.use：讓同一份遊戲程式在 GitHub Pages 上用 Firebase 做排行榜、雲端存檔和多人連線。
// 只實作遊戲用到的那一小部分 API（user.id / isOwner、db.collection().doc().get/set、collection().limit().onSnapshot、db.doc().set、room.presence / onPeers / onConnection / join / leave）。
(function(){
  const cfg=window.FB_CONFIG;
  if(window.claude||!cfg||!window.firebase)return;
  let app,auth,rtdb;
  try{app=firebase.initializeApp(cfg);auth=firebase.auth();rtdb=firebase.database()}catch(e){console.warn('firebase init',e);return}
  const ready=new Promise(res=>{let done=false;
    auth.onAuthStateChanged(u=>{if(u&&!done){done=true;res(u.uid)}});
    auth.signInAnonymously().catch(e=>{console.warn('anon auth',e);if(!done){done=true;res(null)}})});
  let offset=0;rtdb.ref('.info/serverTimeOffset').on('value',s=>{offset=s.val()||0});
  const now=()=>Date.now()+offset;
  const TS=firebase.database.ServerValue.TIMESTAMP;
  // 路徑對應：data/users/<id>/save → saves/<id>；其他（board/<id>）照原樣。資料一律存成 JSON 字串，避免 Realtime Database 吃掉空陣列/空物件。
  const mapPath=p=>{const m=/^data\/users\/([^/]+)\/save$/.exec(p);return m?'saves/'+m[1]:p};
  const docRef=p=>{const r=rtdb.ref(mapPath(p));return{
    get:async()=>{const s=await r.get();const v=s.val();let d=null;try{d=v&&typeof v.j==='string'?JSON.parse(v.j):null}catch(e){}return{exists:!!d,id:s.key,data:()=>d}},
    set:async obj=>{await r.set({j:JSON.stringify(obj),t:TS})}}};
  const dbApi={
    doc:p=>docRef(p),
    collection:c=>({doc:id=>docRef(c+'/'+id),limit:n=>({onSnapshot:(cb,err)=>{const q=rtdb.ref(c).limitToLast(n);
      q.on('value',s=>{const docs=[];s.forEach(ch=>{let d=null;try{const v=ch.val();d=v&&typeof v.j==='string'?JSON.parse(v.j):null}catch(e){}
        if(d)docs.push({id:ch.key,exists:true,data:()=>d})});cb({docs})},e=>{if(err)err(e)});return()=>q.off()}})})};
  function makeRoom(name,uid){
    const base=rtdb.ref('rooms/'+name),me=base.child(uid),lobby=name==='lobby';
    let last=null,lastSent=0,timer=null,beat=null,left=false;const subs=[];
    me.onDisconnect().remove();
    const write=()=>{if(left||last==null)return Promise.resolve();lastSent=Date.now();return me.set({p:last,t:TS})};
    beat=setInterval(()=>{if(last!=null&&Date.now()-lastSent>25000)write().catch(()=>{})},5000);
    const R={
      presence(p){if(left)return Promise.resolve();last=JSON.stringify(p);
        const gap=lobby?250:90,wait=gap-(Date.now()-lastSent);
        if(wait<=0){clearTimeout(timer);timer=null;return write()}
        if(!timer)timer=setTimeout(()=>{timer=null;write().catch(()=>{})},wait);return Promise.resolve()},
      onPeers(cb,err){const h=s=>{const peers=[],t0=now()-60000;s.forEach(ch=>{if(ch.key===uid)return;const v=ch.val()||{};if(Number(v.t)<t0)return;
          let pr=null;try{pr=JSON.parse(v.p)}catch(e){}if(pr)peers.push({peer:ch.key,kind:'viewer',sameTab:false,presence:pr})});cb({peers})};
        base.on('value',h,e=>{if(err)err(e)});subs.push(()=>base.off('value',h));return()=>base.off('value',h)},
      onConnection(cb){const r=rtdb.ref('.info/connected'),h=s=>cb(!!s.val());r.on('value',h);subs.push(()=>r.off('value',h))},
      async join(n){const id=await ready;if(!id)throw new Error('no auth');return makeRoom(String(n).replace(/[^a-z0-9-]/gi,'').slice(0,32),id)},
      async leave(){left=true;clearTimeout(timer);clearInterval(beat);subs.forEach(f=>f());try{me.onDisconnect().cancel();await me.remove()}catch(e){}}};
    return R}
  let lobby=null;
  window.claude={use:async name=>{const uid=await ready;if(!uid)return null;
    if(name==='user')return{id:async()=>uid,isOwner:async()=>false,canEdit:async()=>false};
    if(name==='db')return dbApi;
    if(name==='room'){if(!lobby)lobby=makeRoom('lobby',uid);return lobby}
    return null}};
  window.HG_FIREBASE=true;
})();
