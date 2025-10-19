// app.js - PotesHub V4 (Polls, Challenges, Group voice WebRTC, admin color, Base64 audio)
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

const $ = id => document.getElementById(id);

// helpers
function openModal(id){ document.getElementById(id)?.classList.add('active'); }
function closeModal(id){ document.getElementById(id)?.classList.remove('active'); }
function showError(msg){ const el = $('errorMsg'); if(el) { el.textContent = msg; el.style.display='block'; setTimeout(()=> el.style.display='none',5000); } }
function showSuccess(msg){ const el = $('successMsg'); if(el) { el.textContent = msg; el.style.display='block'; setTimeout(()=> el.style.display='none',3000); } }
function escapeHtml(s){ if (s==null) return ''; return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }
function escapeJs(s){ if (!s) return ''; return String(s).replace(/'/g,"\\'").replace(/"/g,'\\"').replace(/\n/g,' '); }

// Utility: blob to dataURL (declared ONCE here)
function blobToDataURL(blob){ 
  return new Promise((resolve, reject)=>{ 
    const reader = new FileReader(); 
    reader.onload = () => resolve(reader.result); 
    reader.onerror = reject; 
    reader.readAsDataURL(blob); 
  }); 
}

// Utility: download blob
function downloadBlob(content, filename, mime){ 
  const blob = new Blob([content], { type: mime }); 
  const url = URL.createObjectURL(blob); 
  const a = document.createElement('a'); 
  a.href = url; 
  a.download = filename; 
  document.body.appendChild(a); 
  a.click(); 
  a.remove(); 
  URL.revokeObjectURL(url); 
}

// Utility: sha256
async function sha256Hex(message){ 
  const msgUint8 = new TextEncoder().encode(message); 
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8); 
  const hashArray = Array.from(new Uint8Array(hashBuffer)); 
  return hashArray.map(b=>b.toString(16).padStart(2,'0')).join(''); 
}
window.sha256Hex = sha256Hex;

// auth
async function register(){
  const username = $('registerUsername')?.value.trim();
  const email = $('registerEmail')?.value.trim();
  const password = $('registerPassword')?.value;
  if (!username||!email||!password) return showError('Remplis tous les champs');
  try {
    const res = await createUserWithEmailAndPassword(auth, email, password);
    await set(ref(db,'users/'+res.user.uid), { username, email, isAdmin:false, createdAt: Date.now() });
    showSuccess('Compte créé');
    $('registerForm')?.classList.add('hidden'); 
    $('loginForm')?.classList.remove('hidden');
  } catch(e){ showError(e.message); }
}

async function login(){
  const email = $('loginEmail')?.value.trim(); 
  const password = $('loginPassword')?.value;
  if(!email||!password) return showError('Email & mot de passe requis');
  try {
    const persistence = $('rememberMe')?.checked ? browserLocalPersistence : browserSessionPersistence;
    await setPersistence(auth, persistence);
    await signInWithEmailAndPassword(auth, email, password);
  } catch(e){ showError(e.message); }
}

async function logout(){ try { await signOut(auth); } catch(e){ console.warn(e); } }

// auth state listener
onAuthStateChanged(auth, async user=>{
  if (!user) { 
    currentUser=null; 
    currentUserData=null; 
    $('authPage')?.classList.remove('hidden'); 
    $('mainApp')?.classList.add('hidden'); 
    return; 
  }
  currentUser = user;
  const snap = await get(ref(db,'users/'+user.uid));
  currentUserData = snap.exists() ? snap.val() : { username:'Utilisateur', isAdmin:false };
  
  const userName = $('userName');
  const userAvatar = $('userAvatar');
  const userMood = $('userMood');
  if(userName) userName.textContent = currentUserData.username || 'Utilisateur';
  if(userAvatar) userAvatar.textContent = (currentUserData.username||'U')[0].toUpperCase();
  if(userMood) userMood.textContent = currentUserData.mood || '—';
  
  $('authPage')?.classList.add('hidden'); 
  $('mainApp')?.classList.remove('hidden');
  
  const adminBtn = $('openAdminBtn');
  const navAdmin = $('navAdmin');
  if (currentUserData.isAdmin) { 
    if(adminBtn) adminBtn.style.display='inline-block'; 
    if(navAdmin) navAdmin.style.display='block'; 
  } else { 
    if(adminBtn) adminBtn.style.display='none'; 
    if(navAdmin) navAdmin.style.display='none'; 
  }
  
  await loadRooms(); 
  attachMessagesListener(); 
  renderGroups(); 
  loadSettings();
  registerServiceWorkerAndNotifications();
});

