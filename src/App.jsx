import React, { useState, useEffect } from 'react';
import { User, Calendar, Bell, Settings, LogOut, Plus, Trash2, Check, X, Sparkles, Users, Clock } from 'lucide-react';

// Hook d'authentification simple (sans Firebase pour le moment)
const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simuler un chargement
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const signUp = (email, password, username) => {
    const newUser = { 
      id: Date.now().toString(), 
      email, 
      username: username || email.split('@')[0], 
      isAdmin: false 
    };
    setUser(newUser);
  };

  const signIn = (email, password) => {
    const newUser = { 
      id: Date.now().toString(), 
      email, 
      username: email.split('@')[0], 
      isAdmin: false 
    };
    setUser(newUser);
  };

  const logout = () => setUser(null);

  return { user, loading, signUp, signIn, logout };
};

export default function App() {
  const { user, loading, signUp, signIn, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('requests');
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');

  // État des demandes
  const [requests, setRequests] = useState([
    { 
      id: 1, 
      user: 'Alex', 
      type: '🎮 Jouer', 
      message: 'Qui veut jouer à Valorant ce soir ?', 
      status: 'pending', 
      responses: [{ user: 'Marie', response: 'yes' }] 
    }
  ]);
  const [newRequestType, setNewRequestType] = useState('');
  const [newRequestMessage, setNewRequestMessage] = useState('');

  // État des événements
  const [events, setEvents] = useState([
    { 
      id: 1, 
      title: '🎮 Soirée Gaming', 
      date: '2025-10-25', 
      time: '20:00', 
      attendees: ['Alex', 'Marie'] 
    }
  ]);
  const [newEvent, setNewEvent] = useState({ title: '', date: '', time: '' });

  // État des notifications
  const [notifications, setNotifications] = useState([
    { id: 1, message: '🎉 Bienvenue sur App Potes !', time: 'maintenant' }
  ]);

  const requestTypes = ['🎮 Jouer', '🍕 Manger', '🎬 Ciné', '⚽ Sport', '🎉 Sortir', '💪 Fitness', '❓ Autre'];

  // Fonction pour ajouter une notification
  const addNotification = (message) => {
    setNotifications([{ id: Date.now(), message, time: 'maintenant' }, ...notifications]);
  };

  // Gestion admin
  const handleAdminLogin = () => {
    if (adminPassword === 'admin123') {
      setIsAdmin(true);
      setShowAdminPanel(true);
      addNotification('⚙️ Mode admin activé');
    } else {
      alert('❌ Mot de passe incorrect');
    }
    setAdminPassword('');
  };

  // Gestion des demandes
  const addRequest = () => {
    if (!newRequestType || !newRequestMessage) {
      alert('⚠️ Remplis tous les champs');
      return;
    }
    setRequests([
      { 
        id: Date.now(), 
        user: user?.username || 'Anonyme', 
        type: newRequestType, 
        message: newRequestMessage, 
        status: 'pending', 
        responses: [] 
      }, 
      ...requests
    ]);
    setNewRequestType('');
    setNewRequestMessage('');
    addNotification(`✨ ${user?.username} a créé une demande : ${newRequestType}`);
  };

  const respondToRequest = (requestId, response) => {
    setRequests(requests.map(req => {
      if (req.id === requestId && !req.responses.find(r => r.user === user?.username)) {
        return { ...req, responses: [...req.responses, { user: user?.username, response }] };
      }
      return req;
    }));
    addNotification(`👍 ${user?.username} a répondu à une demande`);
  };

  const deleteRequest = (id) => {
    setRequests(requests.filter(r => r.id !== id));
    addNotification('🗑️ Demande supprimée');
  };

  // Gestion des événements
  const addEvent = () => {
    if (!newEvent.title || !newEvent.date || !newEvent.time) {
      alert('⚠️ Remplis tous les champs');
      return;
    }
    setEvents([...events, { id: Date.now(), ...newEvent, attendees: [] }]);
    setNewEvent({ title: '', date: '', time: '' });
    addNotification(`📅 Nouvel événement : ${newEvent.title}`);
  };

  const joinEvent = (eventId) => {
    setEvents(events.map(event => {
      if (event.id === eventId && !event.attendees.includes(user?.username)) {
        addNotification(`🎉 ${user?.username} participe à un événement`);
        return { ...event, attendees: [...event.attendees, user?.username] };
      }
      return event;
    }));
  };

  const deleteEvent = (id) => {
    setEvents(events.filter(e => e.id !== id));
    addNotification('🗑️ Événement supprimé');
  };

  // Écran de chargement
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-white text-2xl font-bold animate-pulse">Chargement...</div>
        </div>
      </div>
    );
  }

  // Page d'authentification
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute w-96 h-96 bg-white/10 rounded-full -top-48 -left-48 animate-pulse"></div>
          <div className="absolute w-96 h-96 bg-white/10 rounded-full -bottom-48 -right-48 animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>

        <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl p-8 w-full max-w-md relative z-10 transform hover:scale-105 transition-all duration-300">
          <div className="text-center mb-8">
            <div className="inline-block p-4 bg-gradient-to-br from-purple-600 to-pink-500 rounded-2xl mb-4 animate-bounce">
              <Sparkles className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-4xl font-black bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent mb-2">
              App Potes
            </h1>
            <p className="text-gray-600 font-medium">Organisez-vous entre amis ! 🎉</p>
          </div>

          <div className="flex gap-2 mb-6 p-1 bg-gray-100 rounded-xl">
            <button
              onClick={() => setAuthMode('login')}
              className={`flex-1 py-3 rounded-lg font-bold transition-all duration-300 ${
                authMode === 'login'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-lg scale-105'
                  : 'text-gray-600 hover:bg-gray-200'
              }`}
            >
              Connexion
            </button>
            <button
              onClick={() => setAuthMode('signup')}
              className={`flex-1 py-3 rounded-lg font-bold transition-all duration-300 ${
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
                className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-200 focus:border-purple-500 outline-none transition-all duration-300"
              />
            )}
            <input
              type="email"
              placeholder="📧 Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-200 focus:border-purple-500 outline-none transition-all duration-300"
            />
            <input
              type="password"
              placeholder="🔒 Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-200 focus:border-purple-500 outline-none transition-all duration-300"
            />
            <button
              onClick={() => {
                if (!email || !password) {
                  alert('⚠️ Remplis tous les champs');
                  return;
                }
                authMode === 'signup' ? signUp(email, password, username) : signIn(email, password);
              }}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-500 text-white py-4 rounded-xl font-bold hover:shadow-2xl hover:scale-105 transition-all duration-300 transform active:scale-95"
            >
              {authMode === 'signup' ? '✨ Créer mon compte' : '🚀 Se connecter'}
            </button>
          </div>

          <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-purple-200">
            <p className="text-sm text-purple-800 text-center font-medium">
              💡 Entre n'importe quel email/mdp pour tester
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Application principale
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl shadow-lg sticky top-0 z-20 border-b border-white/20">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-500 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-lg transform hover:scale-110 transition-all duration-300 hover:rotate-12">
              {user?.username?.[0]?.toUpperCase()}
            </div>
            <div>
              <h2 className="font-bold text-gray-800 text-lg">{user?.username}</h2>
              <p className="text-xs text-gray-500">{user?.email}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowAdminPanel(!showAdminPanel)}
              className="p-3 hover:bg-purple-100 rounded-xl transition-all duration-300 transform hover:scale-110 active:scale-95"
            >
              <Settings className="w-5 h-5 text-purple-600" />
            </button>
            <button
              onClick={logout}
              className="p-3 hover:bg-red-100 rounded-xl transition-all duration-300 transform hover:scale-110 active:scale-95"
            >
              <LogOut className="w-5 h-5 text-red-600" />
            </button>
          </div>
        </div>
      </header>

      {/* Panel Admin */}
      {showAdminPanel && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-2xl font-black mb-4 bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
              ⚙️ Panel Admin
            </h3>
            {!isAdmin ? (
              <div className="space-y-4">
                <input
                  type="password"
                  placeholder="🔑 Mot de passe admin"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-200 outline-none"
                />
                <button
                  onClick={handleAdminLogin}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-500 text-white py-3 rounded-xl font-bold hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                >
                  Se connecter
                </button>
                <p className="text-xs text-gray-500 text-center">Mot de passe : admin123</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-green-100 rounded-xl border-2 border-green-300">
                  <p className="text-green-700 font-bold text-center">✅ Mode admin activé</p>
                </div>
              </div>
            )}
            <button
              onClick={() => setShowAdminPanel(false)}
              className="mt-4 w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition-all"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-xl border-b border-white/20 sticky top-20 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 flex">
          {[
            { id: 'requests', icon: User, label: 'Demandes' },
            { id: 'calendar', icon: Calendar, label: 'Calendrier' },
            { id: 'notifications', icon: Bell, label: 'Notifs', badge: notifications.length }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-4 font-bold flex items-center justify-center gap-2 transition-all duration-300 relative ${
                activeTab === tab.id ? 'text-purple-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'animate-bounce' : ''}`} />
              {tab.label}
              {tab.badge > 0 && (
                <span className="bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold animate-pulse">
                  {tab.badge}
                </span>
              )}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-600 to-pink-500 rounded-t-full"></div>
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* Contenu principal */}
      <main className="max-w-4xl mx-auto p-4 pb-20">
        {/* Onglet Demandes */}
        {activeTab === 'requests' && (
          <div className="space-y-4">
            {/* Formulaire nouvelle demande */}
            <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-6 shadow-xl border border-white/20">
              <h3 className="font-black text-xl mb-4 bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent flex items-center gap-2">
                <Plus className="w-6 h-6 text-purple-600 animate-pulse" />
                Nouvelle demande
              </h3>
              <div className="space-y-3">
                <select
                  value={newRequestType}
                  onChange={(e) => setNewRequestType(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-200 outline-none transition-all"
                >
                  <option value="">Type de demande...</option>
                  {requestTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                <textarea
                  value={newRequestMessage}
                  onChange={(e) => setNewRequestMessage(e.target.value)}
                  placeholder="Ton message..."
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl resize-none focus:ring-4 focus:ring-purple-200 outline-none transition-all"
                  rows="3"
                />
                <button
                  onClick={addRequest}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-500 text-white py-3 rounded-xl font-bold hover:shadow-2xl transition-all duration-300 transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-5 h-5" />
                  Créer la demande
                </button>
              </div>
            </div>

            {/* Liste des demandes */}
            {requests.map((request) => (
              <div 
                key={request.id} 
                className="bg-white/90 backdrop-blur-xl rounded-3xl p-6 shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center text-white font-bold">
                        {request.user[0].toUpperCase()}
                      </div>
                      <div>
                        <span className="font-bold text-gray-800 block">{request.user}</span>
                        <span className="px-3 py-1 bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 text-xs rounded-full font-bold">
                          {request.type}
                        </span>
                      </div>
                    </div>
                    <p className="text-gray-700 ml-12 font-medium">{request.message}</p>
                  </div>
                  {(isAdmin || request.user === user?.username) && (
                    <button
                      onClick={() => deleteRequest(request.id)}
                      className="text-red-500 hover:bg-red-100 p-2 rounded-xl transition-all transform hover:scale-110"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
                
                {request.responses?.length > 0 && (
                  <div className="mt-4 p-3 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl space-y-2">
                    {request.responses.map((resp, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="font-bold text-gray-700">{resp.user}:</span>
                        <span className={`font-bold ${resp.response === 'yes' ? 'text-green-600' : 'text-red-600'}`}>
                          {resp.response === 'yes' ? '✅ Oui !' : '❌ Non'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {(!request.responses || !request.responses.find(r => r.user === user?.username)) && (
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => respondToRequest(request.id, 'yes')}
                      className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 rounded-xl font-bold hover:shadow-xl transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
                    >
                      <Check className="w-5 h-5" />
                      Oui !
                    </button>
                    <button
                      onClick={() => respondToRequest(request.id, 'no')}
                      className="flex-1 bg-gradient-to-r from-red-500 to-pink-500 text-white py-3 rounded-xl font-bold hover:shadow-xl transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
                    >
                      <X className="w-5 h-5" />
                      Non
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Onglet Calendrier */}
        {activeTab === 'calendar' && (
          <div className="space-y-4">
            <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-6 shadow-xl border border-white/20">
              <h3 className="font-black text-xl mb-4 bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent flex items-center gap-2">
                <Calendar className="w-6 h-6 text-purple-600 animate-pulse" />
                Nouvel événement
              </h3>
              <div className="space-y-3">
                <input
                  type="text"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                  placeholder="🎉 Titre de l'événement"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-200 outline-none"
                />
                <input
                  type="date"
                  value={newEvent.date}
                  onChange={(e) => setNewEvent({...newEvent, date: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-200 outline-none"
                />
                <input
                  type="time"
                  value={newEvent.time}
                  onChange={(e) => setNewEvent({...newEvent, time: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-200 outline-none"
                />
                <button
                  onClick={addEvent}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-500 text-white py-3 rounded-xl font
