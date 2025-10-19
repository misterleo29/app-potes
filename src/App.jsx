<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>App Potes</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gradient-to-br from-purple-50 to-orange-50">

<div id="root"></div>

<script>
const app = {
  currentUser: null,
  users: {},
  requests: {},
  events: {},
  messages: {},
  notifications: [],
  selectedTab: 'requests',
  selectedType: null,
  selectedChatUser: null,
  customReqId: null,

  init() {
    this.load();
    this.requestNotifPermission();
    this.render();
  },

  save() {
    const data = { users: this.users, requests: this.requests, events: this.events, messages: this.messages, notifications: this.notifications, currentUser: this.currentUser };
    localStorage.setItem('appPotes', JSON.stringify(data));
  },

  load() {
    const data = localStorage.getItem('appPotes');
    if (data) {
      const parsed = JSON.parse(data);
      Object.assign(this, parsed);
    }
  },

  requestNotifPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  },

  notify(msg) {
    this.notifications.unshift({ id: Date.now(), msg, time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) });
    this.save();
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('App Potes', { body: msg, icon: '🎉' });
    }
    this.render();
  },

  signup(username, email, password) {
    if (!username || !email || !password) return alert('⚠️ Remplis tous les champs');
    if (Object.values(this.users).some(u => u.email === email)) return alert('❌ Email déjà utilisé');
    const id = 'u' + Date.now();
    this.users[id] = { id, username, email, isAdmin: false, isBanned: false };
    this.currentUser = { id, username, email, isAdmin: false };
    this.save();
    this.notify(`🎉 ${username} a rejoint l'app!`);
  },

  signin(email, password) {
    if (!email || !password) return alert('⚠️ Remplis tous les champs');
    const user = Object.values(this.users).find(u => u.email === email);
    if (!user) return alert('❌ Email introuvable');
    if (user.isBanned) return alert('❌ Compte banni');
    this.currentUser = { id: user.id, username: user.username, email: user.email, isAdmin: user.isAdmin };
    this.save();
    this.render();
  },

  logout() {
    this.currentUser = null;
    this.save();
    this.render();
  },

  addRequest(type, msg) {
    if (!type || !msg) return alert('⚠️ Remplis tous les champs');
    const id = 'r' + Date.now();
    this.requests[id] = { id, user: this.currentUser.username, userId: this.currentUser.id, type, msg, responses: {}, time: Date.now() };
    this.save();
    this.notify(`✨ ${this.currentUser.username}: ${type}`);
  },

  respondRequest(reqId, response, custom = null) {
    this.requests[reqId].responses[this.currentUser.id] = { user: this.currentUser.username, response, custom, time: Date.now() };
    this.save();
    this.notify(`👍 ${this.currentUser.username} a répondu`);
    this.render();
  },

  deleteRequest(id) {
    delete this.requests[id];
    this.save();
    this.render();
  },

  addEvent(title, date, time) {
    if (!title || !date || !time) return alert('⚠️ Remplis tous les champs');
    const id = 'e' + Date.now();
    this.events[id] = { id, title, date, time, attendees: {}, createdBy: this.currentUser.id };
    this.save();
    this.notify(`📅 ${title}`);
  },

  joinEvent(eventId) {
    if (!this.events[eventId].attendees[this.currentUser.id]) {
      this.events[eventId].attendees[this.currentUser.id] = this.currentUser.username;
      this.save();
      this.notify(`🎉 ${this.currentUser.username} participe!`);
    }
  },

  deleteEvent(id) {
    delete this.events[id];
    this.save();
    this.render();
  },

  sendMessage(toId, text) {
    if (!text.trim()) return;
    const key = [this.currentUser.id, toId].sort().join('_');
    if (!this.messages[key]) this.messages[key] = [];
    this.messages[key].push({ from: this.currentUser.id, fromName: this.currentUser.username, text, time: Date.now() });
    this.save();
    this.notify(`💬 Message de ${this.currentUser.username}`);
  },

  getMessages(otherId) {
    const key = [this.currentUser.id, otherId].sort().join('_');
    return this.messages[key] || [];
  },

  adminLogin(pwd) {
    if (pwd !== 'admin123') return alert('❌ Mot de passe incorrect');
    this.users[this.currentUser.id].isAdmin = true;
    this.currentUser.isAdmin = true;
    this.save();
    this.notify('⚙️ Mode admin activé');
  },

  promoteAdmin(userId) {
    this.users[userId].isAdmin = true;
    this.save();
    this.notify(`👑 ${this.users[userId].username} est admin`);
  },

  removeAdmin(userId) {
    this.users[userId].isAdmin = false;
    this.save();
    this.notify(`👤 ${this.users[userId].username} n'est plus admin`);
  },

  banUser(userId) {
    this.users[userId].isBanned = true;
    this.save();
    this.notify(`🚫 ${this.users[userId].username} banni`);
  },

  unbanUser(userId) {
    this.users[userId].isBanned = false;
    this.save();
    this.notify(`✅ ${this.users[userId].username} débanni`);
  },

  render() {
    const root = document.getElementById('root');
    if (!this.currentUser) {
      root.innerHTML = this.renderAuth();
    } else {
      root.innerHTML = this.renderApp();
      this.attachListeners();
    }
  },

  renderAuth() {
    return `
      <div class="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 flex items-center justify-center p-4">
        <div class="bg-white/95 rounded-3xl p-8 w-full max-w-md shadow-2xl">
          <div class="text-center mb-8">
            <div class="text-6xl mb-4">🎉</div>
            <h1 class="text-4xl font-black bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">App Potes</h1>
            <p class="text-gray-600 font-bold mt-2">Connecte-toi ! 🚀</p>
          </div>

          <div id="authTabs" class="flex gap-2 mb-6 bg-gray-100 p-1 rounded-2xl">
            <button onclick="app.switchAuth('login')" class="flex-1 py-3 rounded-xl font-bold auth-tab active bg-purple-500 text-white" data-tab="login">Connexion</button>
            <button onclick="app.switchAuth('signup')" class="flex-1 py-3 rounded-xl font-bold auth-tab" data-tab="signup">Inscription</button>
          </div>

          <div id="loginForm" class="space-y-4">
            <input type="email" id="loginEmail" placeholder="📧 Email" class="w-full px-4 py-4 border-2 border-gray-200 rounded-xl outline-none focus:border-purple-500">
            <input type="password" id="loginPassword" placeholder="🔒 Mot de passe" class="w-full px-4 py-4 border-2 border-gray-200 rounded-xl outline-none focus:border-purple-500">
            <button onclick="app.doSignIn()" class="w-full bg-gradient-to-r from-purple-600 to-pink-500 text-white py-4 rounded-xl font-black">🚀 Connexion</button>
          </div>

          <div id="signupForm" class="space-y-4 hidden">
            <input type="text" id="signupUsername" placeholder="✨ Pseudo" class="w-full px-4 py-4 border-2 border-gray-200 rounded-xl outline-none focus:border-purple-500">
            <input type="email" id="signupEmail" placeholder="📧 Email" class="w-full px-4 py-4 border-2 border-gray-200 rounded-xl outline-none focus:border-purple-500">
            <input type="password" id="signupPassword" placeholder="🔒 Mot de passe" class="w-full px-4 py-4 border-2 border-gray-200 rounded-xl outline-none focus:border-purple-500">
            <button onclick="app.doSignUp()" class="w-full bg-gradient-to-r from-purple-600 to-pink-500 text-white py-4 rounded-xl font-black">✨ Créer</button>
          </div>
        </div>
      </div>
    `;
  },

  renderApp() {
    const reqs = Object.values(this.requests).sort((a, b) => b.time - a.time);
    const evts = Object.values(this.events).sort((a, b) => new Date(a.date) - new Date(b.date));
    const notifs = this.notifications.slice(0, 50);

    return `
      <div class="min-h-screen pb-24">
        <!-- HEADER -->
        <header class="bg-white/95 shadow-xl sticky top-0 z-30 border-b-2 border-purple-100">
          <div class="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-500 rounded-2xl flex items-center justify-center text-white font-black">${this.currentUser.username[0].toUpperCase()}</div>
              <div>
                <h2 class="font-black text-gray-800">${this.currentUser.username}</h2>
                <p class="text-xs text-gray-500">${this.currentUser.email}</p>
              </div>
              ${this.currentUser.isAdmin ? '<span class="ml-3 bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full font-black text-xs">👑 Admin</span>' : ''}
            </div>
            <div class="flex gap-2">
              <button onclick="app.openModal('messages')" class="p-3 hover:bg-blue-100 rounded-xl text-lg">💬</button>
              <button onclick="app.openModal('admin')" class="p-3 hover:bg-purple-100 rounded-xl text-lg">⚙️</button>
              <button onclick="app.logout()" class="p-3 hover:bg-red-100 rounded-xl text-lg">🚪</button>
            </div>
          </div>
        </header>

        <!-- NAV TABS -->
        <nav class="bg-white/95 border-b-2 border-purple-100 sticky top-[88px] z-20">
          <div class="max-w-7xl mx-auto px-4 flex">
            <button onclick="app.selectedTab='requests'; app.render()" class="tab-nav flex-1 py-4 font-black ${this.selectedTab === 'requests' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500'}">⚡ Demandes</button>
            <button onclick="app.selectedTab='events'; app.render()" class="tab-nav flex-1 py-4 font-black ${this.selectedTab === 'events' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500'}">📅 Événements</button>
            <button onclick="app.selectedTab='notifications'; app.render()" class="tab-nav flex-1 py-4 font-black ${this.selectedTab === 'notifications' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500'}">🔔 Notifs ${notifs.length > 0 ? `<span class="inline-block ml-1 bg-red-500 text-white text-xs rounded-full w-5 h-5">${notifs.length}</span>` : ''}</button>
          </div>
        </nav>

        <!-- CONTENT -->
        <main class="max-w-7xl mx-auto p-4">
          <!-- REQUESTS -->
          ${this.selectedTab === 'requests' ? `
            <div class="bg-gradient-to-br from-purple-500 to-pink-500 rounded-3xl p-6 text-white mb-6 shadow-2xl">
              <h3 class="font-black text-2xl mb-4">✨ Nouvelle Demande</h3>
              <div class="grid grid-cols-2 gap-3 mb-4">
                ${['🎮 Jouer', '🍕 Manger', '🎬 Ciné', '⚽ Sport', '🎉 Sortir', '💪 Fitness', '🎵 Concert', '☕ Café'].map(t => 
                  `<button onclick="app.selectType('${t}')" class="type-btn p-3 rounded-xl font-bold ${this.selectedType === t ? 'bg-white text-purple-600' : 'bg-white/20'}">${t}</button>`
                ).join('')}
              </div>
              <textarea id="reqMsg" placeholder="💬 Décris..." class="w-full px-4 py-4 rounded-xl bg-white/10 text-white placeholder-white/60 border-2 border-white/20 outline-none" rows="3"></textarea>
              <button onclick="app.doAddRequest()" class="w-full mt-4 bg-white text-purple-600 py-4 rounded-xl font-black">📤 Envoyer</button>
            </div>

            <div class="space-y-4">
              ${reqs.length === 0 ? '<div class="bg-white rounded-3xl p-12 text-center">Aucune demande 📭</div>' :
                reqs.map(req => `
                  <div class="bg-white rounded-3xl p-6 shadow-xl border-2 border-purple-100">
                    <div class="flex justify-between items-start mb-3">
                      <div class="flex gap-3">
                        <div class="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-500 rounded-xl flex items-center justify-center text-white font-black text-sm">${req.user[0]}</div>
                        <div>
                          <p class="font-black text-gray-800">${req.user}</p>
                          <p class="text-sm text-purple-600">${req.type}</p>
                        </div>
                      </div>
                      ${this.currentUser.isAdmin ? `<button onclick="app.deleteRequest('${req.id}')" class="text-red-600 text-lg">🗑️</button>` : ''}
                    </div>
                    <p class="text-gray-700 mb-4 bg-gray-50 p-3 rounded-xl">${req.msg}</p>
                    <div class="flex gap-2 mb-2">
                      <button onclick="app.respondRequest('${req.id}', 'yes')" class="flex-1 bg-green-500 text-white py-3 rounded-xl font-black">✅ Chaud!</button>
                      <button onclick="app.respondRequest('${req.id}', 'no')" class="flex-1 bg-red-500 text-white py-3 rounded-xl font-black">❌ Non</button>
                    </div>
                    <button onclick="app.openCustomResp('${req.id}')" class="w-full bg-blue-500 text-white py-3 rounded-xl font-black">💬 Perso</button>
                    ${Object.keys(req.responses).length > 0 ? `
                      <div class="mt-4 pt-4 border-t-2 border-gray-200">
                        <p class="font-bold text-gray-600 mb-2">Réponses (${Object.keys(req.responses).length})</p>
                        ${Object.values(req.responses).map(r => `
                          <div class="bg-gray-50 p-3 rounded-lg mb-2">
                            <p class="font-bold text-gray-700">${r.user}</p>
                            ${r.response !== 'custom' ? `<span class="inline-block mt-1 text-xs font-bold px-2 py-1 rounded ${r.response === 'yes' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">${r.response === 'yes' ? '✅ Chaud' : '❌ Non'}</span>` : ''}
                            ${r.custom ? `<p class="mt-2 text-gray-700 bg-blue-50 p-2 rounded border-l-4 border-blue-400">💬 ${r.custom}</p>` : ''}
                          </div>
                        `).join('')}
                      </div>
                    ` : ''}
                  </div>
                `).join('')
              }
            </div>
          ` : ''}

          <!-- EVENTS -->
          ${this.selectedTab === 'events' ? `
            <div class="bg-gradient-to-br from-pink-500 to-orange-500 rounded-3xl p-6 text-white mb-6 shadow-2xl">
              <h3 class="font-black text-2xl mb-4">📅 Nouvel Événement</h3>
              <input type="text" id="evtTitle" placeholder="Titre" class="w-full px-4 py-3 rounded-xl mb-3 bg-white/10 text-white placeholder-white/60 border-2 border-white/20 outline-none">
              <div class="flex gap-3 mb-3">
                <input type="date" id="evtDate" class="flex-1 px-4 py-3 rounded-xl bg-white/10 text-white border-2 border-white/20 outline-none">
                <input type="time" id="evtTime" class="flex-1 px-4 py-3 rounded-xl bg-white/10 text-white border-2 border-white/20 outline-none">
              </div>
              <button onclick="app.doAddEvent()" class="w-full bg-white text-pink-600 py-4 rounded-xl font-black">➕ Créer</button>
            </div>

            <div class="space-y-4">
              ${evts.length === 0 ? '<div class="bg-white rounded-3xl p-12 text-center">Aucun événement 📭</div>' :
                evts.map(evt => `
                  <div class="bg-white rounded-3xl p-6 shadow-xl border-2 border-pink-100">
                    <div class="flex justify-between items-start mb-3">
                      <div>
                        <h4 class="font-black text-xl text-gray-800">${evt.title}</h4>
                        <div class="flex gap-2 mt-2">
                          <span class="bg-pink-50 px-3 py-1 rounded-xl text-sm font-bold">${new Date(evt.date).toLocaleDateString('fr-FR')}</span>
                          <span class="bg-orange-50 px-3 py-1 rounded-xl text-sm font-bold">🕒 ${evt.time}</span>
                        </div>
                      </div>
                      ${this.currentUser.isAdmin ? `<button onclick="app.deleteEvent('${evt.id}')" class="text-red-600 text-lg">🗑️</button>` : ''}
                    </div>
                    <button onclick="app.joinEvent('${evt.id}')" class="w-full py-3 rounded-xl font-black ${evt.attendees[this.currentUser.id] ? 'bg-green-100 text-green-700' : 'bg-pink-500 text-white'}">${evt.attendees[this.currentUser.id] ? '✅ Tu participes' : '➕ Je participe'}</button>
                    ${Object.keys(evt.attendees).length > 0 ? `
                      <div class="mt-4 pt-4 border-t-2 border-gray-200">
                        <p class="font-bold text-gray-600 mb-2">Participants (${Object.keys(evt.attendees).length})</p>
                        <div class="flex flex-wrap gap-2">
                          ${Object.values(evt.attendees).map(a => `<span class="bg-pink-100 text-pink-700 px-3 py-1 rounded-full text-sm font-bold">${a}</span>`).join('')}
                        </div>
                      </div>
                    ` : ''}
                  </div>
                `).join('')
              }
            </div>
          ` : ''}

          <!-- NOTIFICATIONS -->
          ${this.selectedTab === 'notifications' ? `
            <div class="space-y-3">
              ${notifs.length === 0 ? '<div class="bg-white rounded-3xl p-12 text-center">Aucune notification 🔔</div>' :
                notifs.map(n => `
                  <div class="bg-white rounded-2xl p-4 shadow-lg border-l-4 border-orange-500">
                    <div class="flex justify-between items-center">
                      <p class="font-bold text-gray-800">${n.msg}</p>
                      <span class="text-xs text-gray-500">${n.time}</span>
                    </div>
                  </div>
                `).join('')
              }
            </div>
          ` : ''}
        </main>

        <!-- MESSAGES MODAL -->
        <div id="messagesModal" class="hidden fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div class="bg-white rounded-3xl w-full max-w-2xl h-[80vh] flex flex-col shadow-2xl">
            <div class="bg-gradient-to-r from-blue-500 to-purple-500 text-white p-4 rounded-t-3xl flex justify-between">
              <h3 class="font-black text-xl">💬 Messages</h3>
              <button onclick="app.closeModal('messagesModal')" class="text-lg">✕</button>
            </div>
            <div class="flex flex-1 overflow-hidden">
              <div class="w-1/3 border-r bg-gray-50 overflow-y-auto">
                ${Object.entries(this.users).filter(([id]) => id !== this.currentUser.id).map(([uid, u]) => 
                  `<button onclick="app.selectChat('${uid}')" class="w-full text-left p-4 border-b hover:bg-blue-100 ${this.selectedChatUser === uid ? 'bg-blue-100' : ''}">
                    <p class="font-bold">${u.username}</p>
                    <p class="text-sm text-gray-500">${u.email}</p>
                  </button>`
                ).join('')}
              </div>
              <div class="w-2/3 flex flex-col">
                <div id="messagesArea" class="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50"></div>
                <div class="border-t p-4 flex gap-2">
                  <input type="text" id="msgInput" placeholder="Écris..." class="flex-1 px-4 py-2 border-2 border-gray-200 rounded-xl outline-none">
                  <button onclick="app.doSendMessage()" class="bg-blue-500 text-white px-4 py-2 rounded-xl font-bold">📤</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ADMIN MODAL -->
        <div id="adminModal" class="hidden fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div class="bg-white rounded-3xl p-6 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 class="font-black text-2xl text-purple-600 mb-4">⚙️ Admin Panel</h3>
            ${!this.currentUser.isAdmin ? `
              <input type="password" id="adminPwd" placeholder="Mot de passe" class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl outline-none mb-3">
              <button onclick="app.doAdminLogin()" class="w-full bg-purple-600 text-white py-3 rounded-xl font-black">🔓 Connecter</button>
            ` : `
              <div class="bg-green-50 border-2 border-green-300 rounded-xl p-4 mb-4">
                <p class="font-black text-green-700 text-center">✅ Mode admin activé</p>
              </div>
              <div class="space-y-3">
                ${Object.entries(this.users).map(([uid, u]) => `
                  <div class="bg-gray-50 p-4 rounded-xl border-2 border-gray-200">
                    <div class="flex justify-between items-center mb-3">
                      <div>
                        <p class="font-black">${u.username}</p>
                        <p class="text-sm text-gray-500">${u.email}</p>
                      </div>
                      <div>
                        ${u.isAdmin ? '<span class="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-black">👑</span>' : ''}
                        ${u.isBanned ? '<span class="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-black">🚫</span>' : ''}
                      </div>
                    </div>
                    ${uid !== this.currentUser.id ? `
                      <div class="flex gap-2">
                        ${!u.isAdmin ? `<button onclick="app.promoteAdmin('${uid}')" class="flex-1 bg-yellow-500 text-white py-2 rounded-lg text-sm font-bold">👑</button>` : `<button onclick="app.removeAdmin('${uid}')" class="flex-1 bg-gray-400 text-white py-2 rounded-lg text-sm font-bold">Retirer</button>`}
                        ${!u.isBanned ? `<button onclick="app.banUser('${uid}')" class="flex-1 bg-red-500 text-white py-2 rounded-lg text-sm font-bold">🚫</button>` : `<button onclick="app.unbanUser('${uid}')" class="flex-1 bg-green-500 text-white py-2 rounded-lg text-sm font-bold">✅</button>`}
                      </div>
                    ` : ''}
                  </div>
                `).join('')}
              </div>
            `}
            <button onclick="app.closeModal('adminModal')" class="w-full mt-4 bg-gray-200 py-3 rounded-xl font-bold">Fermer</button>
          </div>
        </div>

        <!-- CUSTOM RESPONSE MODAL -->
        <div id="customModal" class="hidden fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div class="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <h3 class="font-black text-xl text-purple-600 mb-4">💬 Réponse personnalisée</h3>
            <textarea id="customText" placeholder="Écris ta réponse..." class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl outline-none resize-none" rows="4"></textarea>
            <div class="flex gap-3 mt-4">
              <button onclick="app.closeModal('customModal')" class="flex-1 bg-gray-200 py-3 rounded-xl font-bold">Annuler</button>
              <button onclick="app.doCustomResp()" class="flex-1 bg-purple-600 text-white py-3 rounded-xl font-black">Envoyer</button>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  attachListeners() {},

  switchAuth(tab) {
    document.querySelectorAll('.auth-tab').forEach(b => b.classList.remove('bg-purple-500', 'text-white'));
    document.querySelector(`[data-tab="${tab}"]`).classList.add('bg-purple-500', 'text-white');
    document.querySelectorAll('[id*="Form"]').forEach(f
