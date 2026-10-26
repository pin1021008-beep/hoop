# 籃球練等王 3D

籃球主題的 3D 練等 RPG，手機、電腦都能玩：https://pin1021008-beep.github.io/hoop/

- `src/game.html`：遊戲本體（和 Claude artifact 版同一份）
- `build.py`：產生 GitHub Pages 用的 `index.html`（加上 Firebase）
- `fb-shim.js`：用 Firebase Realtime Database 做排行榜、雲端存檔、多人連線
- `firebase-config.js`：Firebase 專案設定
- `database.rules.json`：Firebase 資料庫安全規則
