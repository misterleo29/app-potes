// app.js - PotesHub V4 (Polls, Challenges, Group voice WebRTC, admin color, Base64 audio)
// IMPORTANT: replace VAPID_KEY with your Firebase Web Push public key if you use FCM tokens
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, setPersistence, browserLocalPersistence, browserSessionPersistence } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { getDatabase, ref, push, set, update, onValue, get, query, orderByChild, limitToLast, remove } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';
import { getMessaging, getToken, onMessage } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging.js';

const firebaseConfig = {
  apiKey: "AIzaSyDmsgNKyXAckhoHpdRSuZxYgR3DmzXWmd0",
  authDomain: "poteshub-8d37b.firebaseapp.com",
  databaseURL: "https://poteshub-8d37b-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "poteshub-8d37b",
  storageBucket: "poteshub-8d37b.firebasedatabase.app",
  messagingSenderId: "457001877075",
  appId: "1:457001877075:web:1e0d09aec0c02349db10a6"
};

const VAPID_KEY = "BB17qG7_5I5vQUX8Dltmk0_GTbBB9avg-pUR7PMBHPpghVE6yybsle-FDapwWEdd3_xRp-3zMMlWl6ssqH792R0";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
let messaging;
try { messaging = getMessaging(app); } catch(e){ console.warn('messaging init', e); }

let currentUser = null, currentUserData = null, adminUnlocked = false;
let activeRoom = 'general', activeGroupId = null;

// DOM helpers
const $ = id => document.getElementById(id);
const ui = {
  authPage: $('authPage'), mainApp: $('mainApp'),
  loginEmail: $('loginEmail'), loginPassword: $('loginPassword'),
  registerUsername: $('registerUsername'), registerEmail: $('registerEmail'), registerPassword: $('registerPassword'),
  loginForm: $('loginForm'), registerForm: $('registerForm'),
  userName: $('userName'), userAvatar: $('userAvatar'), userMood: $('userMood'),
  logoutBtn: $('logoutBtn'), roomSelect: $('roomSelect'), messagesList: $('messagesList'), messageInput: $('messageInput'), sendBtn: $('sendBtn'),
  btnQuickPlay: $('btnQuickPlay'), btnHelp: $('btnHelp'), btnPoll: $('btnPoll'), btnChallenge: $('btnChallenge'),
  openRecorderBtn: $('openRecorderBtn'), openDictBtn: $('openDictBtn'), btnMood: $('btnMood'), openProfileBtn: $('openProfileBtn'), openAdminBtn: $('openAdminBtn'),
  navChat: $('navChat'), navPolls: $('navPolls'), navChallenges: $('navChallenges'), navAdmin: $('navAdmin'),
  groupsModal: $('groupsModal'), createGroupBtn: $('createGroupBtn'), newGroupName: $('newGroupName'), groupsList: $('groupsList'), activeGroupInfo: $('activeGroupInfo'), inviteUsername: $('inviteUsername'), inviteBtn: $('inviteBtn'), closeGroupsBtn: $('closeGroupsBtn'), openGroupsBtn: $('openGroupsBtn'), startVoiceRoomBtn: $('startVoiceRoomBtn'),
  recModal: $('recModal'), startRecBtn: $('startRecBtn'), stopRecBtn: $('stopRecBtn'), closeRecBtn: $('closeRecBtn'), recStatus: $('recStatus'), recPreview: $('recPreview'),
  pollModal: $('pollModal'), pollQuestion: $('pollQuestion'), pollOptions: $('pollOptions'), createPollBtn: $('createPollBtn'), closePollBtn: $('closePollBtn'), pollsList: $('pollsList'),
  challengeModal: $('challengeModal'), challengeText: $('challengeText'), challengeDuration: $('challengeDuration'), createChallengeBtn: $('createChallengeBtn'), closeChallengeBtn: $('closeChallengeBtn'), challengesList: $('challengesList'),
  profileModal: $('profileModal'), profileName: $('profileName'), profileBio: $('profileBio'), profileEmoji: $('profileEmoji'), saveProfileBtn: $('saveProfileBtn'), closeProfileBtn: $('closeProfileBtn'),
  adminPassModal: $('adminPassModal'), adminPassInput: $('adminPassInput'), adminPassSubmitBtn: $('adminPassSubmitBtn'), adminPassCancelBtn: $('adminPassCancelBtn'),
  adminPanel: $('adminPanel'), admBroadcastBtn: $('admBroadcastBtn'), admNotifBtn: $('admNotifBtn'), admPromoteBtn: $('admPromoteBtn'), admSetColorBtn: $('admSetColorBtn'), admExportUsersBtn: $('admExportUsersBtn'), admClearMessagesBtn: $('admClearMessagesBtn'),
  adminUsersList: $('adminUsersList'), adminMessagesList: $('adminMessagesList'), closeAdminBtn: $('closeAdminBtn'),
  errorMsg: $('errorMsg'), successMsg: $('successMsg'),
  themeColorPreview: $('themeColorPreview'),
  createPollOpenBtn: $('createPollOpenBtn'), createChallengeOpenBtn: $('createChallengeOpenBtn')
};

