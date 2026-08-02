import { useState, useEffect } from 'react';
import { loadFestivals } from './services/dataService';
import { Festival } from './types';
import Map from './components/Map';
import Filters from './components/Filters';
import Analytics from './components/Analytics';
import TravelPlanner from './components/TravelPlanner';
import Chat from './components/Chat';
import Oracle from './components/Oracle';
import PsychedelicBackground from './components/PsychedelicBackground';
import { Globe, Filter, BarChart3, Plane, Menu, X, Share2, Compass, LogIn, User as UserIcon, LogOut, Cloud, Camera, MapPin, MessageSquare, Sparkles, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { auth, googleProvider, signInWithPopup, onAuthStateChanged, FirebaseUser, db, collection, addDoc, serverTimestamp, onSnapshot, doc, getDoc } from './firebase';
import { getFestivalWeather, WeatherData } from './services/weatherService';

export default function App() {
  const [allFestivals, setAllFestivals] = useState<Festival[]>([]);
  const [filteredFestivals, setFilteredFestivals] = useState<Festival[]>([]);
  const [routeFestivals, setRouteFestivals] = useState<Festival[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'filters' | 'analytics' | 'planner' | 'social' | 'oracle'>('filters');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedFestival, setSelectedFestival] = useState<Festival | null>(null);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [recentCheckins, setRecentCheckins] = useState<any[]>([]);
  const [psyMode, setPsyMode] = useState(false);

  const [loadStatus, setLoadStatus] = useState("Lendo base de dados espacial...");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    
    // Safety max timer (2 seconds max) to guarantee UI displays even on slow network
    const maxTimer = setTimeout(() => {
      setLoading(false);
    }, 2000);

    const initData = async () => {
      try {
        setLoadStatus("Lendo festivais e coordenadas SIG...");
        const data = await loadFestivals();
        setAllFestivals(data);
        setFilteredFestivals(data);
        
        setLoadStatus("Carregando mapa interativo e camadas...");

        // Load route from URL if pre-shared
        const urlParams = new URLSearchParams(window.location.search);
        const routeIdParam = urlParams.get('routeId');
        if (routeIdParam) {
          try {
            const snap = await getDoc(doc(db, 'routes', routeIdParam));
            if (snap.exists()) {
              const routeData = snap.data();
              if (routeData && Array.isArray(routeData.festivalIds)) {
                const loadedFestivals = routeData.festivalIds
                  .map((id: string) => data.find((f: Festival) => f.id === id))
                  .filter(Boolean) as Festival[];
                if (loadedFestivals.length > 0) {
                  setRouteFestivals(loadedFestivals);
                  setActiveTab('planner');
                }
              }
            }
          } catch (err) {
            console.error("Shared route loading failed: ", err);
          }
        }
      } catch (err) {
        console.error("Failed loading initial data:", err);
      } finally {
        setLoadStatus("Iniciando plataforma...");
        clearTimeout(maxTimer);
        setLoading(false);
      }
    };

    initData();

    // Listen for check-ins
    let checkinsUnsubscribe = () => {};
    try {
      checkinsUnsubscribe = onSnapshot(collection(db, 'checkins'), (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setRecentCheckins(data.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10));
      }, (err) => {
        console.warn("Checkins snapshot listener error:", err);
      });
    } catch (err) {
      console.warn("Could not attach checkins snapshot listener:", err);
    }

    return () => {
      unsubscribe();
      checkinsUnsubscribe();
    };
  }, []);

  useEffect(() => {
    if (selectedFestival) {
      setWeather(null);
      getFestivalWeather(selectedFestival.latitude, selectedFestival.longitude).then(setWeather);
    }
  }, [selectedFestival]);

  const handleCheckIn = async () => {
    if (!user || !selectedFestival) return;
    setCheckingIn(true);
    try {
      await addDoc(collection(db, 'checkins'), {
        userId: user.uid,
        userName: user.displayName,
        userPhoto: user.photoURL,
        festivalId: selectedFestival.id,
        festivalName: selectedFestival.nome,
        timestamp: new Date().toISOString(),
        createdAt: serverTimestamp()
      });
      alert('Check-in realizado com sucesso! 🌈');
    } catch (error) {
      console.error("Check-in failed", error);
    } finally {
      setCheckingIn(false);
    }
  };

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleLogout = () => auth.signOut();

  const handlePlanTrip = (festival: Festival) => {
    if (!routeFestivals.find(f => f.id === festival.id)) {
      setRouteFestivals([...routeFestivals, festival]);
      setActiveTab('planner');
      if (!sidebarOpen) setSidebarOpen(true);
    }
  };

  const handleRemoveFromRoute = (id: string) => {
    setRouteFestivals(routeFestivals.filter(f => f.id !== id));
  };

  if (loading) {
    return (
      <div className="h-screen w-screen bg-psy-dark flex flex-col items-center justify-center relative overflow-hidden p-4">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.25)_0%,transparent_60%)] animate-pulse"></div>
        <motion.div 
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative z-10 text-center max-w-sm w-full"
        >
          <div className="w-20 h-20 mb-5 mx-auto relative">
            <div className="absolute inset-0 bg-psy-cyan blur-2xl opacity-30 animate-pulse"></div>
            <Globe className="w-full h-full text-psy-cyan relative z-10 animate-[spin_8s_linear_infinite]" />
          </div>
          <h1 className="text-4xl font-display font-black tracking-tighter glow-text text-white mb-1">
            NOMAD <span className="text-psy-magenta">MAPS</span>
          </h1>
          <p className="text-psy-cyan/70 font-medium tracking-[0.2em] text-[10px] uppercase mb-8">Plataforma SIG Psytrance & Viagens</p>
          
          <div className="w-full bg-black/40 border border-white/10 rounded-xl p-4 shadow-2xl backdrop-blur-md">
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mb-3">
              <motion.div 
                className="h-full bg-gradient-to-r from-psy-cyan via-psy-purple to-psy-magenta"
                initial={{ width: "10%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 1.2, ease: "easeInOut" }}
              />
            </div>
            <p className="text-xs text-gray-300 font-medium animate-pulse">{loadStatus}</p>
          </div>

          <button
            type="button"
            onClick={() => setLoading(false)}
            className="mt-6 text-xs text-psy-cyan hover:text-white underline font-bold transition-colors cursor-pointer"
          >
            Acessar Mapa Imediatamente →
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={cn(
      "h-screen flex flex-col bg-psy-dark overflow-hidden",
      psyMode && "psy-mode-active"
    )}>
      {psyMode && <PsychedelicBackground />}
      {/* Header */}
      <header className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-psy-dark/80 backdrop-blur-md z-50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-psy-cyan/10 rounded-xl border border-psy-cyan/20">
            <Globe className="w-6 h-6 text-psy-cyan" />
          </div>
          <div>
            <h1 className="text-xl font-display font-black tracking-tight leading-none">
              NOMAD <span className="text-psy-magenta">MAPS</span>
            </h1>
            <p className="text-[10px] text-psy-cyan/60 font-bold uppercase tracking-widest mt-1">Global Psytrance Network</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => setPsyMode(!psyMode)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border",
              psyMode 
                ? "bg-psy-neon/20 border-psy-neon text-psy-neon shadow-[0_0_15px_rgba(0,255,0,0.3)]" 
                : "bg-white/5 border-white/10 text-gray-400 hover:text-white"
            )}
          >
            <Zap className={cn("w-3 h-3", psyMode && "animate-pulse")} />
            {psyMode ? "MODO PSICODÉLICO ATIVO" : "MODO PSICODÉLICO"}
          </button>

          <button className="hidden md:flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-white transition-colors">
            <Share2 className="w-4 h-4" /> COMPARTILHAR
          </button>
          
          {user ? (
            <div className="flex items-center gap-3 pl-4 border-l border-white/10">
              <div className="text-right hidden sm:block">
                <p className="text-[10px] font-bold text-white leading-none">{user.displayName}</p>
                <button onClick={handleLogout} className="text-[9px] text-psy-magenta font-bold hover:underline">SAIR</button>
              </div>
              <img src={user.photoURL || ''} alt="" className="w-8 h-8 rounded-full border border-psy-cyan/30" referrerPolicy="no-referrer" />
            </div>
          ) : (
            <button 
              onClick={handleLogin}
              className="psy-button psy-button-outline py-1.5 px-4 text-xs"
            >
              <LogIn className="w-4 h-4" /> ENTRAR
            </button>
          )}

          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      <main className="flex-1 flex relative overflow-hidden">
        {/* Sidebar */}
        <AnimatePresence mode="wait">
          {sidebarOpen && (
            <motion.aside
              initial={{ x: -400 }}
              animate={{ x: 0 }}
              exit={{ x: -400 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute md:relative z-40 w-full md:w-[400px] h-full bg-psy-dark/95 md:bg-psy-dark border-r border-white/10 flex flex-col"
            >
              {/* Tabs */}
              <div className="flex border-b border-white/10">
                <button 
                  onClick={() => setActiveTab('filters')}
                  className={cn(
                    "flex-1 py-4 flex flex-col items-center gap-1 transition-all relative",
                    activeTab === 'filters' ? "text-psy-cyan" : "text-gray-500 hover:text-gray-300"
                  )}
                >
                  <Filter className="w-5 h-5" />
                  <span className="text-[10px] font-bold uppercase tracking-tighter">Filtros</span>
                  {activeTab === 'filters' && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-psy-cyan shadow-[0_0_10px_#22d3ee]" />}
                </button>
                <button 
                  onClick={() => setActiveTab('analytics')}
                  className={cn(
                    "flex-1 py-4 flex flex-col items-center gap-1 transition-all relative",
                    activeTab === 'analytics' ? "text-psy-magenta" : "text-gray-500 hover:text-gray-300"
                  )}
                >
                  <BarChart3 className="w-5 h-5" />
                  <span className="text-[10px] font-bold uppercase tracking-tighter">Analytics</span>
                  {activeTab === 'analytics' && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-psy-magenta shadow-[0_0_10px_#d946ef]" />}
                </button>
                <button 
                  onClick={() => setActiveTab('planner')}
                  className={cn(
                    "flex-1 py-4 flex flex-col items-center gap-1 transition-all relative",
                    activeTab === 'planner' ? "text-psy-neon" : "text-gray-500 hover:text-gray-300"
                  )}
                >
                  <div className="relative">
                    <Plane className="w-5 h-5" />
                    {routeFestivals.length > 0 && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-psy-neon text-psy-dark text-[8px] font-black rounded-full flex items-center justify-center">
                        {routeFestivals.length}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-tighter">Roteiro</span>
                  {activeTab === 'planner' && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-psy-neon shadow-[0_0_10px_#00ff00]" />}
                </button>
                <button 
                  onClick={() => setActiveTab('social')}
                  className={cn(
                    "flex-1 py-4 flex flex-col items-center gap-1 transition-all relative",
                    activeTab === 'social' ? "text-psy-cyan" : "text-gray-500 hover:text-gray-300"
                  )}
                >
                  <Camera className="w-5 h-5" />
                  <span className="text-[10px] font-bold uppercase tracking-tighter">Social</span>
                  {activeTab === 'social' && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-psy-cyan shadow-[0_0_10px_#22d3ee]" />}
                </button>
                <button 
                  onClick={() => setActiveTab('oracle')}
                  className={cn(
                    "flex-1 py-4 flex flex-col items-center gap-1 transition-all relative",
                    activeTab === 'oracle' ? "text-psy-magenta" : "text-gray-500 hover:text-gray-300"
                  )}
                >
                  <Sparkles className="w-5 h-5" />
                  <span className="text-[10px] font-bold uppercase tracking-tighter">Oráculo</span>
                  {activeTab === 'oracle' && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-psy-magenta shadow-[0_0_10px_#ff00ff]" />}
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                <AnimatePresence mode="wait">
                  {activeTab === 'filters' && (
                    <motion.div key="filters" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                      <Filters 
                        festivals={allFestivals} 
                        onFilterChange={setFilteredFestivals} 
                        routeFestivals={routeFestivals}
                        onPlanTrip={handlePlanTrip}
                        onRemoveFromRoute={handleRemoveFromRoute}
                      />
                    </motion.div>
                  )}
                  {activeTab === 'analytics' && (
                    <motion.div key="analytics" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                      <Analytics festivals={filteredFestivals} />
                    </motion.div>
                  )}
                  {activeTab === 'planner' && (
                    <motion.div key="planner" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                      <TravelPlanner 
                        routeFestivals={routeFestivals} 
                        onRemoveFromRoute={handleRemoveFromRoute}
                        onReorderRoute={setRouteFestivals}
                        user={user}
                        allFestivals={allFestivals}
                      />
                    </motion.div>
                  )}
                  {activeTab === 'social' && (
                    <motion.div key="social" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6 h-full flex flex-col">
                      <div className="flex-1 space-y-6">
                        <h3 className="text-xs uppercase tracking-widest text-psy-cyan font-bold flex items-center gap-2">
                          <Camera className="w-4 h-4" />
                          Check-ins Recentes
                        </h3>
                        <div className="space-y-4">
                          {recentCheckins.map((checkin) => (
                            <div key={checkin.id} className="psy-card p-4 flex gap-3">
                              <img src={checkin.userPhoto} alt="" className="w-10 h-10 rounded-full border border-psy-cyan/30" referrerPolicy="no-referrer" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-white truncate">{checkin.userName}</p>
                                <p className="text-[10px] text-psy-cyan font-medium mt-0.5">está em <span className="text-white">{checkin.festivalName}</span></p>
                                <p className="text-[9px] text-gray-500 mt-1">{new Date(checkin.timestamp).toLocaleString('pt-BR')}</p>
                              </div>
                            </div>
                          ))}
                          {recentCheckins.length === 0 && (
                            <p className="text-center text-xs text-gray-500 py-12">Nenhum check-in ainda. Seja o primeiro!</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="h-80 mt-8">
                        <h3 className="text-xs uppercase tracking-widest text-psy-cyan font-bold flex items-center gap-2 mb-4">
                          <MessageSquare className="w-4 h-4" />
                          Chat da Tribo
                        </h3>
                        <Chat user={user} />
                      </div>
                    </motion.div>
                  )}
                  {activeTab === 'oracle' && (
                    <motion.div key="oracle" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="h-full">
                      <Oracle festivals={allFestivals} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Map Area */}
        <div className="flex-1 relative">
          <Map 
            festivals={filteredFestivals} 
            selectedFestivals={selectedFestival ? [selectedFestival] : []}
            onSelectFestival={setSelectedFestival}
            onPlanTrip={handlePlanTrip}
            onRemoveFromRoute={handleRemoveFromRoute}
            routeFestivals={routeFestivals}
          />

          {/* Festival Detail Overlay */}
          <AnimatePresence>
            {selectedFestival && (
              <motion.div 
                initial={{ opacity: 0, y: 100 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 100 }}
                className="absolute bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-lg z-[1001]"
              >
                <div className="psy-card p-0 overflow-hidden border-psy-cyan/30 shadow-[0_0_30px_rgba(34,211,238,0.1)]">
                  <div className="h-24 bg-gradient-to-r from-psy-purple/20 via-psy-magenta/20 to-psy-cyan/20 relative">
                    <button 
                      onClick={() => setSelectedFestival(null)}
                      className="absolute top-4 right-4 p-1.5 bg-black/40 rounded-full hover:bg-black/60 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div className="absolute bottom-4 left-6 flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-psy-dark border border-white/20 flex items-center justify-center shadow-xl">
                        <Compass className="w-6 h-6 text-psy-cyan" />
                      </div>
                      <div>
                        <h2 className="text-xl font-display font-black tracking-tight leading-none">{selectedFestival.nome}</h2>
                        <p className="text-xs text-psy-cyan font-medium mt-1 uppercase tracking-wider">{selectedFestival.país} • {selectedFestival.cidade}</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="flex gap-4 mb-6">
                      <div className="flex-1">
                        <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-1">Data</p>
                        <p className="text-sm font-medium">{new Date(selectedFestival.data).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-1">Clima Atual</p>
                        {weather ? (
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{weather.icon}</span>
                            <p className="text-sm font-medium">{weather.temp}°C • {weather.condition}</p>
                          </div>
                        ) : (
                          <div className="h-5 w-24 bg-white/5 animate-pulse rounded"></div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-4 mb-6">
                      <div className="flex-1">
                        <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-1">Status</p>
                        <span className={cn(
                          "text-[10px] px-2 py-0.5 rounded-full border font-bold",
                          selectedFestival.status === 'Ativo' ? "bg-psy-neon/10 border-psy-neon/30 text-psy-neon" : "bg-red-500/10 border-red-500/30 text-red-400"
                        )}>
                          {selectedFestival.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1">
                        {user && (
                          <button 
                            onClick={handleCheckIn}
                            disabled={checkingIn}
                            className="flex items-center gap-2 text-[10px] font-bold text-psy-cyan hover:text-psy-cyan/80 transition-colors disabled:opacity-50"
                          >
                            <MapPin className="w-3 h-3" /> {checkingIn ? 'PROCESSANDO...' : 'FAZER CHECK-IN'}
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="text-sm text-gray-400 leading-relaxed mb-6">
                      {selectedFestival.descrição}
                    </p>
                    <div className="flex flex-wrap gap-2 mb-8">
                      {selectedFestival.vertentes.map(v => (
                        <span key={v} className="text-[10px] px-3 py-1 bg-white/5 border border-white/10 rounded-full text-gray-300">
                          {v}
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-3">
                      <button 
                        onClick={() => handlePlanTrip(selectedFestival)}
                        className="flex-1 psy-button psy-button-primary justify-center text-sm"
                      >
                        <Plane className="w-4 h-4" /> ADICIONAR AO ROTEIRO
                      </button>
                      <button className="psy-button psy-button-outline px-4">
                        <Share2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
}
