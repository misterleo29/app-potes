import React, { useState, useEffect, useRef } from 'react';
import { User, Calendar, Bell, Settings, LogOut, Plus, Trash2, Check, X, Sparkles, Users, Clock, Phone, Video, Mic, MicOff, PhoneOff } from 'lucide-react';
import { auth, database } from './firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { ref, push, set, onValue, remove, update } from 'firebase/database';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('requests');
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');

  // États des demandes
  const [requests, setRequests] = useState([]);
  const [newRequestType, setNewRequestType] = useState('');
  const [newRequestMessage, setNewRequestMessage] = useState('');

  // États des événements
  const [events, setEvents] = useState([]);
  const [newEvent, setNewEvent] = useState({ title: '', date: '', time: '' });

  // États des notifications
  const [notifications, setNotifications] = useState([]);

  // États audio/vidéo
  const [isInCall, setIsInCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);
  const localStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);

  const requestTypes = ['🎮 Jouer', '🍕 Manger', '🎬 Ciné', '⚽ Sport', '🎉 Sortir', '💪 Fitness', '❓ Autre'];

  // Auth Firebase
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      if (currentUser) {
        loadFirebaseData();
      }
    });
    return () => unsubscribe();
  }, []);

  // Charger les données Firebase
  const loadFirebaseData = () => {
    const requestsRef = ref(database, 'requests');
    onValue(requestsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const requestsArray = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        setRequests(requestsArray.reverse());
      }
    });

    const eventsRef = ref(database, 'events');
    onValue(eventsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const eventsArray = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        setEvents(eventsArray);
      }
    });

    const notificationsRef = ref(database, 'notifications');
    onValue(notificationsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const notifArray = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        setNotifications(notifArray.reverse());
      }
    });
  };

  // Ajouter une notification
  const addNotification = (message) => {
    const notifRef = ref(database, 'notifications');
    push(notifRef, {
      message,
      time: new Date().toISOString(),
      timestamp: Date.now()
    });
  };

  // Authentification
  const handleSignUp = async () => {
    if (!email || !password || !username) {
      alert('⚠️ Remplis tous les champs');
      return;
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const usersRef = ref(database, `users/${userCredential.user.uid}`);
      await set(usersRef, {
        username,
        email,
        createdAt: Date.now()
      });
      addNotification(`🎉 ${username} a rejoint l'app !`);
    } catch (error) {
      alert('❌ ' + error.message);
    }
  };

  const handleSignIn = async () => {
    if (!email || !password) {
      alert('⚠️ Remplis tous les champs');
      return;
    }
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      alert('❌ ' + error.message);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error(error);
    }
  };

  // Admin
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

  // Demandes
  const addRequest = async () => {
    if (!newRequestType || !newRequestMessage) {
      alert('⚠️ Remplis tous les champs');
      return;
    }
    const requestsRef = ref(database, 'requests');
    await push(requestsRef, {
      user: username || email.split('@')[0],
      userId: user.uid,
      type: newRequestType,
      message: newRequestMessage,
      status: 'pending',
      responses: {},
      timestamp: Date.now()
    });
    setNewRequestType('');
    setNewRequestMessage('');
    addNotification(`✨ Nouvelle demande : ${newRequestType}`);
  };

  const respondToRequest = async (requestId, response) => {
    const responseRef = ref(database, `requests/${requestId}/responses/${user.uid}`);
    await set(responseRef, {
      user: username || email.split('@')[0],
      response,
      timestamp: Date.now()
    });
    addNotification(`👍 Réponse à une demande`);
  };

  const deleteRequest = async (id) => {
    await remove(ref(database, `requests/${id}`));
    addNotification('🗑️ Demande supprimée');
  };

  // Événements
  const addEvent = async () => {
    if (!newEvent.title || !newEvent.date || !newEvent.time) {
      alert('⚠️ Remplis tous les champs');
      return;
    }
    const eventsRef = ref(database, 'events');
    await push(eventsRef, {
      ...newEvent,
      attendees: {},
      createdBy: user.uid,
      timestamp: Date.now()
    });
    setNewEvent({ title: '', date: '', time: '' });
    addNotification(`📅 Nouvel événement : ${newEvent.title}`);
  };

  const joinEvent = async (eventId) => {
    const attendeeRef = ref(database, `events/${eventId}/attendees/${user.uid}`);
    await set(attendeeRef, {
      username: username || email.split('@')[0],
      timestamp: Date.now()
    });
    addNotification(`🎉 Participation à un événement`);
  };

  const deleteEvent = async (id) => {
    await remove(ref(database, `events/${id}`));
    addNotification('🗑️ Événement supprimé');
  };

  // Appel vocal
  const startCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
      setIsInCall(true);
      setShowCallModal(true);
      addNotification('📞 Appel vocal démarré');
    } catch (error) {
      alert('❌ Impossible d\'accéder au micro');
    }
  };

  const endCall = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    setIsInCall(false);
    setShowCallModal(false);
    setIsMuted(false);
    addNotification('📞 Appel terminé');
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
  };

  // Enregistrement vocal
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      const audioChunks = [];
      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = reader.result;
          const requestsRef = ref(database, 'requests');
          await push(requestsRef, {
            user: username || email.split('@')[0],
            userId: user.uid,
            type: '🎤 Message vocal',
            message: 'Message vocal',
            audioUrl: base64Audio,
            status: 'pending',
            responses: {},
            timestamp: Date.now()
          });
          addNotification('🎤 Message vocal envoyé');
        };
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      alert('❌ Impossible d\'accéder au micro');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

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

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute w-96 h-96 bg-white/10 rounded-full -top-48 -left-48 animate-pulse"></div>
          <div className="absolute w-96 h-96 bg-white/10 rounded-full -bottom-48 -right-48 animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>

        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 w-full max-w-md relative z-10">
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
                  ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-lg'
                  : 'text-gray-600 hover:bg-gray-200'
              }`}
            >
              Connexion
            </button>
            <button
              onClick={() => setAuthMode('signup')}
              className={`flex-1 py-3 rounded-lg font-bold transition-all duration-300 ${
                authMode === 'signup'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-lg'
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
                className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-200 focus:border-purple-500 outline-none transition-all"
              />
            )}
            <input
              type="email"
              placeholder="📧 Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-200 focus:border-purple-500 outline-none transition-all"
            />
            <input
              type="password"
              placeholder="🔒 Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-200 focus:border-purple-500 outline-none transition-all"
            />
            <button
              onClick={authMode === 'signup' ? handleSignUp : handleSignIn}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-500 text-white py-4 rounded-xl font-bold hover:shadow-2xl hover:scale-105 transition-all duration-300"
            >
              {authMode === 'signup' ? '✨ Créer mon compte' : '🚀 Se connecter'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 pb-20">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-xl shadow-lg sticky top-0 z-20 border-b border-purple-100">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-500 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-lg">
              {(username || email)?.[0]?.toUpperCase()}
            </div>
            <div>
              <h2 className="font-bold text-gray-800">{username || email.split('@')[0]}</h2>
              <p className="text-xs text-gray-500">{email}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {!isInCall && (
              <button
                onClick={startCall}
                className="p-3 hover:bg-green-100 rounded-xl transition-all"
                title="Appel vocal"
              >
                <Phone className="w-5 h-5 text-green-600" />
              </button>
            )}
            <button
              onClick={() => setShowAdminPanel(!showAdminPanel)}
              className="p-3 hover:bg-purple-100 rounded-xl transition-all"
            >
              <Settings className="w-5 h-5 text-purple-600" />
            </button>
            <button
              onClick={handleLogout}
              className="p-3 hover:bg-red-100 rounded-xl transition-all"
            >
              <LogOut className="w-5 h-5 text-red-600" />
            </button>
          </div>
        </div>
      </header>

      {/* Modal Appel */}
      {showCallModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md text-center shadow-2xl">
            <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
              <Phone className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-2xl font-black mb-2">Appel en cours</h3>
            <p className="text-gray-600 mb-6">Vocal actif entre potes</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={toggleMute}
                className={`p-4 rounded-full transition-all ${
                  isMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                {isMuted ? <MicOff className="w-6 h-6 text-white" /> : <Mic className="w-6 h-6 text-gray-700" />}
              </button>
              <button
                onClick={endCall}
                className="p-4 bg-red-500 hover:bg-red-600 rounded-full transition-all"
              >
                <PhoneOff className="w-6 h-6 text-white" />
              </button>
            </div>
          </div>
        </div>
      )}

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
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-500 text-white py-3 rounded-xl font-bold hover:shadow-xl transition-all"
                >
                  Se connecter
                </button>
                <p className="text-xs text-gray-500 text-center">Mot de passe : admin123</p>
              </div>
            ) : (
              <div className="p-4 bg-green-100 rounded-xl border-2 border-green-300">
                <p className="text-green-700 font-bold text-center">✅ Mode admin activé</p>
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
      <nav className="bg-white/90 backdrop-blur-xl border-b border-purple-100 sticky top-[76px] z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 flex">
          {[
            { id: 'requests', icon: User, label: 'Demandes' },
            { id: 'calendar', icon: Calendar, label: 'Événements' },
            { id: 'notifications', icon: Bell, label: 'Notifs', badge: notifications.length }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-4 font-bold flex items-center justify-center gap-2 transition-all relative ${
                activeTab === tab.id ? 'text-purple-600' : 'text-gray-500'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.badge > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {tab.badge}
                </span>
              )}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-600 to-pink-500"></div>
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* Contenu principal */}
      <main className="max-w-6xl mx-auto p-4 space-y-4">
        {/* Onglet Demandes */}
        {activeTab === 'requests' && (
          <>
            {/* Boutons d'action rapide */}
            <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-4 shadow-lg">
              <h3 className="font-bold text-lg mb-3">Actions rapides</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`p-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                    isRecording
                      ? 'bg-red-500 text-white hover:bg-red-600'
                      : 'bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 hover:shadow-lg'
                  }`}
                >
                  <Mic className="w-5 h-5" />
                  {isRecording ? 'Stop' : 'Vocal'}
                </button>
                <button
                  onClick={startCall}
                  className="p-3 bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 rounded-xl font-bold hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <Phone className="w-5 h-5" />
                  Appel
                </button>
              </div>
            </div>

            {/* Formulaire */}
            <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-6 shadow-lg">
              <h3 className="font-bold text-xl mb-4 flex items-center gap-2">
                <Plus className="w-6 h-6 text-purple-600" />
                Nouvelle demande
              </h3>
              <div className="space-y-3">
                <select
                  value={newRequestType}
                  onChange={(e) => setNewRequestType(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-200 outline-none"
                >
                  <option value="">Type...</option>
                  {requestTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                <textarea
                  value={newRequestMessage}
                  onChange={(e) => setNewRequestMessage(e.target.value)}
                  placeholder="Ton message..."
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl resize-none focus:ring-4 focus:ring-purple-200 outline-none"
                  rows="3"
                />
                <button
                  onClick={addRequest}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-500 text-white py-3 rounded-xl font-bold hover:shadow-xl transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-5 h-5" />
                  Créer
                </button>
              </div>
            </div>

            {/* Liste */}
            {requests.map((request) => (
              <div key={request.id} className="bg-white/90 backdrop-blur-xl rounded-3xl p-6 shadow-lg">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center text-white font-bold">
                        {request.user?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <span className="font-bold text-gray-800">{request.user}</span>
                        <span className="ml-2 px-3 py-1 bg-purple-100 text-purple-700 text-xs rounded-full font-bold">
                          {request.type}
                        </span>
                      </div>
                    </div>
                    <p className="text-gray-700 ml-12 font-medium">{request.message}</p>
                    {request.audioUrl && (
                      <audio controls src={request.audioUrl} className="mt-2 ml-12 w-full max-w-md" />
                    )}
                  </div>
                  {(isAdmin || request.userId === user.uid) && (
                    <button
                      onClick={() => deleteRequest(request.id)}
                      className="text-red-500 hover:bg-red-100 p-2 rounded-xl transition-all"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
                
                {request.responses && Object.keys(request.responses).length > 0 && (
                  <div className="mt-4 p-3 bg-green-50 rounded-xl">
                    {Object.values(request.responses).map((resp, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="font-bold">{resp.user}:</span>
                        <span className={resp.response === 'yes' ? 'text-green-600' : 'text-red-600'}>
                          {resp.response === 'yes' ? '✅ Oui !' : '❌ Non'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {(!request.responses || !request.responses[user.uid]) && (
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => respondToRequest(request.id, 'yes')}
                      className="flex-1 bg-green-500 text-white py-3 rounded-xl font-bold hover:bg-green-600 transition-all flex items-center justify-center gap-2"
                    >
                      <Check className="w-5 h-5" />
                      Oui !
                    </button>
                    <button
                      onClick={() => respondToRequest(request.id, 'no')}
                      className="flex-1 bg-red-500 text-white py-3 rounded-xl font-bold hover:bg-red-600 transition-all flex items-center justify-center gap-2"
                    >
                      <X className="w-5 h-5" />
                      Non
                    </button>
                  </div>
                )}
              </div>
            ))}
          </>
        )}

        {/* Onglet Événements */}
        {activeTab === 'calendar' && (
          <>
            <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-6 shadow-lg">
              <h3 className="font-bold text-xl mb-4 flex items-center gap-2">
                <Calendar className="w-6 h-6 text-purple-600" />
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
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-500 text-white py-3 rounded-xl font-bold hover:shadow-xl transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-5 h-5" />
                  Créer l'événement
                </button>
              </div>
            </div>

            {events.map((event) => (
              <div key={event.id} className="bg-white/90 backdrop-blur-xl rounded-3xl p-6 shadow-lg">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="font-black text-xl text-gray-800 mb-2">{event.title}</h4>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Clock className="w-4 h-4" />
                      <p className="font-medium">
                        {new Date(event.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} à {event.time}
                      </p>
                    </div>
                  </div>
                  {(isAdmin || event.createdBy === user.uid) && (
                    <button
                      onClick={() => deleteEvent(event.id)}
                      className="text-red-500 hover:bg-red-100 p-2 rounded-xl transition-all"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
                
                {event.attendees && Object.keys(event.attendees).length > 0 && (
                  <div className="mt-4 p-4 bg-green-50 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-5 h-5 text-green-600" />
                      <p className="font-bold text-green-700">{Object.keys(event.attendees).length} participant(s)</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {Object.values(event.attendees).map((attendee, idx) => (
                        <span key={idx} className="px-3 py-1 bg-white text-green-700 rounded-full font-bold text-sm shadow-sm">
                          {attendee.username}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {(!event.attendees || !event.attendees[user.uid]) && (
                  <button
                    onClick={() => joinEvent(event.id)}
                    className="w-full mt-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white py-3 rounded-xl font-bold hover:shadow-xl transition-all"
                  >
                    🎉 Je participe !
                  </button>
                )}
              </div>
            ))}
          </>
        )}

        {/* Onglet Notifications */}
        {activeTab === 'notifications' && (
          <div className="space-y-3">
            {notifications.length === 0 && (
              <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-8 text-center shadow-lg">
                <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">Aucune notification</p>
              </div>
            )}
            {notifications.map((notif) => (
              <div key={notif.id} className="bg-white/90 backdrop-blur-xl rounded-3xl p-4 shadow-lg flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <Bell className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-gray-800 font-bold">{notif.message}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(notif.time).toLocaleString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Barre flottante d'actions rapides (mobile) */}
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-10 sm:hidden">
        <div className="bg-gradient-to-r from-purple-600 to-pink-500 rounded-full shadow-2xl p-2 flex gap-2">
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`p-3 rounded-full transition-all ${
              isRecording ? 'bg-red-500 animate-pulse' : 'bg-white/20 hover:bg-white/30'
            }`}
          >
            <Mic className="w-5 h-5 text-white" />
          </button>
          <button
            onClick={startCall}
            className="p-3 bg-white/20 hover:bg-white/30 rounded-full transition-all"
          >
            <Phone className="w-5 h-5 text-white" />
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className="p-3 bg-white/20 hover:bg-white/30 rounded-full transition-all"
          >
            <Plus className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
