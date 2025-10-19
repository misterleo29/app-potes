<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>App Potes 🎉</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .hidden { display: none !important; }
    .glassmorphic { background: rgba(255,255,255,0.95); backdrop-filter: blur(20px); }
    @keyframes slideIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    .animate-slideIn { animation: slideIn 0.3s ease-out; }
  </style>
</head>
<body class="bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">

<div id="app"></div>

<script>
// ========== BASE DE DONNÉES EN MÉMOIRE ==========
const DB = {
  users: {},
  requests: {},
  events: {},
  notifications: [],
  messages: {},
  currentUser: null
};

// ========== SAUVEGARDE LOCAL ==========
function saveDB() {
  localStorage.setItem('appPotesDB', JSON.stringify(DB));
}

function loadDB() {
  const saved = localStorage.getItem('appPotesDB');
  if (saved) {
    const data = JSON.parse(saved);
    Object.assign(DB, data);
  }
}

// ========== NOTIFICATIONS ==========
function sendNotif(title, body = '') {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { icon: '🎉', body });
  }
}

function addNotification(message) {
  const notif = {
    id: Date.now(),
    message,
    time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    timestamp: Date.now()
  };
  DB.notifications.unshift(notif);
  saveDB();
  sendNotif(message);
  render();
}

// ========== AUTH ==========
function handleSignUp(email, password, username) {
  if (!email || !password || !username) {
    alert('⚠️ Remplis tous les champs');
    return;
  }
  if (Object.values(DB.users).some(u => u.email === email)) {
    alert('❌ Email déjà utilisé');
    return;
  }
  const userId = 'user_' + Date.now();
  DB.users[userId] = { id: userId, username, email, isAdmin: false, isBanned: false };
  DB.currentUser = { id: userId, username, email, isAdmin: false };
  saveDB();
  addNotification(`🎉 ${username} a rejoint l'app !`);
  render();
}

function handleSignIn(email, password) {
  if (!email || !password) {
    alert('⚠️ Remplis tous les champs');
    return;
  }
  const user = Object.values(DB.users).find(u => u.email === email);
  if (!user) {
    alert('❌ Email introuvable');
    return;
  }
  if (user.isBanned) {
    alert('❌ Compte banni');
    return;
  }
  DB.currentUser = { id: user.id, username: user.username, email: user.email, isAdmin: user.isAdmin };
  saveDB();
  render();
}

function logout() {
  DB.currentUser = null;
  saveDB();
  render();
}

// ========== REQUESTS ==========
function addRequest(type, message) {
  if (!type || !message) {
    alert('⚠️ Remplis tous les champs');
    return;
  }
  const id = 'req_' + Date.now();
  DB.requests[id] = {
    id,
    user: DB.currentUser.username,
    userId: DB.currentUser.id,
    type,
    message,
    responses: {},
    timestamp: Date.now()
  };
  saveDB();
  addNotification(`✨ ${DB.currentUser.username} : ${type}`);
  render();
}

function respondToRequest(requestId, response, customText = null) {
  DB.requests[requestId].responses[DB.currentUser.id] = {
    user: DB.currentUser.username,
    response,
    customText,
    timestamp: Date.now()
  };
  saveDB();
  addNotification(`👍 ${DB.currentUser.username} a répondu`);
  render();
}

function deleteRequest(id) {
  delete DB.requests[id];
  saveDB();
  render();
}

// ========== EVENTS ==========
function addEvent(title, date, time) {
  if (!title || !date || !time) {
    alert('⚠️ Remplis tous les champs');
    return;
  }
  const id = 'evt_' + Date.now();
  DB.events[id] = {
    id, title, date, time,
    attendees: {},
    createdBy: DB.currentUser.id,
    timestamp: Date.now()
  };
  saveDB();
  addNotification(`📅 ${title}`);
  render();
}

function joinEvent(eventId) {
  if (!DB.events[eventId].attendees[DB.currentUser.id]) {
    DB.events[eventId].attendees[DB.currentUser.id] = {
      username: DB.currentUser.username,
      timestamp: Date.now()
    };
    saveDB();
    addNotification(`🎉 ${DB.currentUser.username} participe !`);
    render();
  }
}

function deleteEvent(id) {
  delete DB.events[id];
  saveDB();
  render();
}

