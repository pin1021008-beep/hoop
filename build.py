#!/usr/bin/env python3
"""把 src/game.html（Claude artifact 版）轉成 GitHub Pages 版 index.html：加上 Supabase 和 sb-shim，改掉 Claude 專用的提示文字。"""
import sys,hashlib
hv=lambda f:hashlib.md5(open(f,'rb').read()).hexdigest()[:8]
src=open('src/game.html',encoding='utf-8').read()
TAG='<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>'
assert src.count(TAG)==1,'three.js tag not found'
inj="<script>\n// 診斷：畫面出錯時把錯誤訊息顯示在畫面上，方便截圖回報\n(function(){const box=()=>{let d=document.getElementById('hgErr');if(!d){d=document.createElement('div');d.id='hgErr';d.style.cssText='position:fixed;left:8px;right:8px;bottom:8px;z-index:99;background:#300c;color:#fff;font:12px/1.4 monospace;padding:8px 10px;border-radius:8px;border:1px solid #f66;max-height:40vh;overflow:auto;white-space:pre-wrap';(document.body||document.documentElement).appendChild(d)}return d};\n const seen=new Set();const show=m=>{m=String(m).slice(0,300);if(seen.has(m)||seen.size>6)return;seen.add(m);const d=box();d.textContent+=(d.textContent?'\\n':'')+'⚠ '+m+'\\n（請截圖給 Claude）'};\n window.addEventListener('error',e=>show((e.message||'error')+(e.filename?' @'+e.filename.split('/').pop()+':'+e.lineno:'')));\n window.addEventListener('unhandledrejection',e=>{const r=e.reason;if(r&&/supabase|fetch|network|Failed to fetch|Load failed/i.test(String(r&&r.message||r)))return;show('promise: '+(r&&r.message||r))});\n document.addEventListener('webglcontextlost',e=>show('3D 畫面被瀏覽器停掉了（記憶體不足）。請關掉其他分頁後重新整理。'),true);\n window.addEventListener('load',()=>{setTimeout(()=>{try{const c=document.createElement('canvas');if(!(c.getContext('webgl2')||c.getContext('webgl')))show('這個瀏覽器目前無法使用 3D（WebGL）。請關掉其他分頁、或換 Safari/Chrome 重新打開。')}catch(e){}},500)})})();\n</script>"+'\n'+TAG+'\n<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.3/dist/umd/supabase.js"></script>'+f'\n<script src="sb-config.js?v={hv("sb-config.js")}"></script>\n<script src="sb-shim.js?v={hv("sb-shim.js")}"></script>'
out=src.replace(TAG,inj)
# HIDE_SC: GitHub 版每個人都自動上榜，不需要成績碼
for a,b in [
  ("if(LB.off||!LB.db||LB.noWrite)h+=`<div class=\"it\"><div class=\"tx\"><b>成績碼</b>","if(false)h+=`<div class=\"it\"><div class=\"tx\"><b>成績碼</b>"),
  ('排行榜要在 Claude 裡開啟、並登入帳號才看得到。','排行榜連線中…如果一直沒出現，請確認網路後重新整理。'),
  ('這個裝置目前無法連線（需要登入，且由遊戲擁有者邀請）','目前連不上伺服器，請確認網路後再試'),
]:
  out=out.replace(a,b)
open('index.html','w',encoding='utf-8').write(out)
print('index.html built',len(out))