// events
$('loginBtn').addEventListener('click', login);
$('showRegisterBtn').addEventListener('click', ()=>{ ui.loginForm.classList.add('hidden'); ui.registerForm.classList.remove('hidden'); });
$('showLoginBtn').addEventListener('click', ()=>{ ui.registerForm.classList.add('hidden'); ui.loginForm.classList.remove('hidden'); });
$('registerBtn').addEventListener('click', register);
ui.logoutBtn.addEventListener('click', logout);

ui.sendBtn.addEventListener('click', sendMessage);
ui.messageInput.addEventListener('keydown', e=>{ if(e.key==='Enter') sendMessage(); });

ui.btnQuickPlay.addEventListener('click', ()=> quickMessage('jouer'));
ui.btnHelp.addEventListener('click', ()=> quickMessage('aide'));
ui.btnPoll.addEventListener('click', ()=> openModal('pollModal'));
ui.btnChallenge.addEventListener('click', ()=> openModal('challengeModal'));

ui.openRecorderBtn.addEventListener('click', ()=> openModal('recModal'));
ui.openDictBtn.addEventListener('click', startDictation);
ui.btnMood.addEventListener('click', ()=> { const m = prompt('Ton mood du jour'); if(m) setMood(m); });

ui.createGroupBtn.addEventListener('click', createGroup);
ui.closeGroupsBtn.addEventListener('click', ()=> closeModal('groupsModal'));
ui.openGroupsBtn.addEventListener('click', ()=> { renderGroups(); openModal('groupsModal'); });
ui.inviteBtn.addEventListener('click', inviteToGroup);
ui.startVoiceRoomBtn.addEventListener('click', startVoiceRoom);

ui.startRecBtn.addEventListener('click', startRecording);
ui.stopRecBtn.addEventListener('click', stopRecording);
ui.closeRecBtn.addEventListener('click', ()=> closeModal('recModal'));

ui.createPollOpenBtn.addEventListener('click', ()=> openModal('pollModal'));
ui.createPollBtn.addEventListener('click', createPoll);
ui.closePollBtn.addEventListener('click', ()=> closeModal('pollModal'));

ui.createChallengeOpenBtn.addEventListener('click', ()=> openModal('challengeModal'));
ui.createChallengeBtn.addEventListener('click', createChallenge);
ui.closeChallengeBtn.addEventListener('click', ()=> closeModal('challengeModal'));

ui.openProfileBtn.addEventListener('click', openProfile);
ui.saveProfileBtn.addEventListener('click', saveProfile);
ui.closeProfileBtn.addEventListener('click', ()=> closeModal('profileModal'));

ui.adminPassSubmitBtn.addEventListener('click', submitAdminPass);
ui.adminPassCancelBtn.addEventListener('click', ()=> closeModal('adminPassModal'));
ui.openAdminBtn.addEventListener('click', ()=> openModal('adminPassModal'));

ui.admBroadcastBtn.addEventListener('click', adminBroadcast);
ui.admNotifBtn.addEventListener('click', adminCreateNotificationNode);
ui.admPromoteBtn.addEventListener('click', openPromoteDialog);
ui.admSetColorBtn.addEventListener('click', adminSetColor);
ui.admExportUsersBtn.addEventListener('click', adminExportUsersCSV);
ui.admClearMessagesBtn.addEventListener('click', adminClearMessages);
ui.closeAdminBtn.addEventListener('click', ()=> closeModal('adminPanel'));

ui.navChat.addEventListener('click', ()=> showSection('chat'));
ui.navPolls.addEventListener('click', ()=> showSection('polls'));
ui.navChallenges.addEventListener('click', ()=> showSection('challenges'));

// helpers
function openModal(id){ document.getElementById(id).classList.add('active'); }
function closeModal(id){ document.getElementById(id).classList.remove('active'); }
function showError(msg){ ui.errorMsg.textContent = msg; ui.errorMsg.style.display='block'; setTimeout(()=> ui.errorMsg.style.display='none',5000); }
function showSuccess(msg){ ui.successMsg.textContent = msg; ui.successMsg.style.display='block'; setTimeout(()=> ui.successMsg.style.display='none',3000); }
function escapeHtml(s){ if (s==null) return ''; return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }
function escapeJs(s){ if (!s) return ''; return String(s).replace(/'/g,"\\'").replace(/"/g,'\\"').replace(/\n/g,' '); }