// rooms
async function loadRooms(){
  const snap = await get(ref(db,'rooms'));
  const defaultRooms = [{id:'general',name:'Général'},{id:'gaming',name:'Gaming'}];
  const rooms = snap.exists() ? Object.keys(snap.val()).map(k=>({ id:k, name: snap.val()[k].name || k })) : defaultRooms;
  if (!rooms.find(r=>r.id==='general')) rooms.unshift({id:'general',name:'Général'});
  
  const roomSelect = $('roomSelect');
  if(roomSelect) {
    roomSelect.innerHTML = rooms.map(r=>`<option value="${r.id}">${r.name}</option>`).join('');
    roomSelect.value = activeRoom;
    roomSelect.addEventListener('change', ()=> { activeRoom = roomSelect.value; attachMessagesListener(); });
  }
}

// messages
async function sendMessage(){
  if (!currentUser) return showError('Connecte-toi');
  const messageInput = $('messageInput');
  const text = messageInput?.value.trim();
  if (!text) return;
  const payload = { text, timestamp: Date.now(), username: currentUserData.username, userId: currentUser.uid, type:'message', room: activeRoom, groupId: activeGroupId || null };
  await push(ref(db,'messages'), payload);
  if(messageInput) messageInput.value = '';
  showSuccess('Message envoyé');
}

function attachMessagesListener(){
  const messagesList = $('messagesList');
  if(messagesList) messagesList.innerHTML = '<div style="color:rgba(255,255,255,0.5)">Chargement...</div>';
  
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
    if(messagesList) {
      messagesList.innerHTML = rendered;
      messagesList.scrollTop = messagesList.scrollHeight;
    }
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

window.speakText = (text) => { 
  if (!('speechSynthesis' in window)) return showError('Synthèse vocale non dispo'); 
  const u = new SpeechSynthesisUtterance(text); 
  u.lang='fr-FR'; 
  window.speechSynthesis.cancel(); 
  window.speechSynthesis.speak(u); 
};

// quick messages
async function quickMessage(kind){
  if (!currentUser) return showError('Connecte-toi');
  const map = { jouer:'Qui est dispo pour jouer ?', aide:"J'ai besoin d'aide !" };
  const text = map[kind] || 'Message rapide';
  await push(ref(db,'messages'), { text, timestamp: Date.now(), username: currentUserData.username, userId: currentUser.uid, type:kind, room: activeRoom, groupId: activeGroupId || null });
  showSuccess('Envoyé');
}

// GROUPS
async function createGroup(){
  const newGroupName = $('newGroupName');
  const name = newGroupName?.value.trim();
  if (!name) return showError('Nom requis');
  await push(ref(db,'groups'), { name, owner: currentUser.uid, createdAt: Date.now(), members: { [currentUser.uid]: true } });
  showSuccess('Groupe créé'); 
  if(newGroupName) newGroupName.value=''; 
  renderGroups();
}

async function renderGroups(){
  const groupsList = $('groupsList');
  if(!groupsList) return;
  
  const snap = await get(ref(db,'groups'));
  groupsList.innerHTML = '';
  if (!snap.exists()) return;
  
  snap.forEach(ch=>{
    const g = ch.val(); 
    const id = ch.key;
    groupsList.innerHTML += `<div style="padding:8px;border-bottom:1px solid rgba(255,255,255,0.03)"><strong>${escapeHtml(g.name)}</strong><div style="font-size:12px;color:rgba(255,255,255,0.6)">Membres: ${g.members ? Object.keys(g.members).length : 0}</div><div style="margin-top:6px;"><button class="btn btn-secondary" onclick="joinGroup('${id}')">Ouvrir</button></div></div>`;
  });
}

window.joinGroup = async (groupId) => {
  activeGroupId = groupId;
  await set(ref(db, `groups/${groupId}/members/${currentUser.uid}`), true);
  const activeGroupInfo = $('activeGroupInfo');
  if(activeGroupInfo) activeGroupInfo.innerHTML = `Groupe actif : <strong>${escapeHtml(groupId)}</strong>`;
  closeModal('groupsModal'); 
  attachMessagesListener();
};

async function inviteToGroup(){
  const inviteUsername = $('inviteUsername');
  const name = inviteUsername?.value.trim();
  if (!name || !activeGroupId) return showError('Pseudo requis et groupe actif');
  
  const snap = await get(ref(db,'users'));
  if (!snap.exists()) return showError('Aucun user');
  
  let found = null;
  snap.forEach(ch=>{ const u = ch.val(); if (u.username === name) found = ch.key; });
  if (!found) return showError('Utilisateur introuvable');
  
  await set(ref(db, `groups/${activeGroupId}/members/${found}`), true);
  showSuccess('Utilisateur invité');
}

// RECORD AUDIO
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
      
      const recPreview = $('recPreview');
      if(recPreview) recPreview.innerHTML = `<audio controls src="${dataUrl}"></audio>`;
      showSuccess('Enregistrement envoyé');
    };
    
    mediaRecorder.start();
    const recStatus = $('recStatus');
    const startRecBtn = $('startRecBtn');
    const stopRecBtn = $('stopRecBtn');
    if(recStatus) recStatus.textContent='Enregistrement...';
    if(startRecBtn) startRecBtn.disabled=true;
    if(stopRecBtn) stopRecBtn.disabled=false;
  } catch(e){ 
    console.error(e); 
    showError('Micro inaccessible'); 
  }
}

