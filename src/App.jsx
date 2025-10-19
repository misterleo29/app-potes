import React, { useState, useEffect, useRef } from 'react';
import { User, Calendar, Bell, Settings, LogOut, Plus, Trash2, Check, X, Sparkles, Users, Clock, Phone, Mic, MicOff, PhoneOff, Send, MessageCircle, Zap, Edit3, UserX, Shield, Crown, Eye, EyeOff } from 'lucide-react';

// Base de données locale en mémoire
const DB = {
  users: {},
  requests: {},
  events: {},
  notifications: [],
  messages: {}
};

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('requests');
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [requests, setRequests] = useState([]);
  const [newRequestType, setNewRequestType] = useState('');
  const [newRequestMessage, setNewRequestMessage] = useState('');
  const [events, setEvents] = useState([]);
  const [newEvent, setNewEvent] = useState({ title: '', date: '', time: '' });
  const [notifications, setNotifications] = useState([]);
  const [isInCall, setIsInCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);
  const [showCustomResponseModal, setShowCustomResponseModal] = useState(null);
  const [customResponseText, setCustomResponseText] = useState('');
  const [allUsers, setAllUsers] = useState({});
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [messages, setMessages] = useState({});
  const [newMessage, setNewMessage] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const localStreamRef = useRef(null);

  const requestTypes = ['🎮 Jouer', '🍕 Manger', '🎬 Ciné', '⚽ Sport', '🎉 Sortir', '💪 Fitness', '🎵 Concert', '☕ Café'];

  // Charger les données au démarrage
  useEffect(() => {
    const saved = localStorage.getItem('appPotesDB');
    if (saved) {
      const parsed = JSON.parse(saved);
      Object.assign(DB, parsed);
    }
    const savedAuth = localStorage.getItem('appPotesAuth');
    if (savedAuth) {
      const auth = JSON.parse(savedAuth);
      setUser(auth);
      setUsername(auth.username);
      setIsAdmin(auth.isAdmin || false);
      loadAllData();
    }
    setLoading(false);

    // Demander permission pour notifications
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          setNotificationsEnabled(true);
        }
      });
    } else if ('Notification' in window && Notification.permission === 'granted') {
      setNotificationsEnabled(true);
    }
  }, []);

  const loadAllData = () => {
    setRequests(Object.values(DB.requests || {}).sort((a, b) => b.timestamp - a.timestamp));
    setEvents(Object.values(DB.events || {}).sort((a, b) => new Date(a.date) - new Date(b.date)));
    setNotifications(Object.values(DB.notifications || []).sort((a, b) => b.timestamp - a.timestamp));
    setAllUsers(DB.users || {});
    setMessages(DB.messages || {});
  };

  const saveDB = () => {
    localStorage.setItem('appPotesDB', JSON.stringify(DB));
  };

  const sendNotification = (title, options = {}) => {
    if (notificationsEnabled && 'Notification' in window) {
      new Notification(title, {
        icon: '🎉',
        ...options
      });
    }
  };

  const addNotification = (message) => {
    const notif = { 
      id: Date.now(), 
      message, 
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }), 
      timestamp: Date.now() 
    };
    DB.notifications.push(notif);
    setNotifications([notif, ...notifications]);
    saveDB();
    sendNotification(message);
  };

  const handleSignUp = () => {
    if (!email || !password || !username) return alert('⚠️ Remplis tous les champs');
    if (Object.values(DB.users).some(u => u.email === email)) {
      return alert('❌ Email déjà utilisé');
    }
    const userId = 'user_' + Date.now();
    DB.users[userId] = {
      id: userId,
      username,
      email,
      isAdmin: false,
      isBanned: false,
      createdAt: Date.now()
    };
    saveDB();
    const userData = { id: userId, username, email, isAdmin: false };
    setUser(userData);
    setUsername(username);
    localStorage.setItem('appPotesAuth', JSON.stringify(userData));
    addNotification(`🎉 ${username} a rejoint l'app !`);
    setEmail('');
    setPassword('');
    setUsername('');
  };

  const handleSignIn = () => {
    if (!email || !password) return alert('⚠️ Remplis tous les champs');
    const userObj = Object.values(DB.users).find(u => u.email === email);
    if (!userObj) return alert('❌ Email introuvable');
    if (userObj.isBanned) return alert('❌ Ton compte a été banni');
    const userData = { id: userObj.id, username: userObj.username, email: userObj.email, isAdmin: userObj.isAdmin };
    setUser(userData);
    setUsername(userObj.username);
    setIsAdmin(userObj.isAdmin);
    localStorage.setItem('appPotesAuth', JSON.stringify(userData));
    loadAllData();
    setEmail('');
    setPassword('');
  };

  const handleLogout = () => {
    setUser(null);
    setIsAdmin(false);
    setUsername('');
    localStorage.removeItem('appPotesAuth');
  };

  const handleAdminLogin = () => {
    if (adminPassword === 'admin123') {
      DB.users[user.id].isAdmin = true;
      saveDB();
      setIsAdmin(true);
      setShowAdminPanel(false);
      localStorage.setItem('appPotesAuth', JSON.stringify({ ...user, isAdmin: true }));
      addNotification('⚙️ Mode admin activé');
    } else {
      alert('❌ Mot de passe incorrect');
    }
    setAdminPassword('');
  };

  const promoteToAdmin = (userId) => {
    DB.users[userId].isAdmin = true;
    saveDB();
    setAllUsers({ ...DB.users });
    addNotification(`👑 ${DB.users[userId].username} est devenu admin`);
  };

  const removeAdmin = (userId) => {
    DB.users[userId].isAdmin = false;
    saveDB();
    setAllUsers({ ...DB.users });
    addNotification(`👤 ${DB.users[userId].username} n'est plus admin`);
  };

  const banUser = (userId) => {
    DB.users[userId].isBanned = true;
    saveDB();
    setAllUsers({ ...DB.users });
    addNotification(`🚫 ${DB.users[userId].username} a été banni`);
  };

  const unbanUser = (userId) => {
    DB.users[userId].isBanned = false;
    saveDB();
    setAllUsers({ ...DB.users });
    addNotification(`✅ ${DB.users[userId].username} a été débanni`);
  };

  const kickUser = (userId) => {
    addNotification(`👢 ${DB.users[userId].username} a été expulsé`);
  };

  const addRequest = () => {
    if (!newRequestType || !newRequestMessage) return alert('⚠️ Remplis tous les champs');
    const id = 'req_' + Date.now();
    DB.requests[id] = {
      id,
      user: username,
      userId: user.id,
      type: newRequestType,
      message: newRequestMessage,
      responses: {},
      timestamp: Date.now()
    };
    saveDB();
    setRequests(Object.values(DB.requests).sort((a, b) => b.timestamp - a.timestamp));
    setNewRequestType('');
    setNewRequestMessage('');
    addNotification(`✨ ${username} : ${newRequestType}`);
  };

  const respondToRequest = (requestId, response, customText = null) => {
    DB.requests[requestId].responses[user.id] = {
      user: username,
      response,
      customText: customText || null,
      timestamp: Date.now()
    };
    saveDB();
    setRequests(Object.values(DB.requests).sort((a, b) => b.timestamp - a.timestamp));
    addNotification(`👍 ${username} a répondu à une demande`);
    setShowCustomResponseModal(null);
    setCustomResponseText('');
  };

  const deleteRequest = (id) => {
    delete DB.requests[id];
    saveDB();
    setRequests(Object.values(DB.requests).sort((a, b) => b.timestamp - a.timestamp));
    addNotification('🗑️ Demande supprimée');
  };

  const addEvent = () => {
    if (!newEvent.title || !newEvent.date || !newEvent.time) return alert('⚠️ Remplis tous les champs');
    const id = 'evt_' + Date.now();
    DB.events[id] = {
      id,
      ...newEvent,
      attendees: {},
      createdBy: user.id,
      timestamp: Date.now()
    };
    saveDB();
    setEvents(Object.values(DB.events).sort((a, b) => new Date(a.date) - new Date(b.date)));
    setNewEvent({ title: '', date: '', time: '' });
    addNotification(`📅 Nouvel événement : ${newEvent.title}`);
  };

  const joinEvent = (eventId) => {
    DB.events[eventId].attendees[user.id] = {
      username,
      timestamp: Date.now()
    };
    saveDB();
    setEvents(Object.values(DB.events).sort((a, b) => new Date(a.date) - new Date(b.date)));
    addNotification(`🎉 ${username} participe !`);
  };

  const deleteEvent = (id) => {
    delete DB.events[id];
    saveDB();
    setEvents(Object.values(DB.events).sort((a, b) => new Date(a.date) - new Date(b.date)));
    addNotification('🗑️ Événement supprimé');
  };

  const getMessages = (otherId) => {
    const key = [user.id, otherId].sort().join('_');
    return DB.messages[key] || [];
  };

  const sendMessage = (recipientId) => {
    if (!newMessage.trim()) return;
    const key = [user.id, recipientId].sort().join('_');
    if (!DB.messages[key]) DB.messages[key] = [];
    DB.messages[key].push({
      from: user.id,
      fromName: username,
      text: newMessage,
      timestamp: Date.now()
    });
    saveDB();
    setMessages({ ...DB.messages });
    setNewMessage('');
    addNotification(`💬 Message de ${username}`);
    sendNotification(`Nouveau message de ${username}`, { tag: 'message' });
  };

  const startCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      setIsInCall(true);
      setShowCallModal(true);
      addNotification('📞 Appel vocal démarré');
      sendNotification('Appel vocal actif', { tag: 'call' });
    } catch (error) {
      alert('❌ Micro inaccessible');
    }
  };

  const endCall = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    setIsInCall(false);
    setShowCallModal(false);
    addNotification('📞 Appel terminé');
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 flex items-center justify-center">
        <div className="text-center">
          <div className="w-24 h-24 border-8 border-white border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
          <div className="text-white text-3xl font-black animate-pulse">App Potes</div>
          <div className="text-white/80 text-lg mt-2">Chargement...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute w-96 h-96 bg-white/10 rounded-full -top-48 -left-48 animate-pulse"></div>
          <div className="absolute w-96 h-96 bg-white/10 rounded-full -bottom-48 -right-48 animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>

        <div className="bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl p-8 w-full max-w-md relative z-10 border border-white/20">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-purple-600 to-pink-500 rounded-3xl mb-4 shadow-xl animate-bounce">
              <Sparkles className="w-16 h-16 text-white" />
            </div>
            <h1 className="text-5xl font-black bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 bg-clip-text text-transparent mb-2">
              App Potes
            </h1>
            <p className="text-gray-600 font-bold text-lg">Connecte-toi avec tes potes ! 🎉</p>
          </div>

          <div className="flex gap-2 mb-6 p-1 bg-gray-100 rounded-2xl">
            <button
              onClick={() => setAuthMode('login')}
              className={`flex-1 py-4 rounded-xl font-bold transition-all duration-300 ${
                authMode === 'login'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-lg scale-105'
                  : 'text-gray-600 hover:bg-gray-200'
              }`}
            >
              Connexion
            </button>
            <button
              onClick={() => setAuthMode('signup')}
              className={`flex-1 py-4 rounded-xl font-bold transition-all duration-300 ${
                authMode === 'signup'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-lg scale-105'
                  : 'text-gray-600 hover:bg-gray-200'
              }`}
            >
              Inscription
            </button>
          </div>

          <div className="space-y-4">
            {authMode === 'signup' && (
              <input
                type="text"
                placeholder="✨ Ton pseudo"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-200 focus:border-purple-500 outline-none transition-all text-lg"
              />
            )}
            <input
              type="email"
              placeholder="📧 Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-200 focus:border-purple-500 outline-none transition-all text-lg"
            />
            <input
              type="password"
              placeholder="🔒 Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-200 focus:border-purple-500 outline-none transition-all text-lg"
            />
            <button
              onClick={authMode === 'signup' ? handleSignUp : handleSignIn}
              className="w-full bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 text-white py-5 rounded-xl font-black text-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 transform active:scale-95"
            >
              {authMode === 'signup' ? '✨ Créer mon compte' : '🚀 Se connecter'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 pb-24">
      <header className="bg-white/95 backdrop-blur-xl shadow-xl sticky top-0 z-30 border-b-2 border-purple-100">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-600 via-pink-500 to-orange-500 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-xl">
                {username?.[0]?.toUpperCase()}
              </div>
              {isAdmin && (
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-400 rounded-full border-2 border-white flex items-center justify-center">
                  <Crown className="w-3 h-3 text-white" />
                </div>
              )}
            </div>
            <div>
              <h2 className="font-black text-gray-800 text-lg">{username}</h2>
              <p className="text-xs text-gray-500 font-medium">{email}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {!isInCall && (
              <button
                onClick={startCall}
                className="p-3 hover:bg-green-100 rounded-xl transition-all transform hover:scale-110 active:scale-95"
                title="Appel vocal"
              >
                <Phone className="w-6 h-6 text-green-600" />
              </button>
            )}
            <button
              onClick={() => setShowMessages(!showMessages)}
              className="p-3 hover:bg-blue-100 rounded-xl transition-all transform hover:scale-110 active:scale-95 relative"
            >
              <MessageCircle className="w-6 h-6 text-blue-600" />
            </button>
            <button
              onClick={() => setShowAdminPanel(!showAdminPanel)}
              className="p-3 hover:bg-purple-100 rounded-xl transition-all transform hover:scale-110 active:scale-95"
            >
              <Settings className="w-6 h-6 text-purple-600" />
            </button>
            <button
              onClick={handleLogout}
              className="p-3 hover:bg-red-100 rounded-xl transition-all transform hover:scale-110 active:scale-95"
            >
              <LogOut className="w-6 h-6 text-red-600" />
            </button>
          </div>
        </div>
      </header>

      {showCallModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-purple-600 to-pink-500 rounded-3xl p-8 w-full max-w-md text-center shadow-2xl animate-bounce">
            <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
              <Phone className="w-12 h-12 text-white" />
            </div>
            <h3 className="text-3xl font-black text-white mb-2">Appel en cours</h3>
            <p className="text-white/90 mb-8 font-medium">Discute avec tes potes en direct</p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={toggleMute}
                className={`p-5 rounded-full transition-all transform hover:scale-110 active:scale-95 ${
                  isMuted ? 'bg-red-500' : 'bg-white/20'
                }`}
              >
                {isMuted ? <MicOff className="w-7 h-7 text-white" /> : <Mic className="w-7 h-7 text-white" />}
              </button>
              <button
                onClick={endCall}
                className="p-5 bg-red-500 hover:bg-red-600 rounded-full transition-all transform hover:scale-110 active:scale-95"
              >
                <PhoneOff className="w-7 h-7 text-white" />
              </button>
            </div>
          </div>
        </div>
      )}

      {showMessages && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl h-[80vh] flex flex-col shadow-2xl">
            <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white p-6 rounded-t-3xl flex items-center justify-between">
              <h3 className="text-2xl font-black flex items-center gap-2">
                <MessageCircle className="w-6 h-6" />
                Messagerie
              </h3>
              <button onClick={() => setShowMessages(false)} className="p-2 hover:bg-white/20 rounded-lg">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex flex-1 overflow-hidden">
              <div className="w-1/3 border-r bg-gray-50 overflow-y-auto">
                {Object.entries(DB.users).filter(([id]) => id !== user.id).map(([userId, userData]) => (
                  <button
                    key={userId}
                    onClick={() => setSelectedUser(userId)}
                    className={`w-full p-4 text-left border-b transition-all ${
                      selectedUser === userId ? 'bg-blue-100 border-blue-300' : 'hover:bg-gray-100'
                    }`}
                  >
                    <p className="font-bold text-gray-800">{userData.username}</p>
                    <p className="text-sm text-gray-500">{userData.email}</p>
                  </button>
                ))}
              </div>

              <div className="w-2/3 flex flex-col">
                {selectedUser ? (
                  <>
                    <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
                      {getMessages(selectedUser).map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.from === user.id ? 'justify-end' : 'justify-start'}`}>
                          <div
                            className={`max-w-xs p-4 rounded-2xl ${
                              msg.from === user.id
                                ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-br-none'
                                : 'bg-white text-gray-800 rounded-bl-none border-2 border-gray-200'
                            }`}
                          >
                            <p className="font-bold text-sm mb-1">{msg.fromName}</p>
                            <p className="break-words">{msg.text}</p>
                            <p className="text-xs opacity-70 mt-1">
                              {new Date(msg.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="border-t p-4 flex gap-2 bg-white rounded-b-3xl">
                      <input
                        type="text"
                        placeholder="Écris ton message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && sendMessage(selectedUser)}
                        className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-200 outline-none text-gray-800"
                      />
                      <button
                        onClick={() => sendMessage(selectedUser)}
                        className="bg-gradient-to-r from-blue-500 to-purple-500 text-white p-3 rounded-xl hover:shadow-lg transition-all transform hover:scale-110 active:scale-95"
                      >
                        <Send className="w-5 h-5" />
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-gray-500">
                    <p className="font-bold text-lg">Sélectionne un utilisateur</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showAdminPanel && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-3xl font-black mb-6 bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
              ⚙️ Admin Panel
            </h3>
            {!isAdmin ? (
              <div className="space-y-4">
                <div className="relative">
                  <input
                    type={showAdminPassword ? "text" : "password"}
                    placeholder="🔑 Mot de passe admin"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full px-4 py-4 pr-12 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-200 outline-none text-lg"
                  />
                  <button
                    onClick={() => setShowAdminPassword(!showAdminPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-100 rounded-lg transition-all"
                  >
                    {showAdminPassword ? <EyeOff className="w-5 h-5 text-gray-600" /> : <Eye className="w-5 h-5 text-gray-600" />}
                  </button>
                </div>
                <button
                  onClick={handleAdminLogin}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-500 text-white py-4 rounded-xl font-black hover:shadow-xl transition-all transform hover:scale-105 active:scale-95"
                >
                  Se connecter
                </button>
              </div>
            ) : (
              <>
                <div className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border-2 border-green-300 mb-6">
                  <p className="text-green-700 font-black text-center text-lg">✅ Mode admin activé</p>
                </div>
                
                <div className="mb-6">
                  <button
                    onClick={() => setShowUserManagement(!showUserManagement)}
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-4 rounded-xl font-black hover:shadow-xl transition-all flex items-center justify-center gap-2"
                  >
                    <Users className="w-5 h-5" />
                    Gestion des utilisateurs ({Object.keys(allUsers).length})
                  </button>
                </div>

                {showUserManagement && (
                  <div className="space-y-3 mb-6">
                    {Object.entries(allUsers).map(([userId, userData]) => (
                      <div key={userId} className="bg-gray-50 p-4 rounded-2xl border-2 border-gray-200">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-500 rounded-xl flex items-center justify-center text-white font-black">
                              {userData.username?.[0]?.toUpperCase()}
                            </div>
                            <div>
                              <p className="font-black text-gray-800">{userData.username}</p>
                              <p className="text-xs text-gray-500">{userData.email}</p>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            {userData.isAdmin && (
                              <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-black flex items-center gap-1">
                                <Crown className="w-3 h-3" />
                                Admin
                              </span>
                            )}
                            {userData.isBanned && (
                              <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-black">
                                Banni
                              </span>
                            )}
                          </div>
                        </div>
                        {userId !== user.id && (
                          <div className="flex gap-2 flex-wrap">
                            {!userData.isAdmin ? (
                              <button
                                onClick={() => promoteToAdmin(userId)}
                                className="flex-1 bg-yellow-500 text-white py-2 px-3 rounded-xl text-sm font-bold hover:bg-yellow-600 transition-all flex items-center justify-center gap-1"
                              >
                                <Crown className="w-4 h-4" />
                                Admin
                              </button>
                            ) : (
                              <button
                                onClick={() => removeAdmin(userId)}
                                className="flex-1 bg-gray-400 text-white py-2 px-3 rounded-xl text-sm font-bold hover:bg-gray-500 transition-all flex items-center justify-center gap-1"
                              >
                                <Shield className="w-4 h-4" />
                                Retirer
                              </button>
                            )}
                            {!userData.isBanned ? (
                              <button
                                onClick={() => banUser(userId)}
                                className="flex-1 bg-red-500 text-white py-2 px-3 rounded-xl text-sm font-bold hover:bg-red-600 transition-all flex items-center justify-center gap-1"
                              >
                                <UserX className="w-4 h-4" />
                                Bannir
                              </button>
                            ) : (
                              <button
                                onClick={() => unbanUser(userId)}
                                className="flex-1 bg-green-500 text-white py-2 px-3 rounded-xl text-sm font-bold hover:bg-green-600 transition-all flex items-center justify-center gap-1"
                              >
                                <Check className="w-4 h-4" />
                                Débannir
                              </button>
                            )}
                            <button
                              onClick={() => kickUser(userId)}
                              className="flex-1 bg-orange-500 text-white py-2 px-3 rounded-xl text-sm font-bold hover:bg-orange-600 transition-all"
                            >
                              👢 Expulser
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
            <button
              onClick={() => setShowAdminPanel(false)}
              className="w-full bg-gray-100 text-gray-700 py-4 rounded-xl font-bold hover:bg-gray-200 transition-all mt-6"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {showCustomResponseModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
            <h3 className="text-2xl font-black mb-4 bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
              💬 Réponse personnalisée
            </h3>
            <textarea
              placeholder="Écris ta réponse..."
              value={customResponseText}
              onChange={(e) => setCustomResponseText(e.target.value)}
              className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-200 focus:border-purple-500 outline-none resize-none font-medium"
              rows="4"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {
                  setShowCustomResponseModal(null);
                  setCustomResponseText('');
                }}
                className="flex-1 bg-gray-100 text-gray-700 py-4 rounded-xl font-bold hover:bg-gray-200 transition-all"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  if (customResponseText.trim()) {
                    respondToRequest(showCustomResponseModal, 'custom', customResponseText);
                  }
                }}
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-500 text-white py-4 rounded-xl font-black hover:shadow-xl transition-all"
              >
                Envoyer
              </button>
            </div>
          </div>
        </div>
      )}

      <nav className="bg-white/95 backdrop-blur-xl border-b-2 border-purple-100 sticky top-[88px] z-20 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 flex">
          {[
            { id: 'requests', icon: Zap, label: 'Demandes', color: 'purple' },
            { id: 'calendar', icon: Calendar, label: 'Événements', color: 'pink' },
            { id: 'notifications', icon: Bell, label: 'Notifs', color: 'orange', badge: notifications.length }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-5 font-black flex items-center justify-center gap-2 transition-all relative ${
                activeTab === tab.id ? `text-${tab.color}-600` : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className={`w-6 h-6 ${activeTab === tab.id ? 'animate-bounce' : ''}`} />
              <span className="hidden sm:inline text-lg">{tab.label}</span>
              {tab.badge > 0 && (
                <span className="bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-black animate-pulse shadow-lg">
                  {tab.badge}
                </span>
              )}
              {activeTab === tab.id && (
                <div className={`absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-r from-${tab.color}-600 to-pink-500 rounded-t-full`}></div>
              )}
            </button>
          ))}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-4 space-y-6">
        {activeTab === 'requests' && (
          <>
            <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-3xl p-6 shadow-2xl text-white">
              <h3 className="font-black text-2xl mb-4 flex items-center gap-3">
                <Zap className="w-8 h-8" />
                Actions Rapides
              </h3>
              <div className="grid grid-cols-2 gap-3 mb-6">
                {requestTypes.map(type => (
                  <button
                    key={type}
                    onClick={() => setNewRequestType(type)}
                    className={`p-4 rounded-2xl font-bold transition-all transform hover:scale-105 active:scale-95 ${
                      newRequestType === type ? 'bg-white text-purple-600 shadow-xl' : 'bg-white/20 hover:bg-white/30'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
              <div className="space-y-3">
                <textarea
                  placeholder="💬 Décris ta demande..."
                  value={newRequestMessage}
                  onChange={(e) => setNewRequestMessage(e.target.value)}
                  className="w-full px-4 py-4 rounded-2xl border-2 border-white/20 focus:border-white focus:ring-4 focus:ring-white/20 outline-none bg-white/10 text-white placeholder-white/60 font-medium resize-none"
                  rows="3"
                />
                <button
                  onClick={addRequest}
                  className="w-full bg-white text-purple-600 py-4 rounded-2xl font-black hover:shadow-2xl transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
                >
                  <Send className="w-5 h-5" />
                  Envoyer
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {requests.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center shadow-xl">
                  <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 font-bold text-lg">Aucune demande pour le moment</p>
                  <p className="text-gray-400 mt-2">Crée ta première demande ci-dessus ! 🚀</p>
                </div>
              ) : (
                requests.map(req => (
                  <div key={req.id} className="bg-white rounded-3xl p-6 shadow-xl hover:shadow-2xl transition-all border-2 border-purple-100 hover:border-purple-300">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-500 rounded-2xl flex items-center justify-center text-white font-black text-lg">
                          {req.user[0].toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-black text-gray-800 text-lg">{req.user}</h4>
                          <span className="text-sm font-bold text-purple-600">{req.type}</span>
                        </div>
                      </div>
                      {isAdmin && (
                        <button
                          onClick={() => deleteRequest(req.id)}
                          className="p-2 hover:bg-red-100 rounded-xl transition-all transform hover:scale-110 active:scale-95"
                        >
                          <Trash2 className="w-5 h-5 text-red-600" />
                        </button>
                      )}
                    </div>
                    <p className="text-gray-700 font-medium mb-4 text-lg bg-gray-50 p-4 rounded-2xl">{req.message}</p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => respondToRequest(req.id, 'yes')}
                        className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white py-4 rounded-2xl font-black hover:shadow-xl transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
                      >
                        <Check className="w-5 h-5" />
                        Chaud ! 🔥
                      </button>
                      <button
                        onClick={() => respondToRequest(req.id, 'no')}
                        className="flex-1 bg-gradient-to-r from-red-500 to-pink-500 text-white py-4 rounded-2xl font-black hover:shadow-xl transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
                      >
                        <X className="w-5 h-5" />
                        Pas dispo
                      </button>
                    </div>
                    <button
                      onClick={() => setShowCustomResponseModal(req.id)}
                      className="w-full mt-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white py-4 rounded-2xl font-black hover:shadow-xl transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
                    >
                      <Edit3 className="w-5 h-5" />
                      Réponse personnalisée ✍️
                    </button>
                    {req.responses && Object.keys(req.responses).length > 0 && (
                      <div className="mt-4 pt-4 border-t-2 border-gray-100">
                        <p className="text-sm font-black text-gray-500 mb-2 flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          Réponses ({Object.keys(req.responses).length})
                        </p>
                        <div className="space-y-2">
                          {Object.values(req.responses).map((resp, idx) => (
                            <div key={idx} className="bg-gray-50 p-3 rounded-xl">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-bold text-gray-700">{resp.user}</span>
                                {resp.response !== 'custom' && (
                                  <span className={`px-3 py-1 rounded-full text-sm font-black ${
                                    resp.response === 'yes' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                  }`}>
                                    {resp.response === 'yes' ? '✅ Chaud' : '❌ Non'}
                                  </span>
                                )}
                              </div>
                              {resp.customText && (
                                <p className="text-gray-600 font-medium mt-2 bg-blue-50 p-2 rounded-lg border-l-4 border-blue-400">
                                  💬 {resp.customText}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {activeTab === 'calendar' && (
          <>
            <div className="bg-gradient-to-br from-pink-500 to-orange-500 rounded-3xl p-6 shadow-2xl text-white">
              <h3 className="font-black text-2xl mb-4 flex items-center gap-3">
                <Calendar className="w-8 h-8" />
                Nouvel Événement
              </h3>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="🎉 Titre de l'événement"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  className="w-full px-4 py-4 rounded-2xl border-2 border-white/20 focus:border-white focus:ring-4 focus:ring-white/20 outline-none bg-white/10 text-white placeholder-white/60 font-medium"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="date"
                    value={newEvent.date}
                    onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                    className="px-4 py-4 rounded-2xl border-2 border-white/20 focus:border-white focus:ring-4 focus:ring-white/20 outline-none bg-white/10 text-white font-medium"
                  />
                  <input
                    type="time"
                    value={newEvent.time}
                    onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                    className="px-4 py-4 rounded-2xl border-2 border-white/20 focus:border-white focus:ring-4 focus:ring-white/20 outline-none bg-white/10 text-white font-medium"
                  />
                </div>
                <button
                  onClick={addEvent}
                  className="w-full bg-white text-pink-600 py-4 rounded-2xl font-black hover:shadow-2xl transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Créer l'événement
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {events.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center shadow-xl">
                  <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 font-bold text-lg">Aucun événement prévu</p>
                  <p className="text-gray-400 mt-2">Crée ton premier événement ci-dessus ! 📅</p>
                </div>
              ) : (
                events.map(evt => (
                  <div key={evt.id} className="bg-white rounded-3xl p-6 shadow-xl hover:shadow-2xl transition-all border-2 border-pink-100 hover:border-pink-300">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="font-black text-gray-800 text-2xl mb-2">{evt.title}</h4>
                        <div className="flex items-center gap-4 text-gray-600">
                          <span className="flex items-center gap-2 font-bold bg-pink-50 px-3 py-1 rounded-xl">
                            <Calendar className="w-4 h-4" />
                            {new Date(evt.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                          </span>
                          <span className="flex items-center gap-2 font-bold bg-orange-50 px-3 py-1 rounded-xl">
                            <Clock className="w-4 h-4" />
                            {evt.time}
                          </span>
                        </div>
                      </div>
                      {isAdmin && (
                        <button
                          onClick={() => deleteEvent(evt.id)}
                          className="p-2 hover:bg-red-100 rounded-xl transition-all transform hover:scale-110 active:scale-95"
                        >
                          <Trash2 className="w-5 h-5 text-red-600" />
                        </button>
                      )}
                    </div>
                    <button
                      onClick={() => joinEvent(evt.id)}
                      disabled={evt.attendees && evt.attendees[user.id]}
                      className={`w-full py-4 rounded-2xl font-black transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2 ${
                        evt.attendees && evt.attendees[user.id]
                          ? 'bg-green-100 text-green-700 cursor-not-allowed'
                          : 'bg-gradient-to-r from-pink-500 to-orange-500 text-white hover:shadow-xl'
                      }`}
                    >
                      {evt.attendees && evt.attendees[user.id] ? (
                        <>
                          <Check className="w-5 h-5" />
                          Tu participes déjà ! 🎉
                        </>
                      ) : (
                        <>
                          <Plus className="w-5 h-5" />
                          Je participe !
                        </>
                      )}
                    </button>
                    {evt.attendees && Object.keys(evt.attendees).length > 0 && (
                      <div className="mt-4 pt-4 border-t-2 border-gray-100">
                        <p className="text-sm font-black text-gray-500 mb-3 flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          Participants ({Object.keys(evt.attendees).length})
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {Object.values(evt.attendees).map((attendee, idx) => (
                            <span key={idx} className="bg-gradient-to-r from-pink-100 to-orange-100 text-pink-700 px-4 py-2 rounded-full font-bold text-sm">
                              {attendee.username}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {activeTab === 'notifications' && (
          <div className="space-y-4">
            {notifications.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center shadow-xl">
                <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 font-bold text-lg">Aucune notification</p>
                <p className="text-gray-400 mt-2">Tu seras notifié des nouvelles activités ! 🔔</p>
              </div>
            ) : (
              notifications.map(notif => (
                <div key={notif.id} className="bg-white rounded-2xl p-5 shadow-lg hover:shadow-xl transition-all border-l-4 border-orange-500">
                  <div className="flex items-center justify-between">
                    <p className="text-gray-800 font-bold text-lg">{notif.message}</p>
                    <span className="text-sm text-gray-500 font-medium bg-gray-100 px-3 py-1 rounded-full">{notif.time}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
}