// auth
async function register(){
  const username = ui.registerUsername.value.trim();
  const email = ui.registerEmail.value.trim();
  const password = ui.registerPassword.value;
  if (!username||!email||!password) return showError('Remplis tous les champs');
  try {
    const res = await createUserWithEmailAndPassword(auth, email, password);
    await set(ref(db,'users/'+res.user.uid), { username, email, isAdmin:false, createdAt: Date.now() });
    showSuccess('Compte créé');
    ui.registerForm.classList.add('hidden'); ui.loginForm.classList.remove('hidden');
  } catch(e){ showError(e.message); }
}
async function login(){
  const email = ui.loginEmail.value.trim(); const password = ui.loginPassword.value;
  if(!email||!password) return showError('Email & mot de passe requis');
  try {
    const persistence = document.getElementById('rememberMe')?.checked ? browserLocalPersistence : browserSessionPersistence;
    await setPersistence(auth, persistence);
    await signInWithEmailAndPassword(auth, email, password);
  } catch(e){ showError(e.message); }
}
async function logout(){ try { await signOut(auth); } catch(e){ console.warn(e); } }

// auth state listener
onAuthStateChanged(auth, async user=>{
  if (!user) { currentUser=null; currentUserData=null; ui.authPage.classList.remove('hidden'); ui.mainApp.classList.add('hidden'); return; }
  currentUser = user;
  const snap = await get(ref(db,'users/'+user.uid));
  currentUserData = snap.exists() ? snap.val() : { username:'Utilisateur', isAdmin:false };
  ui.userName.textContent = currentUserData.username || 'Utilisateur';
  ui.userAvatar.textContent = (currentUserData.username||'U')[0].toUpperCase();
  ui.userMood.textContent = currentUserData.mood || '—';
  ui.authPage.classList.add('hidden'); ui.mainApp.classList.remove('hidden');
  if (currentUserData.isAdmin) { ui.openAdminBtn.style.display='inline-block'; ui.navAdmin.style.display='block'; } else { ui.openAdminBtn.style.display='none'; ui.navAdmin.style.display='none'; }
  await loadRooms(); attachMessagesListener(); renderGroups(); loadSettings();
  registerServiceWorkerAndNotifications();
});

// rooms
async function loadRooms(){
  const snap = await get(ref(db,'rooms'));
  const defaultRooms = [{id:'general',name:'Général'},{id:'gaming',name:'Gaming'}];
  const rooms = snap.exists() ? Object.keys(snap.val()).map(k=>({ id:k, name: snap.val()[k].name || k })) : defaultRooms;
  if (!rooms.find(r=>r.id==='general')) rooms.unshift({id:'general',name:'Général'});
  ui.roomSelect.innerHTML = rooms.map(r=>`<option value="${r.id}">${r.name}</option>`).join('');
  ui.roomSelect.value = activeRoom;
  ui.roomSelect.addEventListener('change', ()=> { activeRoom = ui.roomSelect.value; attachMessagesListener(); });
}

// messages
async function sendMessage(){
  if (!currentUser) return showError('Connecte-toi');
  const text = ui.messageInput.value.trim();
  if (!text) return;
  const payload = { text, timestamp: Date.now(), username: currentUserData.username, userId: currentUser.uid, type:'message', room: activeRoom, groupId: activeGroupId || null };
  await push(ref(db,'messages'), payload);
  ui.messageInput.value = '';
  showSuccess('Message envoyé');
}

// listen last 200
function attachMessagesListener(){
  ui.messagesList.innerHTML = '<div style="color:rgba(255,255,255,0.5)">Chargement...</div>';
  const q = query(ref(db,'messages'), orderByChild('timestamp'), limitToLast(200));
  onValue(q, snapshot=>{
    const arr=[];
    snapshot.forEach(ch=>{
      const v = ch.val(); v.id = ch.key;
      if (!v.room) v.room='general';
      if (v.room === activeRoom) arr.push(v);
    });
    arr.sort((a,b)=>a.timestamp-b.timestamp);
    const rendered = arr.filter(m => !m.groupId || m.groupId === activeGroupId).map(m => renderMessage(m)).join('');
    ui.messagesList.innerHTML = rendered;
    ui.messagesList.scrollTop = ui.messagesList.scrollHeight;
    // local notifs for new messages not from me
    snapshot.forEach(ch=>{
      const m = ch.val();
      if (m && currentUser && m.userId !== currentUser.uid && m.room===activeRoom && (!m.groupId || m.groupId===activeGroupId)) {
        showLocalNotification(m.username, m.text || (m.type==='audio' ? 'Message vocal' : 'Nouveau message'));
      }
    });
    // admin panel messages
    renderAdminMessagesList(arr);
  });
}