// ========== MESSAGES ==========
function sendMessage(recipientId, text) {
  if (!text.trim()) return;
  const key = [DB.currentUser.id, recipientId].sort().join('_');
  if (!DB.messages[key]) DB.messages[key] = [];
  DB.messages[key].push({
    from: DB.currentUser.id,
    fromName: DB.currentUser.username,
    text,
    timestamp: Date.now()
  });
  saveDB();
  addNotification(`💬 Message de ${DB.currentUser.username}`);
  render();
}

function getMessages(otherId) {
  const key = [DB.currentUser.id, otherId].sort().join('_');
  return DB.messages[key] || [];
}

// ========== ADMIN ==========
function adminLogin(password) {
  if (password !== 'admin123') {
    alert('❌ Mot de passe incorrect');
    return;
  }
  DB.users[DB.currentUser.id].isAdmin = true;
  DB.currentUser.isAdmin = true;
  saveDB();
  addNotification('⚙️ Mode admin activé');
  render();
}

function promoteToAdmin(userId) {
  DB.users[userId].isAdmin = true;
  saveDB();
  addNotification(`👑 ${DB.users[userId].username} est admin`);
  render();
}

function removeAdmin(userId) {
  DB.users[userId].isAdmin = false;
  saveDB();
  render();
}

function banUser(userId) {
  DB.users[userId].isBanned = true;
  saveDB();
  addNotification(`🚫 ${DB.users[userId].username} banni`);
  render();
}

function unbanUser(userId) {
  DB.users[userId].isBanned = false;
  saveDB();
  render();
}

// ========== RENDER ==========
function render() {
  const app = document.getElementById('app');
  
  if (!DB.currentUser) {
    app.innerHTML = renderAuth();
    attachAuthListeners();
  } else {
    app.innerHTML = renderApp();
    attachAppListeners();
  }
}

function renderAuth() {
  return `
    <div class="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 flex items-center justify-center p-4">
      <div class="bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl p-8 w-full max-w-md border border-white/20 animate-slideIn">
        <div class="text-center mb-8">
          <div class="w-24 h-24 bg-gradient-to-br from-purple-600 to-pink-500 rounded-3xl flex items-center justify-center text-white font-black text-4xl shadow-xl mx-auto mb-4">🎉</div>
          <h1 class="text-5xl font-black bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 bg-clip-text text-transparent mb-2">App Potes</h1>
          <p class="text-gray-600 font-bold text-lg">Connecte-toi ! 🚀</p>
        </div>

        <div id="authTabs" class="flex gap-2 mb-6 p-1 bg-gray-100 rounded-2xl">
          <button onclick="switchTab('login')" class="flex-1 py-4 rounded-xl font-bold bg-gradient-to-r from-purple-600 to-pink-500 text-white tab-btn" data-tab="login">Connexion</button>
          <button onclick="switchTab('signup')" class="flex-1 py-4 rounded-xl font-bold text-gray-600 tab-btn" data-tab="signup">Inscription</button>
        </div>

        <div id="loginForm" class="space-y-4 auth-form">
          <input type="email" id="loginEmail" placeholder="📧 Email" class="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-200 outline-none text-lg">
          <input type="password" id="loginPassword" placeholder="🔒 Mot de passe" class="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-200 outline-none text-lg">
          <button onclick="doLogin()" class="w-full bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 text-white py-5 rounded-xl font-black text-lg hover:shadow-2xl">🚀 Se connecter</button>
        </div>

        <div id="signupForm" class="space-y-4 auth-form hidden">
          <input type="text" id="signupUsername" placeholder="✨ Pseudo" class="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-200 outline-none text-lg">
          <input type="email" id="signupEmail" placeholder="📧 Email" class="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-200 outline-none text-lg">
          <input type="password" id="signupPassword" placeholder="🔒 Mot de passe" class="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-200 outline-none text-lg">
          <button onclick="doSignUp()" class="w-full bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 text-white py-5 rounded-xl font-black text-lg hover:shadow-2xl">✨ Créer mon compte</button>
        </div>
      </div>
    </div>
  `;
}