function stopRecording(){ 
  if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop(); 
  const recStatus = $('recStatus');
  const startRecBtn = $('startRecBtn');
  const stopRecBtn = $('stopRecBtn');
  if(recStatus) recStatus.textContent='Traitement...';
  if(startRecBtn) startRecBtn.disabled=false;
  if(stopRecBtn) stopRecBtn.disabled=true;
}

// speech recognition
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
if (SpeechRecognition) {
  recognition = new SpeechRecognition(); 
  recognition.lang='fr-FR'; 
  recognition.interimResults=false; 
  recognition.maxAlternatives=1;
  recognition.addEventListener('result', e=>{ 
    const text = e.results[0][0].transcript; 
    const messageInput = $('messageInput');
    if(messageInput) messageInput.value = (messageInput.value ? messageInput.value+' ' : '') + text; 
    showSuccess('Dictée insérée'); 
  });
  recognition.addEventListener('error', e=> showError('Erreur dictée: '+e.error));
}

function startDictation(){ 
  if (!recognition) return showError('Dictée non supportée'); 
  try { recognition.start(); showSuccess('Parle...'); } 
  catch(e){ showError('Impossible de démarrer la dictée'); } 
}

// ADMIN
async function submitAdminPass(){
  const adminPassInput = $('adminPassInput');
  const pass = adminPassInput?.value || ''; 
  closeModal('adminPassModal');
  if (!pass) return showError('Mot de passe requis');
  
  const h = await sha256Hex(pass);
  const snap = await get(ref(db,'admin/passwordHash'));
  if (snap.exists() && snap.val() === h) { 
    adminUnlocked=true; 
    openModal('adminPanel'); 
    loadAdminUsers(); 
    showSuccess('Accès admin'); 
  } else showError('Mot de passe admin incorrect');
}

async function loadAdminUsers(){ 
  const adminUsersList = $('adminUsersList');
  if(!adminUsersList) return;
  
  const snap = await get(ref(db,'users')); 
  adminUsersList.innerHTML=''; 
  if (!snap.exists()) return; 
  
  snap.forEach(ch=>{ 
    const u=ch.val(); 
    const uid=ch.key; 
    adminUsersList.innerHTML += `<div style="display:flex;justify-content:space-between;padding:6px;border-bottom:1px solid rgba(255,255,255,0.03)"><div><strong>${escapeHtml(u.username)}</strong><div style="font-size:12px;color:rgba(255,255,255,0.6)">${escapeHtml(u.email||'')}</div></div><div style="display:flex;gap:6px;"><button class="btn btn-secondary" onclick="toggleAdmin('${uid}', ${u.isAdmin? 'true':'false'})">${u.isAdmin? 'Retirer':'Promouvoir'}</button></div></div>`; 
  }); 
}

window.toggleAdmin = async (uid, cur) => { 
  if (!adminUnlocked) return showError('Admin req'); 
  await update(ref(db,'users/'+uid), { isAdmin: !cur }); 
  loadAdminUsers(); 
  showSuccess('Rôle modifié'); 
};

async function adminSetColor(){ 
  if(!adminUnlocked) return showError('Admin req'); 
  const c = prompt('Hex couleur (ex: #8b5cf6)'); 
  if(!c) return; 
  await set(ref(db,'settings/themeColor'), c); 
  applyThemeColor(c); 
  showSuccess('Couleur changée'); 
}