function renderMessage(m){
  const t = new Date(m.timestamp).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
  const mine = currentUser && m.userId === currentUser.uid;
  const audioHtml = m.audioData ? `<div style="margin-top:6px;"><audio controls src="${m.audioData}"></audio></div>` : '';
  const groupLabel = m.groupId ? `<span style="font-size:12px;color:rgba(255,255,255,0.5);margin-left:6px;">#${escapeHtml(m.groupId)}</span>` : '';
  return `<div class="message-item" id="msg-${m.id}">
    <div class="message-header"><span class="message-author">${escapeHtml(m.username)}${mine? ' (moi)':''}${groupLabel}</span><span class="message-time">${t}</span></div>
    <div class="message-text">${escapeHtml(m.text||'')}</div>
    ${audioHtml}
    <div style="display:flex;gap:8px;margin-top:8px;">
      <button class="btn btn-secondary" onclick="window.openReplyPrompt && window.openReplyPrompt('${m.id}','${escapeJs(m.username||'')}')">↩ Répondre</button>
      <button class="btn btn-secondary" onclick="window.speakText && window.speakText('${escapeJs(m.text||'')}')">🔊 Écouter</button>
      ${mine? `<button class="delete-btn" onclick="window.deleteMessage && window.deleteMessage('${m.id}')">Supprimer</button>` : ''}
    </div>
  </div>`;
}
window.openReplyPrompt = async (msgId, uname) => {
  const reply = prompt(`Répondre à ${uname}:`);
  if (!reply || !currentUser) return;
  await push(ref(db,'messages'), { text: reply, timestamp: Date.now(), username: currentUserData.username, userId: currentUser.uid, type:'reply', room: activeRoom, parentId: msgId, groupId: activeGroupId || null });
  showSuccess('Réponse envoyée');
};
window.speakText = (text) => { if (!('speechSynthesis' in window)) return showError('Synthèse vocale non dispo'); const u = new SpeechSynthesisUtterance(text); u.lang='fr-FR'; window.speechSynthesis.cancel(); window.speechSynthesis.speak(u); };

// quick messages
async function quickMessage(kind){
  if (!currentUser) return showError('Connecte-toi');
  const map = { jouer:'Qui est dispo pour jouer ?', aide:"J'ai besoin d'aide !" };
  const text = map[kind] || 'Message rapide';
  await push(ref(db,'messages'), { text, timestamp: Date.now(), username: currentUserData.username, userId: currentUser.uid, type:kind, room: activeRoom, groupId: activeGroupId || null });
  showSuccess('Envoyé');
}

// POLLS
async function createPoll(){
  const q = ui.pollQuestion.value.trim();
  const optsRaw = ui.pollOptions.value.trim();
  if (!q || !optsRaw) return showError('Question et options requises');
  const options = optsRaw.split(';').map(s=>s.trim()).filter(Boolean);
  if (options.length < 2) return showError('2 options min');
  const pollRef = push(ref(db,'polls'), { question: q, options, votes: {}, creator: currentUser.uid, createdAt: Date.now(), room: activeRoom });
  const pollObj = { pollId: pollRef.key, question: q, options, votes: {} };
  await push(ref(db,'messages'), { text: `Sondage: ${q}`, timestamp: Date.now(), username: currentUserData.username, userId: currentUser.uid, poll: pollObj, pollId: pollRef.key, room: activeRoom, groupId: activeGroupId || null });
  closeModal('pollModal'); showSuccess('Sondage créé');
}
onValue(ref(db,'polls'), snap=>{
  const container = ui.pollsList;
  container.innerHTML = '';
  if (!snap.exists()) return;
  snap.forEach(ch=>{
    const p = ch.val(); p.id = ch.key;
    if (p.room && p.room !== activeRoom) return;
    const counts = (p.votes ? Object.values(p.votes) : []).reduce((acc, v)=>{ acc[v] = (acc[v]||0)+1; return acc; }, {});
    let html = `<div style="padding:8px;border-bottom:1px solid rgba(255,255,255,0.03)"><strong>${escapeHtml(p.question)}</strong>`;
    p.options.forEach((opt,i)=> {
      const votes = counts[i]||0;
      html += `<div style="display:flex;align-items:center;gap:8px;margin-top:6px;"><button class="btn btn-secondary" onclick="votePoll('${p.id}', ${i})">${escapeHtml(opt)}</button><div style="font-size:13px;color:rgba(255,255,255,0.7)">${votes} vote(s)</div></div>`;
    });
    html += `</div>`;
    container.innerHTML += html;
  });
});
window.votePoll = async (pollId, optionIdx) => {
  if (!pollId) return showError('Sondage introuvable');
  await set(ref(db, `polls/${pollId}/votes/${currentUser.uid}`), optionIdx);
  showSuccess('Vote envoyé');
};