function renderApp() {
  const requests = Object.values(DB.requests).sort((a, b) => b.timestamp - a.timestamp);
  const events = Object.values(DB.events).sort((a, b) => new Date(a.date) - new Date(b.date));
  const notifs = DB.notifications.sort((a, b) => b.timestamp - a.timestamp);

  return `
    <div class="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 pb-24">
      <!-- HEADER -->
      <header class="bg-white/95 backdrop-blur-xl shadow-xl sticky top-0 z-30 border-b-2 border-purple-100">
        <div class="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-500 rounded-2xl flex items-center justify-center text-white font-black text-lg">
              ${DB.currentUser.username[0].toUpperCase()}
            </div>
            <div>
              <h2 class="font-black text-gray-800">${DB.currentUser.username}</h2>
              <p class="text-xs text-gray-500">${DB.currentUser.email}</p>
            </div>
            ${DB.currentUser.isAdmin ? '<div class="ml-2 bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full font-black text-xs">👑 Admin</div>' : ''}
          </div>
          <div class="flex gap-2">
            <button onclick="openTab('messages')" class="p-3 hover:bg-blue-100 rounded-xl">💬</button>
            <button onclick="openTab('admin')" class="p-3 hover:bg-purple-100 rounded-xl">⚙️</button>
            <button onclick="logout()" class="p-3 hover:bg-red-100 rounded-xl">🚪</button>
          </div>
        </div>
      </header>

      <!-- TABS NAV -->
      <nav class="bg-white/95 backdrop-blur-xl border-b-2 border-purple-100 sticky top-[88px] z-20">
        <div class="max-w-7xl mx-auto px-4 flex">
          <button onclick="openTab('requests')" class="tab-nav flex-1 py-5 font-black" data-tab="requests">⚡ Demandes</button>
          <button onclick="openTab('events')" class="tab-nav flex-1 py-5 font-black" data-tab="events">📅 Événements</button>
          <button onclick="openTab('notifications')" class="tab-nav flex-1 py-5 font-black" data-tab="notifications">🔔 Notifs <span class="bg-red-500 text-white text-xs rounded-full w-6 h-6 inline-flex items-center justify-center">${notifs.length}</span></button>
        </div>
      </nav>

      <!-- CONTENT -->
      <main class="max-w-7xl mx-auto p-4">
        <!-- REQUESTS TAB -->
        <div id="requestsTab" class="tab-content space-y-6">
          <div class="bg-gradient-to-br from-purple-500 to-pink-500 rounded-3xl p-6 shadow-2xl text-white">
            <h3 class="font-black text-2xl mb-4">✨ Nouvelle Demande</h3>
            <div class="grid grid-cols-2 gap-3 mb-4">
              ${['🎮 Jouer', '🍕 Manger', '🎬 Ciné', '⚽ Sport', '🎉 Sortir', '💪 Fitness', '🎵 Concert', '☕ Café'].map(t => 
                `<button onclick="selectType('${t}')" class="type-btn p-4 rounded-2xl font-bold bg-white/20 hover:bg-white hover:text-purple-600" data-type="${t}">${t}</button>`
              ).join('')}
            </div>
            <textarea id="requestMsg" placeholder="💬 Décris ta demande..." class="w-full px-4 py-4 rounded-2xl bg-white/10 text-white placeholder-white/60 font-medium border-2 border-white/20 focus:border-white outline-none resize-none" rows="3"></textarea>
            <button onclick="doAddRequest()" class="w-full mt-4 bg-white text-purple-600 py-4 rounded-2xl font-black hover:shadow-2xl">📤 Envoyer</button>
          </div>

          <div class="space-y-4">
            ${requests.length === 0 ? '<div class="bg-white rounded-3xl p-12 text-center shadow-xl"><p class="text-gray-500 font-bold">Aucune demande 📭</p></div>' : 
              requests.map(req => `
                <div class="bg-white rounded-3xl p-6 shadow-xl border-2 border-purple-100 animate-slideIn">
                  <div class="flex justify-between items-start mb-4">
                    <div class="flex gap-3">
                      <div class="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-500 rounded-2xl flex items-center justify-center text-white font-black">${req.user[0]}</div>
                      <div>
                        <h4 class="font-black text-gray-800">${req.user}</h4>
                        <span class="text-sm font-bold text-purple-600">${req.type}</span>
                      </div>
                    </div>
                    ${DB.currentUser.isAdmin ? `<button onclick="deleteRequest('${req.id}')" class="text-red-600 hover:bg-red-100 p-2 rounded">🗑️</button>` : ''}
                  </div>
                  <p class="text-gray-700 font-medium mb-4 bg-gray-50 p-4 rounded-2xl">${req.message}</p>
                  <div class="flex gap-3 mb-3">
                    <button onclick="respondRequest('${req.id}', 'yes')" class="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white py-4 rounded-2xl font-black">✅ Chaud!</button>
                    <button onclick="respondRequest('${req.id}', 'no')" class="flex-1 bg-gradient-to-r from-red-500 to-pink-500 text-white py-4 rounded-2xl font-black">❌ Pas dispo</button>
                  </div>
                  <button onclick="openCustomResponse('${req.id}')" class="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-4 rounded-2xl font-black">💬 Réponse perso</button>
                  ${Object.keys(req.responses).length > 0 ? `
                    <div class="mt-4 pt-4 border-t-2 border-gray-100">
                      <p class="font-bold text-gray-500 mb-2">Réponses (${Object.keys(req.responses).length})</p>
                      ${Object.values(req.responses).map(r => `
                        <div class="bg-gray-50 p-3 rounded-xl mb-2">
                          <div class="font-bold text-gray-700">${r.user}</div>
                          ${r.response !== 'custom' ? `<span class="inline-block mt-1 px-3 py-1 rounded-full text-sm font-bold ${r.response === 'yes' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">${r.response === 'yes' ? '✅ Chaud' : '❌ Non'}</span>` : ''}
                          ${r.customText ? `<p class="text-gray-600 mt-2 bg-blue-50 p-2 rounded border-l-4 border-blue-400">💬 ${r.customText}</p>` : ''}
                        </div>
                      `).join('')}
                    </div>
                  ` : ''}
                </div>
              `).join('')
            }
          </div>
        </div>

        <!-- EVENTS TAB -->
        <div id="eventsTab" class="tab-content space-y-6 hidden">
          <div class="bg-gradient-to-br from-pink-500 to-orange-500 rounded-3xl p-6 shadow-2xl text-white">
            <h3 class="font-black text-2xl mb-4">📅 Nouvel Événement</h3>
            <input type="text" id="eventTitle" placeholder="🎉 Titre" class="w-full px-4 py-4 rounded-2xl mb-3 bg-white/10 text-white placeholder-white/60 border-2 border-white/20 outline-none">
            <div class="flex gap-3 mb-3">
              <input type="date" id="eventDate" class="flex-1 px-4 py-4 rounded-2xl bg-white/10 text-white border-2 border-white/20 outline-none">
              <input type="time" id="eventTime" class="flex-1 px-4 py-4 rounded-2xl bg-white/10 text-white border-2 border-white/20 outline-none">
            </div>
            <button onclick="doAddEvent()" class="w-full bg-white text-pink-600 py-4 rounded-2xl font-black">➕ Créer</button>
          </div>

          <div class="space-y-4">
            ${events.length === 0 ? '<div class="bg-white rounded-3xl p-12 text-center"><p class="text-gray-500 font-bold">Aucun événement 📭</p></div>' :
              events.map(evt => `
                <div class="bg-white rounded-3xl p-6 shadow-xl border-2 border-pink-100 animate-slideIn">
                  <div class="flex justify-between items-start mb-3">
                    <div>
                      <h4 class="font-black text-2xl text-gray-800">${evt.title}</h4>
                      <div class="flex gap-3 mt-2">
                        <span class="bg-pink-50 px-3 py-1 rounded-xl font-bold">${new Date(evt.date).toLocaleDateString('fr-FR')}</span>
                        <span class="bg-orange-50 px-3 py-1 rounded-xl font-bold">🕒 ${evt.time}</span>
                      </div>
                    </div>
                    ${DB.currentUser.isAdmin ? `<button onclick="deleteEvent('${evt.id}')" class="text-red-600 hover:bg-red-100 p-2 rounded">🗑️</button>` : ''}
                  </div>
                  <button onclick="joinEvent('${evt.id}')" class="w-full ${evt.attendees[DB.currentUser.id] ? 'bg-green-100 text-green-700' : 'bg-gradient-to-r from-pink-500 to-orange-500 text-white'} py-4 rounded-2xl font-black">
                    ${evt.attendees[DB.currentUser.id] ? '✅ Tu participes!' : '➕ Je participe!'}
                  </button>
                  ${Object.keys(evt.attendees).length > 0 ? `
                    <div class="mt-4 pt-4 border-t-2 border-gray-100">
                      <p class="font-bold text-gray-500 mb-2">Participants (${Object.keys(evt.attendees).length})</p>
                      <div class="flex flex-wrap gap-2">
                        ${Object.values(evt.attendees).map(a => `<span class="bg-pink-100 text-pink-700 px-4 py-2 rounded-full font-bold">${a.username}</span>`).join('')}
                      </div>
                    </div>
                  ` : ''}
                </div>
              `).join('')
            }
          </div>
        </div>

        <!-- NOTIFICATIONS TAB -->
        <div id="notificationsTab" class="tab-content space-y-4 hidden">
          ${notifs.length === 0 ? '<div class="bg-white rounded-3xl p-12 text-center"><p class="text-gray-500 font-bold">Aucune notification 🔔</p></div>' :
            notifs.map(n => `
              <div class="bg-white rounded-2xl p-5 shadow-lg border-l-4 border-orange-500 animate-slideIn">
                <div class="flex justify-between items-center">
                  <p class="text-gray-800 font-bold">${n.message}</p>
                  <span class="text-sm text-gray-500">${n.time}</span>
                </div>
              </div>
            `).join('')
          }
        </div>
      </main>

      <!-- MODALS -->
      <!-- MESSAGES MODAL -->
      <div id="messagesModal" class="hidden fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-3xl w-full max-w-2xl h-[80vh] flex flex-col shadow-2xl animate-slideIn">
          <div class="bg-gradient-to-r from-blue-500 to-purple-500 text-white p-6 rounded-t-3xl flex justify-between items-center">
            <h3 class="text-2xl font-black">💬 Messages</h3>
            <button onclick="closeModal('messagesModal')" class="p-2 hover:bg-white/20 rounded">✕</button>
          </div>
          <div class="flex flex-1 overflow-hidden">
            <div class="w-1/3 border-r bg-gray-50 overflow-y-auto">
              ${Object.entries(DB.users).filter(([id]) => id !== DB.currentUser.id).map(([userId, user]) => `
                <button onclick="selectChatUser('${userId}')" class="w-full text-left p-4 border-b hover:bg-blue-100 chat-user" data-user="${userId}">
                  <p class="font-bold">${user.username}</p>
                  <p class="text-sm text-gray-500">${user.email}</p>
                </button>
              `).join('')}
            </div>
            <div class="w-2/3 flex flex-col">
              <div id="messagesArea" class="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50"></div>
              <div class="border-t p-4 flex gap-2">
                <input type="text" id="messageInput" placeholder="Écris..." class="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl outline-none">
                <button onclick="doSendMessage()" class="bg-blue-500 text-white p-3 rounded-xl font-bold">📤</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ADMIN MODAL -->
      <div id="adminModal" class="hidden fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-3xl p-8 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto animate-slideIn">
          <h3 class="text-3xl font-black mb-6 text-purple-600">⚙️ Admin Panel</h3>
          ${!DB.currentUser.isAdmin ? `
            <div class="space-y-4">
              <input type="password" id="adminPassword" placeholder="🔑 Mot de passe" class="w-full px-4 py-4 border-2 border-gray-200 rounded-xl outline-none">
              <button onclick="doAdminLogin()" class="w-full bg-gradient-to-r from-purple-600 to-pink-500 text-white py-4 rounded-xl font-black">🔓 Se connecter</button>
            </div>
          ` : `
            <div class="bg-green-50 border-2 border-green-300 rounded-xl p-6 mb-6">
              <p class="text-green-700 font-black text-center">✅ Mode admin activé</p>
            </div>
            <div class="space-y-3">
              ${Object.entries(DB.users).map(([userId, user]) => `
                <div class="bg-gray-50 p-4 rounded-2xl border-2 border-gray-200">
                  <div class="flex justify-between items-center mb-3">
                    <div>
                      <p class="font-black">${user.username}</p>
                      <p class="text-sm text-gray-500">${user.email}</p>
                    </div>
                    <div class="flex gap-1">
                      ${user.isAdmin ? '<span class="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-black">👑 Admin</span>' : ''}
                      ${user.isBanned ? '<span class="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-black">🚫 Banni</span>' : ''}
                    </div>
                  </div>
                  ${userId !== DB.currentUser.id ? `
                    <div class="flex gap-2 flex-wrap">
                      ${!user.isAdmin ? `<button onclick="promoteToAdmin('${userId}')" class="flex-1 bg-yellow-500 text-white py-2 px-3 rounded-xl text-sm font-bold">👑 Admin</button>` : `<button onclick="removeAdmin('${userId}')" class="flex-1 bg-gray-400 text-white py-2 px-3 rounded-xl text-sm font-bold">Retirer</button>`}
                      ${!user.isBanned ? `<button onclick="banUser('${userId}')" class="flex
