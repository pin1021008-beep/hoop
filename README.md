# 籃球練等王 3D

籃球主題的 3D 練等 RPG，手機、電腦都能玩：https://pin1021008-beep.github.io/hoop/

- `src/game.html`：遊戲本體（和 Claude artifact 版同一份）
- `build.py`：產生 GitHub Pages 用的 `index.html`（加上 Supabase）
- `sb-shim.js`：用 Supabase 做排行榜、雲端存檔、多人連線
- `sb-config.js`：Supabase 專案設定
- `og.jpg`、`icon.png`：分享預覽圖與圖示
- `supabase.sql`、`supabase2.sql`：建立資料表、安全規則與免登入的寫入函式