// CHALLENGES
async function createChallenge(){
  const text = ui.challengeText.value.trim();
  const duration = parseInt(ui.challengeDuration.value || '60', 10);
  if (!text) return showError('Écris un défi');
  const chRef = push(ref(db,'challenges'), { text, creator: currentUser.uid, createdAt: Date.now(), duration, active: true, room: activeRoom, groupId: activeGroupId || null });
  await push(ref(db,'messages'), { text: `Défi: ${text}`, timestamp: Date.now(), username: currentUserData.username, userId: currentUser.uid, challengeId: chRef.key, room: activeRoom, groupId: activeGroupId || null });
  closeModal('challengeModal'); showSuccess('Défi lancé');
}
onValue(ref(db,'challenges'), snap=>{
  const c = ui.challengesList; c.innerHTML = '';
  if (!snap.exists()) return;
  snap.forEach(ch=>{
    const d = ch.val(); d.id = ch.key;
    if (d.room && d.room !== activeRoom) return;
    c.innerHTML += `<div style="padding:8px;border-bottom:1px solid rgba(255,255,255,0.03)"><strong>${escapeHtml(d.text)}</strong><div style="font-size:12px;color:rgba(255,255,255,0.6)">Durée: ${d.duration} min</div><div style="margin-top:6px;"><button class="btn btn-secondary" onclick="acceptChallenge('${d.id}')">Accepter</button></div></div>`;
  });
});
window.acceptChallenge = async (id) => {
  await set(ref(db, `challenges/${id}/acceptedBy/${currentUser.uid}`), true);
  showSuccess('Défi accepté');
};

// GROUPS
async function createGroup(){
  const name = ui.newGroupName.value.trim();
  if (!name) return showError('Nom requis');
  const g = await push(ref(db,'groups'), { name, owner: currentUser.uid, createdAt: Date.now(), members: { [currentUser.uid]: true } });
  showSuccess('Groupe créé'); ui.newGroupName.value=''; renderGroups();
}
async function renderGroups(){
  const snap = await get(ref(db,'groups'));
  ui.groupsList.innerHTML = '';
  if (!snap.exists()) return;
  snap.forEach(ch=>{
    const g = ch.val(); const id = ch.key;
    ui.groupsList.innerHTML += `<div style="padding:8px;border-bottom:1px solid rgba(255,255,255,0.03)"><strong>${escapeHtml(g.name)}</strong><div style="font-size:12px;color:rgba(255,255,255,0.6)">Members: ${g.members ? Object.keys(g.members).length : 0}</div><div style="margin-top:6px;"><button class="btn btn-secondary" onclick="joinGroup('${id}')">Ouvrir</button></div></div>`;
  });
}
window.joinGroup = async (groupId) => {
  activeGroupId = groupId;
  await set(ref(db, `groups/${groupId}/members/${currentUser.uid}`), true);
  ui.activeGroupInfo.innerHTML = `Groupe actif : <strong>${escapeHtml(groupId)}</strong>`; closeModal('groupsModal'); attachMessagesListener();
};
async function inviteToGroup(){
  const name = ui.inviteUsername.value.trim();
  if (!name || !activeGroupId) return showError('Pseudo requis et groupe actif');
  const snap = await get(ref(db,'users'));
  if (!snap.exists()) return showError('Aucun user');
  let found = null;
  snap.forEach(ch=>{ const u = ch.val(); if (u.username === name) found = ch.key; });
  if (!found) return showError('Utilisateur introuvable');
  await set(ref(db, `groups/${activeGroupId}/members/${found}`), true);
  showSuccess('Utilisateur invité');
}

// RECORD AUDIO -> Base64
let mediaRecorder = null, audioChunks = [];
const MAX_AUDIO_BYTES = 2_500_000;
async function startRecording(){
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio:true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];
    mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
    mediaRecorder.onstop = async () => {
      const blob = new Blob(audioChunks, { type:'audio/webm' });
      if (blob.size > MAX_AUDIO_BYTES) { showError('Enregistrement trop long'); return; }
      const dataUrl = await blobToDataURL(blob);
      const payload = { text:'(Message vocal)', audioData: dataUrl, timestamp: Date.now(), username: currentUserData.username, userId: currentUser.uid, type:'audio', room: activeRoom, groupId: activeGroupId || null };
      await push(ref(db,'messages'), payload);
      ui.recPreview.innerHTML = `<audio controls src="${dataUrl}"></audio>`;
      showSuccess('Enregistrement envoyé');
    };
    mediaRecorder.start();
    ui.recStatus.textContent='Enregistrement...'; ui.startRecBtn.disabled=true; ui.stopRecBtn.disabled=false;
  } catch(e){ console.error(e); showError('Micro inaccessible'); }
}
function stopRecording(){ if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop(); ui.recStatus.textContent='Traitement...'; ui.startRecBtn.disabled=false; ui.stopRecBtn.disabled=true; }
function blobToDataURL(blob){ return new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsDataURL(blob); }); }