async function adminExportUsersCSV(){ 
  if(!adminUnlocked) return showError('Admin req'); 
  const snap = await get(ref(db,'users')); 
  let csv = 'uid,username,email,isAdmin,createdAt\n'; 
  if (snap.exists()) { 
    snap.forEach(ch=>{ 
      const u=ch.val(); 
      csv += `${ch.key},"${(u.username||'').replace(/"/g,'""')}","${(u.email||'').replace(/"/g,'""')}",${u.isAdmin?1:0},${u.createdAt||''}\n`; 
    }); 
  } 
  downloadBlob(csv,'users.csv','text/csv'); 
  showSuccess('CSV'); 
}

window.deleteMessage = async (id) => { 
  if (!currentUser) return showError('Connecte-toi'); 
  const snap = await get(ref(db,'messages/'+id)); 
  const m=snap.val(); 
  if (!m) return showError('Introuvable'); 
  if (m.userId===currentUser.uid || adminUnlocked) { 
    await remove(ref(db,'messages/'+id)); 
    showSuccess('Supprimé'); 
  } else showError('Pas le droit'); 
};

// settings / theme
async function loadSettings(){ 
  const snap = await get(ref(db,'settings/themeColor')); 
  const c = snap.exists() ? snap.val() : '#6b21a8'; 
  applyThemeColor(c); 
}

function applyThemeColor(c){ 
  try { 
    document.documentElement.style.setProperty('--primary', c); 
    const themeColorPreview = $('themeColorPreview');
    if(themeColorPreview) themeColorPreview.style.background = c; 
  } catch(e){ console.warn(e); } 
}

// notifications
async function registerServiceWorkerAndNotifications(){
  if ('serviceWorker' in navigator) { 
    try { await navigator.serviceWorker.register('/sw.js'); console.log('sw registered'); } 
    catch(e){ console.warn('sw reg fail', e); } 
  }
  if (!messaging) return;
  try {
    const perm = await Notification.requestPermission();
    if (perm === 'granted' && VAPID_KEY && VAPID_KEY.indexOf('<')===-1) {
      const token = await getToken(messaging, { vapidKey: VAPID_KEY });
      if (token && currentUser) await set(ref(db, `fcmTokens/${currentUser.uid}`), { token, ts: Date.now() });
    }
  } catch(e){ console.warn(e); }
}

// Event listeners
$('loginBtn')?.addEventListener('click', login);
$('showRegisterBtn')?.addEventListener('click', ()=>{ $('loginForm')?.classList.add('hidden'); $('registerForm')?.classList.remove('hidden'); });
$('showLoginBtn')?.addEventListener('click', ()=>{ $('registerForm')?.classList.add('hidden'); $('loginForm')?.classList.remove('hidden'); });
$('registerBtn')?.addEventListener('click', register);
$('logoutBtn')?.addEventListener('click', logout);
$('sendBtn')?.addEventListener('click', sendMessage);
$('messageInput')?.addEventListener('keydown', e=>{ if(e.key==='Enter') sendMessage(); });
$('btnQuickPlay')?.addEventListener('click', ()=> quickMessage('jouer'));
$('btnHelp')?.addEventListener('click', ()=> quickMessage('aide'));
$('createGroupBtn')?.addEventListener('click', createGroup);
$('closeGroupsBtn')?.addEventListener('click', ()=> closeModal('groupsModal'));
$('openGroupsBtn')?.addEventListener('click', ()=> { renderGroups(); openModal('groupsModal'); });
$('inviteBtn')?.addEventListener('click', inviteToGroup);
$('startRecBtn')?.addEventListener('click', startRecording);
$('stopRecBtn')?.addEventListener('click', stopRecording);
$('closeRecBtn')?.addEventListener('click', ()=> closeModal('recModal'));
$('openRecorderBtn')?.addEventListener('click', ()=> openModal('recModal'));
$('openDictBtn')?.addEventListener('click', startDictation);
$('btnMood')?.addEventListener('click', ()=> { const m = prompt('Ton mood du jour'); if(m && currentUser) set(ref(db, `users/${currentUser.uid}/mood`), m); });
$('openProfileBtn')?.addEventListener('click', ()=> openModal('profileModal'));
$('closeProfileBtn')?.addEventListener('click', ()=> closeModal('profileModal'));
$('adminPassSubmitBtn')?.addEventListener('click', submitAdminPass);
$('adminPassCancelBtn')?.addEventListener('click', ()=> closeModal('adminPassModal'));
$('openAdminBtn')?.addEventListener('click', ()=> openModal('adminPassModal'));
$('admSetColorBtn')?.addEventListener('click', adminSetColor);
$('admExportUsersBtn')?.addEventListener('click', adminExportUsersCSV);
$('closeAdminBtn')?.addEventListener('click', ()=> closeModal('adminPanel'));

console.log('PotesHub V4 loaded');
