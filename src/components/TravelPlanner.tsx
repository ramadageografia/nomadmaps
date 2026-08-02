import React, { useState, useEffect } from 'react';
import { 
  Plane, 
  MapPin, 
  Trash2, 
  ArrowRight, 
  Share2, 
  Save, 
  Calendar, 
  Clock, 
  Car, 
  Copy, 
  Check, 
  ArrowUpDown, 
  Loader2,
  FolderOpen,
  Compass
} from 'lucide-react';
import { Festival } from '../types';
import { motion, Reorder } from 'motion/react';
import { cn } from '../lib/utils';
import { db, collection, addDoc, getDocs, query, where, auth } from '../firebase';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface TravelPlannerProps {
  routeFestivals: Festival[];
  onRemoveFromRoute: (id: string) => void;
  onReorderRoute: (newOrder: Festival[]) => void;
  user: any;
  allFestivals: Festival[];
}

export default function TravelPlanner({ 
  routeFestivals, 
  onRemoveFromRoute,
  onReorderRoute,
  user,
  allFestivals
}: TravelPlannerProps) {
  const [sortByDate, setSortByDate] = useState(true);
  const [travelMode, setTravelMode] = useState<'car' | 'plane'>('car');
  const [routeName, setRouteName] = useState('Minha Rota Psicodélica 🌀');
  const [isSaving, setIsSaving] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [savedRoutes, setSavedRoutes] = useState<any[]>([]);
  const [isLoadingSaved, setIsLoadingSaved] = useState(false);

  // Load saved routes on user login
  useEffect(() => {
    if (!user) {
      setSavedRoutes([]);
      return;
    }
    
    const fetchRoutes = async () => {
      setIsLoadingSaved(true);
      const path = 'routes';
      try {
        const q = query(collection(db, path), where('userId', '==', user.uid));
        const querySnapshot = await getDocs(q);
        const list: any[] = [];
        querySnapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() });
        });
        setSavedRoutes(list);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, path);
      } finally {
        setIsLoadingSaved(false);
      }
    };

    fetchRoutes();
  }, [user]);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return Math.round(R * c);
  };

  // Sort route temporally/chronologically if the option is active
  const sortedRoute = sortByDate 
    ? [...routeFestivals].sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime())
    : routeFestivals;

  const totalDistance = sortedRoute.reduce((acc, curr, idx) => {
    if (idx === 0) return 0;
    const prev = sortedRoute[idx - 1];
    return acc + calculateDistance(prev.latitude, prev.longitude, curr.latitude, curr.longitude);
  }, 0);

  // Speed defaults: Car @ 80 km/h, Plane @ 750 km/h with 1.5h flight overhead per leg
  const speed = travelMode === 'car' ? 80 : 750;
  const rawHours = totalDistance / speed;
  const estimatedTimeHours = travelMode === 'plane' && sortedRoute.length > 1
    ? rawHours + (sortedRoute.length - 1) * 1.5
    : rawHours;

  const formatEstimatedTime = (hours: number) => {
    if (hours === 0) return "0 min";
    const d = Math.floor(hours / 24);
    const h = Math.floor(hours % 24);
    const m = Math.round((hours % 1) * 60);

    const parts = [];
    if (d > 0) parts.push(`${d} ${d === 1 ? 'dia' : 'dias'}`);
    if (h > 0) parts.push(`${h} ${h === 1 ? 'hora' : 'horas'}`);
    if (m > 0 && d === 0) parts.push(`${m} min`);

    return parts.join(' e ') || 'Menos de 1 hora';
  };

  const handleSaveRoute = async () => {
    if (!user) {
      alert("Por favor, faça login com a sua conta Google para salvar roteiros!");
      return;
    }
    if (routeFestivals.length === 0) {
      alert("Selecione pelo menos um festival para salvar a rota!");
      return;
    }

    setIsSaving(true);
    setShareUrl(null);
    const path = 'routes';

    try {
      const docRef = await addDoc(collection(db, path), {
        userId: user.uid,
        name: routeName,
        festivalIds: sortedRoute.map(f => f.id),
        totalDistance,
        travelMode,
        sortByDate,
        createdAt: new Date().toISOString()
      });

      // Update local saved list
      setSavedRoutes(prev => [
        {
          id: docRef.id,
          userId: user.uid,
          name: routeName,
          festivalIds: sortedRoute.map(f => f.id),
          totalDistance,
          travelMode,
          sortByDate,
          createdAt: new Date().toISOString()
        },
        ...prev
      ]);

      const shareLink = `${window.location.origin}?routeId=${docRef.id}`;
      setShareUrl(shareLink);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyLink = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLoadRoute = (saved: any) => {
    const list = saved.festivalIds
      .map((id: string) => allFestivals.find(f => f.id === id))
      .filter(Boolean) as Festival[];

    if (list.length > 0) {
      onReorderRoute(list);
      setSortByDate(saved.sortByDate ?? true);
      setTravelMode(saved.travelMode ?? 'car');
      setRouteName(saved.name || 'Nova Rota');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xs uppercase tracking-widest text-psy-neon font-bold flex items-center gap-2">
          <Plane className="w-4 h-4" />
          Planejar Rota de Viagem
        </h3>
        {routeFestivals.length > 0 && (
          <span className="text-[10px] bg-psy-neon/10 text-psy-neon px-2.5 py-1 rounded border border-psy-neon/30 font-bold">
            {totalDistance} km total
          </span>
        )}
      </div>

      {/* Travel Preferences */}
      {routeFestivals.length > 0 && (
        <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-4">
          {/* Sorter Toggle */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">Ordenamento do trajeto:</span>
            <button
              onClick={() => setSortByDate(!sortByDate)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded-lg border font-bold transition-all text-[11px]",
                sortByDate 
                  ? "bg-psy-cyan/20 border-psy-cyan/40 text-psy-cyan" 
                  : "bg-white/5 border-white/10 text-gray-400"
              )}
            >
              <Calendar className="w-3.5 h-3.5" />
              {sortByDate ? "Ordem Cronológica (Temporal)" : "Ordem Personalizada"}
            </button>
          </div>

          {/* Travel Mode Toggle */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">Meio de Transporte:</span>
            <div className="flex bg-black/30 p-0.5 rounded-lg border border-white/5">
              <button
                onClick={() => setTravelMode('car')}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase transition-all",
                  travelMode === 'car' ? "bg-psy-neon text-psy-dark" : "text-gray-400"
                )}
              >
                <Car className="w-3.5 h-3.5" /> Terrestre
              </button>
              <button
                onClick={() => setTravelMode('plane')}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase transition-all",
                  travelMode === 'plane' ? "bg-psy-neon text-psy-dark" : "text-gray-400"
                )}
              >
                <Plane className="w-3.5 h-3.5" /> Aéreo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Festival List in Route */}
      {routeFestivals.length === 0 ? (
        <div className="text-center py-12 px-4 border border-dashed border-white/10 rounded-2xl bg-white/5">
          <MapPin className="w-8 h-8 text-gray-600 mx-auto mb-3" />
          <p className="text-sm text-gray-400 font-medium">Seu roteiro está vazio.</p>
          <p className="text-[10px] text-gray-500 mt-1">Escolha múltiplos festivais no mapa ou na lista ao lado.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1 custom-scrollbar">
            {sortByDate ? (
              // Chronological sequence view (Disabled dragging since sorting by date)
              sortedRoute.map((festival, idx) => (
                <div 
                  key={festival.id}
                  className="psy-card p-3 flex items-center gap-3 transition-colors border-white/5 hover:border-white/10 bg-white/5"
                >
                  <div className="w-6 h-6 rounded-full bg-psy-cyan/20 border border-psy-cyan/40 flex items-center justify-center text-[10px] font-bold text-psy-cyan">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-white truncate">{festival.nome}</h4>
                    <p className="text-[9px] text-gray-400 truncate">
                      {festival.país} • {new Date(festival.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => onRemoveFromRoute(festival.id)}
                    className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            ) : (
              // Custom sequence view with drag & reorder
              <Reorder.Group axis="y" values={routeFestivals} onReorder={onReorderRoute} className="space-y-2">
                {routeFestivals.map((festival, idx) => (
                  <Reorder.Item 
                    key={festival.id} 
                    value={festival}
                    className="psy-card p-3 flex items-center gap-3 cursor-grab active:cursor-grabbing bg-white/5 border-white/5"
                  >
                    <div className="w-6 h-6 rounded-full bg-psy-neon/25 border border-psy-neon/40 flex items-center justify-center text-[10px] font-bold text-psy-neon">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-white truncate">{festival.nome}</h4>
                      <p className="text-[9px] text-gray-400 truncate">
                        {festival.país} • {new Date(festival.data).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                      </p>
                    </div>
                    <button 
                      type="button"
                      onClick={() => onRemoveFromRoute(festival.id)}
                      className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </Reorder.Item>
                ))}
              </Reorder.Group>
            )}
          </div>

          {/* Travel Specs Panel */}
          {sortedRoute.length > 1 && (
            <div className="p-4 bg-psy-cyan/5 border border-psy-cyan/20 rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between text-xs text-white">
                <span className="flex items-center gap-1.5 text-gray-400">
                  <Compass className="w-3.5 h-3.5 text-psy-cyan" /> Distância total:
                </span>
                <span className="font-bold text-psy-cyan">{totalDistance} km</span>
              </div>
              <div className="flex items-center justify-between text-xs text-white">
                <span className="flex items-center gap-1.5 text-gray-400">
                  <Clock className="w-3.5 h-3.5 text-psy-magenta" /> Tempo estimado:
                </span>
                <span className="font-bold text-psy-magenta">
                  ~ {formatEstimatedTime(estimatedTimeHours)}
                </span>
              </div>
            </div>
          )}

          {/* Save & Name Form */}
          {sortedRoute.length > 0 && (
            <div className="space-y-3 pt-3 border-t border-white/10">
              <input
                type="text"
                placeholder="Dê um nome a este roteiro..."
                value={routeName}
                onChange={(e) => setRouteName(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-psy-neon/40"
              />
              <button
                type="button"
                onClick={handleSaveRoute}
                disabled={isSaving}
                className="w-full psy-button psy-button-primary justify-center gap-2 py-2 text-xs font-bold"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> SALVANDO...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" /> SALVAR ROTEIRO
                  </>
                )}
              </button>

              {/* Share block */}
              {shareUrl && (
                <div className="p-3 bg-white/5 border border-white/10 rounded-xl space-y-2 animate-fadeIn">
                  <label className="text-[9px] uppercase tracking-wider text-psy-neon font-bold block">
                    Link de Compartilhamento gerado!
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={shareUrl}
                      className="flex-1 bg-black/40 border border-white/5 rounded-lg px-2.5 py-1 text-[10px] text-gray-300 focus:outline-none select-all"
                    />
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="px-3 py-1 bg-psy-neon/20 border border-psy-neon/30 text-psy-neon hover:bg-psy-neon/30 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5" /> Copiado
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" /> Copiar
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Saved Routes List */}
      {user && (
        <div className="pt-4 border-t border-white/10 space-y-3">
          <h4 className="text-xs font-bold text-gray-300 flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-psy-cyan" />
            Meus Roteiros Salvos
          </h4>
          {isLoadingSaved ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
            </div>
          ) : (
            <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1 custom-scrollbar">
              {savedRoutes.map(item => (
                <div 
                  key={item.id}
                  className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-xl flex items-center justify-between text-xs cursor-pointer transition-all"
                  onClick={() => handleLoadRoute(item)}
                >
                  <div className="min-w-0 pr-2">
                    <p className="font-bold text-white truncate">{item.name || 'Sem nome'}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {item.festivalIds?.length || 0} festivais • {item.totalDistance || 0} km
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLoadRoute(item);
                    }}
                    className="px-2.5 py-1 bg-psy-cyan/10 border border-psy-cyan/20 text-psy-cyan text-[10px] font-bold rounded hover:bg-psy-cyan/20"
                  >
                    Carregar
                  </button>
                </div>
              ))}
              {savedRoutes.length === 0 && (
                <p className="text-[10px] text-gray-500 py-2 text-center">Nenhum roteiro salvo ainda.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