// speech recognition
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
if (SpeechRecognition) {
  recognition = new SpeechRecognition(); recognition.lang='fr-FR'; recognition.interimResults=false; recognition.maxAlternatives=1;
  recognition.addEventListener('result', e=>{ const text = e.results[0][0].transcript; ui.messageInput.value = (ui.messageInput.value ? ui.messageInput.value+' ' : '') + text; showSuccess('Dictée insérée'); });
  recognition.addEventListener('error', e=> showError('Erreur dictée: '+e.error));
}
function startDictation(){ if (!recognition) return showError('Dictée non supportée'); try { recognition.start(); showSuccess('Parle...'); } catch(e){ showError('Impossible de démarrer la dictée'); } }

// ADMIN (password hashed)
async function submitAdminPass(){
  const pass = ui.adminPassInput.value || ''; closeModal('adminPassModal');
  if (!pass) return showError('Mot de passe requis');
  const h = await sha256Hex(pass);
  const snap = await get(ref(db,'admin/passwordHash'));
  if (snap.exists() && snap.val() === h) { adminUnlocked=true; openModal('adminPanel'); loadAdminUsers(); loadAdminMessages(); showSuccess('Accès admin'); }
  else showError('Mot de passe admin incorrect');
}
async function adminInitChangePassword(){ if (!currentUser) return showError('Connecte-toi'); const newPass = prompt('Nouveau mot de passe admin'); if (!newPass) return; const h = await sha256Hex(newPass); await set(ref(db,'admin/passwordHash'), h); showSuccess('Mot de passe mis'); }
window.adminInitChangePassword = adminInitChangePassword;

async function loadAdminUsers(){ const snap = await get(ref(db,'users')); ui.adminUsersList.innerHTML=''; if (!snap.exists()) return; snap.forEach(ch=>{ const u=ch.val(); const uid=ch.key; ui.adminUsersList.innerHTML += `<div style="display:flex;justify-content:space-between;padding:6px;border-bottom:1px solid rgba(255,255,255,0.03)"><div><strong>${escapeHtml(u.username)}</strong><div style="font-size:12px;color:rgba(255,255,255,0.6)">${escapeHtml(u.email||'')}</div></div><div style="display:flex;gap:6px;"><button class="btn btn-secondary" onclick="toggleAdmin('${uid}', ${u.isAdmin? 'true':'false'})">${u.isAdmin? 'Retirer':'Promouvoir'}</button><button class="delete-btn" onclick="removeUser('${uid}')">Suppr</button></div></div>`; }); }
window.toggleAdmin = async (uid, cur) => { if (!adminUnlocked) return showError('Admin req'); await update(ref(db,'users/'+uid), { isAdmin: !cur }); loadAdminUsers(); showSuccess('Rôle modifié'); };
window.removeUser = async (uid) => { if (!adminUnlocked) return showError('Admin req'); if (!confirm('Supprimer ?')) return; await remove(ref(db,'users/'+uid)); loadAdminUsers(); };

// admin messages
async function loadAdminMessages(){ const snap = await get(ref(db,'messages')); ui.adminMessagesList.innerHTML=''; if (!snap.exists()) return; snap.forEach(ch=>{ const m=ch.val(); const id=ch.key; ui.adminMessagesList.innerHTML += `<div style="display:flex;justify-content:space-between;padding:6px;border-bottom:1px solid rgba(255,255,255,0.03)"><div><strong>${escapeHtml(m.username)}</strong><div style="font-size:12px;color:rgba(255,255,255,0.6)">${escapeHtml(m.text||'')}</div></div><div><button class="delete-btn" onclick="deleteMessage('${id}')">Suppr</button></div></div>`; }); }

