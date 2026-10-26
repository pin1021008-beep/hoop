#!/usr/bin/env python3
"""把 src/game.html（Claude artifact 版）轉成 GitHub Pages 版 index.html：加上 Firebase 和 fb-shim，改掉 Claude 專用的提示文字。"""
import sys
src=open('src/game.html',encoding='utf-8').read()
TAG='<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>'
assert src.count(TAG)==1,'three.js tag not found'
FB='10.12.2'
inj=TAG+''.join(f'\n<script src="https://www.gstatic.com/firebasejs/{FB}/firebase-{m}-compat.js"></script>' for m in ('app','auth','database'))+'\n<script src="firebase-config.js"></script>\n<script src="fb-shim.js"></script>'
out=src.replace(TAG,inj)
for a,b in [
  ('排行榜要在 Claude 裡開啟、並登入帳號才看得到。','排行榜連線中…如果一直沒出現，請確認網路後重新整理。'),
  ('這個裝置目前無法連線（需要登入，且由遊戲擁有者邀請）','目前連不上伺服器，請確認網路後再試'),
]:
  out=out.replace(a,b)
open('index.html','w',encoding='utf-8').write(out)
print('index.html built',len(out))
