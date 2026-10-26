#!/usr/bin/env python3
"""把 src/game.html（Claude artifact 版）轉成 GitHub Pages 版 index.html：加上 Supabase 和 sb-shim，改掉 Claude 專用的提示文字。"""
import sys,hashlib
hv=lambda f:hashlib.md5(open(f,'rb').read()).hexdigest()[:8]
src=open('src/game.html',encoding='utf-8').read()
TAG='<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>'
assert src.count(TAG)==1,'three.js tag not found'
inj="<script>\n// 診斷：畫面出錯時把錯誤訊息顯示在畫面上，方便截圖回報\n(function(){const box=()=>{let d=document.getElementById('hgErr');if(!d){d=document.createElement('div');d.id='hgErr';d.style.cssText='position:fixed;left:8px;right:8px;bottom:8px;z-index:99;background:#300c;color:#fff;font:12px/1.4 monospace;padding:8px 10px;border-radius:8px;border:1px solid #f66;max-height:40vh;overflow:auto;white-space:pre-wrap';(document.body||document.documentElement).appendChild(d)}return d};\n const seen=new Set();const show=m=>{m=String(m).slice(0,300);if(seen.has(m)||seen.size>6)return;seen.add(m);const d=box();d.textContent+=(d.textContent?'\\n':'')+'⚠ '+m+'\\n（請截圖給 Claude）'};\n window.addEventListener('error',e=>show((e.message||'error')+(e.filename?' @'+e.filename.split('/').pop()+':'+e.lineno:'')));\n window.addEventListener('unhandledrejection',e=>{const r=e.reason;if(r&&/supabase|fetch|network|Failed to fetch|Load failed/i.test(String(r&&r.message||r)))return;show('promise: '+(r&&r.message||r))});\n document.addEventListener('webglcontextlost',e=>show('3D 畫面被瀏覽器停掉了（記憶體不足）。請關掉其他分頁後重新整理。'),true);\n window.addEventListener('load',()=>{setTimeout(()=>{try{const c=document.createElement('canvas');if(!(c.getContext('webgl2')||c.getContext('webgl')))show('這個瀏覽器目前無法使用 3D（WebGL）。請關掉其他分頁、或換 Safari/Chrome 重新打開。')}catch(e){}},500)})})();\n</script>"+'\n'+TAG+'\n<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.3/dist/umd/supabase.js"></script>'+f'\n<script src="sb-config.js?v={hv("sb-config.js")}"></script>\n<script src="sb-shim.js?v={hv("sb-shim.js")}"></script>'
out=src.replace(TAG,inj)
T0='<title>籃球練等王 3D</title>'
assert out.count(T0)==1 and out.count('</head>')==1
out=out.replace('</head>',T0+'\n'+'<meta name="description" content="3D 籃球練等遊戲：打怪練等、學傳奇球星絕招、灌籃鬥牛、地下城、連線排行榜。手機點開就能玩，免下載。">\n<meta property="og:type" content="website">\n<meta property="og:title" content="籃球練等王 3D">\n<meta property="og:description" content="打怪練等・灌籃鬥牛・連線排行榜｜手機點開就能玩，免下載">\n<meta property="og:url" content="https://pin1021008-beep.github.io/hoop/">\n<meta property="og:image" content="https://pin1021008-beep.github.io/hoop/og.jpg">\n<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">\n<meta name="twitter:card" content="summary_large_image">\n<link rel="apple-touch-icon" href="icon.png"><link rel="icon" href="icon.png">\n<meta name="apple-mobile-web-app-title" content="籃球練等王">\n</head>',1)
# HIDE_SC: GitHub 版每個人都自動上榜，不需要成績碼
for a,b in [
  ("""h+='<p class="sm">多人連線是 Claude 平台的規定：只有遊戲擁有者本人，或擁有者用 email 邀請、而且已登入 Claude 的人才能連線（受邀的人能不能連，由平台決定）。用公開連結打開的朋友沒辦法連線，只能自己玩、跟電腦鬥牛。另外要打開<b>同一個連結</b>、<b>同一時間</b>在線上才看得到彼此。</p>';""","""h+='<p class="sm">大家要<b>同一時間</b>在線上才看得到彼此。如果一直顯示無法連線，請確認網路後重新整理。</p>';"""),
  ("這台裝置目前無法連線：用公開連結打開的人不能連線單挑","目前連不上伺服器，請確認網路後再試"),
  ("""<p class="hint" style="text-align:left">這是 Claude 平台的規定：只有遊戲擁有者本人，或擁有者用 email 邀請、而且已登入 Claude 的人才能連線；用公開連結打開的朋友不能連線。兩個人還要打開同一個連結。</p>""","""<p class="hint" style="text-align:left">請確認網路後重新整理再試。</p>"""),
  (""" {v:'2026-10-26',t:'修正說明：多人連線和連線單挑只有遊戲擁有者本人和受邀登入的人能用，用公開連結打開的朋友沒辦法連線。現在左上角會顯示「多人：無法連線」，點開會說明原因，鬥牛大叔那邊的說明也改正確了。'},\n""",""" {v:'2026-10-26',t:'新增「邀請朋友」：在開始畫面或選單「排行」按分享，朋友用你的連結進來送 5,000 金幣，他升到 Lv5 你也拿獎勵！'},\n"""),
  ("if(LB.off||!LB.db||LB.noWrite)h+=`<div class=\"it\"><div class=\"tx\"><b>成績碼</b>","if(false)h+=`<div class=\"it\"><div class=\"tx\"><b>成績碼</b>"),
  ('排行榜要在 Claude 裡開啟、並登入帳號才看得到。','排行榜連線中…如果一直沒出現，請確認網路後重新整理。'),
  ('這個裝置目前無法連線（需要登入，且由遊戲擁有者邀請）','目前連不上伺服器，請確認網路後再試'),
]:
  out=out.replace(a,b)
open('index.html','w',encoding='utf-8').write(out)
print('index.html built',len(out))