// admin actions
async function adminBroadcast(){ if(!adminUnlocked) return showError('Admin req'); const t = prompt('Message broadcast'); if(!t) return; await push(ref(db,'messages'), { text: t, timestamp: Date.now(), username: 'ADMIN', userId: 'ADMIN', type:'broadcast', room: 'general' }); showSuccess('Broadcast envoyé'); }
async function adminCreateNotificationNode(){ if(!adminUnlocked) return showError('Admin req'); const title = prompt('Titre'); const body = prompt('Message'); if(!title||!body) return; await push(ref(db,'notifications'), { title, body, createdAt: Date.now(), by: currentUser.uid }); showSuccess('Noeud créé'); }
async function openPromoteDialog(){ openModal('adminPanel'); loadAdminUsers(); }
async function adminSetColor(){ if(!adminUnlocked) return showError('Admin req'); const c = prompt('Hex couleur (ex: #8b5cf6)'); if(!c) return; await set(ref(db,'settings/themeColor'), c); applyThemeColor(c); showSuccess('Couleur changée'); }
async function adminExportUsersCSV(){ if(!adminUnlocked) return showError('Admin req'); const snap = await get(ref(db,'users')); let csv = 'uid,username,email,isAdmin,createdAt\n'; if (snap.exists()) { snap.forEach(ch=>{ const u=ch.val(); csv += `${ch.key},"${(u.username||'').replace(/"/g,'""')}","${(u.email||'').replace(/"/g,'""')}",${u.isAdmin?1:0},${u.createdAt||''}\n`; }); } downloadBlob(csv,'users.csv','text/csv'); showSuccess('CSV'); }
async function adminClearMessages(){ if(!adminUnlocked) return showError('Admin req'); if(!confirm('Vider messages ?')) return; await remove(ref(db,'messages')); showSuccess('Messages vidés'); }

// delete message
window.deleteMessage = async (id) => { if (!currentUser) return showError('Connecte-toi'); const snap = await get(ref(db,'messages/'+id)); const m=snap.val(); if (!m) return showError('Introuvable'); if (m.userId===currentUser.uid || adminUnlocked) { await remove(ref(db,'messages/'+id)); showSuccess('Supprimé'); } else showError('Pas le droit'); };

// settings / theme
async function loadSettings(){ const snap = await get(ref(db,'settings/themeColor')); const c = snap.exists() ? snap.val() : '#6b21a8'; applyThemeColor(c); ui.themeColorPreview.style.background = c; }
function applyThemeColor(c){ try { document.documentElement.style.setProperty('--primary', c); ui.themeColorPreview.style.background = c; } catch(e){ console.warn(e); } }

// notifications: register SW & token, local notifications
async function registerServiceWorkerAndNotifications(){
  if ('serviceWorker' in navigator) { try { await navigator.serviceWorker.register('/sw.js'); console.log('sw registered'); } catch(e){ console.warn('sw reg fail', e); } }
  if (!messaging) return;
  try {
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      if (VAPID_KEY && VAPID_KEY.indexOf('<')===-1) {
        const token = await getToken(messaging, { vapidKey: VAPID_KEY });
        if (token && currentUser) await set(ref(db, `fcmTokens/${currentUser.uid}`), { token, ts: Date.now() });
      } else console.warn('VAPID_KEY not set');
    }
    onMessage(messaging, payload => {
      showLocalNotification(payload.notification?.title || 'PotesHub', payload.notification?.body || '');
    });
  } catch(e){ console.warn(e); }
}
function showLocalNotification(title, body){
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  navigator.serviceWorker.getRegistration().then(reg => {
    if (reg) reg.showNotification(title, { body, icon: '/icon-192.png', tag: 'poteshub' });
    else new Notification(title, { body, icon: '/icon-192.png' });
  });
}

// blob->dataurl util
function downloadBlob(content, filename, mime){ const blob = new Blob([content], { type: mime }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download=filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); }
function blobToDataURL(blob){ return new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsDataURL(blob); }); }

// sha256 helper
async function sha256Hex(message){ const msgUint8 = new TextEncoder().encode(message); const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8); const hashArray = Array.from(new Uint8Array(hashBuffer)); return hashArray.map(b=>b.toString(16).padStart(2,'0')).join(''); }
window.sha256Hex = sha256Hex;

// WebRTC group voice (basic signaling via Realtime DB)
const rtcConfig = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
let pc = null; // RTCPeerConnection for current client
let localStream = null;
async function startVoiceRoom(){
  if (!activeGroupId) return showError('Active un groupe pour lancer le vocal');
  // check membership
  const memSnap = await get(ref(db, `groups/${activeGroupId}/members/${currentUser.uid}`));
  if (!memSnap.exists()) return showError('Tu n\'es pas membre du groupe');
  // get local audio
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ audio:true });
  } catch(e){ return showError('Impossible d\'accéder au micro'); }
  pc = new RTCPeerConnection(rtcConfig);
  // add local tracks
  for (const t of localStream.getTracks()) pc.addTrack(t, localStream);
  pc.ontrack = (evt) => {
    // create audio element for remote stream
    const remoteAudio = document.createElement('audio');
    remoteAudio.autoplay = true;
    remoteAudio.srcObject = evt.streams[0];
    remoteAudio.style.maxWidth='100%';
    ui.recPreview.appendChild(remoteAudio);
  };
  // ICE candidate -> push to DB
  pc.onicecandidate = async (e) => {
    if (e.candidate) await push(ref(db, `webrtc/${activeGroupId}/candidates/${currentUser.uid}`), e.candidate.toJSON());
  };
  // create offer and store in DB
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  await set(ref(db, `webrtc/${activeGroupId}/offer/${currentUser.uid}`), { sdp: offer.sdp, type: offer.type, createdAt: Date.now(), from: currentUser.uid });
  // listen for answers from others
  onValue(ref(db, `webrtc/${activeGroupId}/answer`), snap=>{
    if (!snap.exists()) return;
    snap.forEach(child => {
      const ans = child.val();
      if (ans.to === currentUser.uid) {
        const remoteDesc = { type: ans.type, sdp: ans.sdp };
        pc.setRemoteDescription(remoteDesc).catch(e=>console.warn(e));
      }
    });
  });
  // listen for candidates
  onValue(ref(db, `webrtc/${activeGroupId}/candidates`), snap=>{
    if (!snap.exists()) return;
    snap.forEach(child => {
      const c = child.val();
      try { pc.addIceCandidate(c).catch(()=>{}); } catch(e){}
    });
  });
  showSuccess('Vocal lancé (beta). Les membres peuvent répondre.');
}

// When someone else launches a voice, they will create offer/<uid>. Each member can create an answer targeted to offerer.
// Simple flow: heavy but works for small groups.
onValue(ref(db, 'webrtc'), snap=>{
  // only handle offers in current group
  if (!snap.exists() || !activeGroupId) return;
  const groupNode = snap.child(activeGroupId);
  if (!groupNode.exists()) return;
  const offersNode = groupNode.child('offer');
  if (!offersNode.exists()) return;
  offersNode.forEach(async offerChild => {
    const offerObj = offerChild.val();
    const offerFrom = offerChild.key;
    if (offerFrom === currentUser.uid) return; // ignore my own offer
    // create peer connection and answer
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio:true });
      const pc2 = new RTCPeerConnection(rtcConfig);
      for (const t of stream.getTracks()) pc2.addTrack(t, stream);
      pc2.ontrack = e => { const remote = document.createElement('audio'); remote.autoplay=true; remote.srcObject = e.streams[0]; ui.recPreview.appendChild(remote); };
      pc2.onicecandidate = async (e) => { if (e.candidate) await push(ref(db, `webrtc/${activeGroupId}/candidates/${currentUser.uid}`), e.candidate.toJSON()); };
      await pc2.setRemoteDescription({ type: offerObj.type, sdp: offerObj.sdp });
      const answer = await pc2.createAnswer();
      await pc2.setLocalDescription(answer);
      // put answer targeted to offerer
      const ansObj = { sdp: answer.sdp, type: answer.type, to: offerFrom, from: currentUser.uid };
      await push(ref(db, `webrtc/${activeGroupId}/answer`), ansObj);
      showSuccess('Tu as rejoint le vocal (beta)');
    } catch(e){ console.warn(e); }
  });
});

// simple UI section switching
function showSection(name){
  ['chat','polls','challenges'].forEach(n => { $(n+'Section') && $(n+'Section').classList.toggle('hidden', n!==name); document.querySelector(`#nav${capitalize(n)}`) && document.querySelector(`#nav${capitalize(n)}`).classList.toggle('active', n===name); });
  // nav buttons are separate IDs navChat, navPolls, navChallenges
  ['navChat','navPolls','navChallenges'].forEach(id => $(id) && $(id).classList.remove('active'));
  const map = { chat:'navChat', polls:'navPolls', challenges:'navChallenges' };
  $(map[name]).classList.add('active');
}
function capitalize(s){ return s.charAt(0).toUpperCase() + s.slice(1); }

// utilities: render admin messages
function renderAdminMessagesList(arr){
  ui.adminMessagesList.innerHTML = arr.map(m => `<div style="display:flex;justify-content:space-between;padding:6px;border-bottom:1px solid rgba(255,255,255,0.03)"><div><strong>${escapeHtml(m.username)}</strong><div style="font-size:12px;color:rgba(255,255,255,0.6)">${escapeHtml(m.text||'')}</div></div><div><button class="delete-btn" onclick="deleteMessage('${m.id}')">Suppr</button></div></div>`).join('');
}

// delete message fallback
window.deleteMessage = async (id) => { if (!currentUser) return showError('Connecte-toi'); const snap = await get(ref(db,'messages/'+id)); const m = snap.val(); if (!m) return showError('Introuvable'); if (m.userId === currentUser.uid || adminUnlocked) { await remove(ref(db,'messages/'+id)); showSuccess('Supprimé'); } else showError('Pas le droit'); };

// initial load
renderGroups();
loadSettings();
showSection('chat');

console.log('PotesHub V4 chargé');
