import { Search, Filter, Trees, Mountain, Waves, Tent, Dog, Users } from 'lucide-react';
import { Festival } from '../types';
import { useState, useMemo } from 'react';
import { cn } from '../lib/utils';

interface FiltersProps {
  festivals: Festival[];
  onFilterChange: (filtered: Festival[]) => void;
  routeFestivals: Festival[];
  onPlanTrip: (festival: Festival) => void;
  onRemoveFromRoute: (id: string) => void;
}

export default function Filters({ 
  festivals, 
  onFilterChange,
  routeFestivals,
  onPlanTrip,
  onRemoveFromRoute
}: FiltersProps) {
  const [search, setSearch] = useState('');
  const [selectedContinent, setSelectedContinent] = useState('Todos');
  const [selectedGenre, setSelectedGenre] = useState('Todos');
  const [selectedStatus, setSelectedStatus] = useState('Todos');
  const [selectedAmbiente, setSelectedAmbiente] = useState('Todos');
  const [selectedTamanho, setSelectedTamanho] = useState('Todos');
  const [campingOnly, setCampingOnly] = useState(false);
  const [petFriendlyOnly, setPetFriendlyOnly] = useState(false);

  const continents = useMemo(() => {
    const raw = festivals.map(f => f.continente).filter(Boolean);
    return ['Todos', ...new Set(raw)];
  }, [festivals]);

  const genres = useMemo(() => {
    const raw = festivals.flatMap(f => f.vertentes || []).filter(Boolean);
    return ['Todos', ...new Set(raw)];
  }, [festivals]);

  const ambientes = ['Todos', 'Praia', 'Montanha', 'Floresta', 'Lago', 'Rio', 'Deserto', 'Vale'];
  const tamanhos = ['Todos', 'Pequeno', 'Médio', 'Grande', 'Massivo'];

  // Save the full filtered list before triggering change
  const filteredList = useMemo(() => {
    return festivals.filter(f => {
      const matchesSearch = (f.nome || '').toLowerCase().includes(search.toLowerCase()) || 
                           (f.país || '').toLowerCase().includes(search.toLowerCase()) ||
                           (f.cidade || '').toLowerCase().includes(search.toLowerCase());
      const matchesContinent = selectedContinent === 'Todos' || f.continente === selectedContinent;
      const matchesGenre = selectedGenre === 'Todos' || (f.vertentes || []).includes(selectedGenre);
      const matchesStatus = selectedStatus === 'Todos' || f.status === selectedStatus;
      const matchesAmbiente = selectedAmbiente === 'Todos' || f.ambiente === selectedAmbiente;
      const matchesTamanho = selectedTamanho === 'Todos' || f.tamanho === selectedTamanho;
      const matchesCamping = !campingOnly || f.campingIncluso;
      const matchesPet = !petFriendlyOnly || f.petFriendly;
      
      return matchesSearch && matchesContinent && matchesGenre && matchesStatus && matchesAmbiente && matchesTamanho && matchesCamping && matchesPet;
    });
  }, [search, selectedContinent, selectedGenre, selectedStatus, selectedAmbiente, selectedTamanho, campingOnly, petFriendlyOnly, festivals]);

  useMemo(() => {
    onFilterChange(filteredList);
  }, [filteredList]);

  return (
    <div className="space-y-5">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar festivais, cidades ou países..."
          className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 focus:outline-none focus:border-psy-cyan/50 transition-colors text-sm text-white"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-3">
        {/* Continent */}
        <div>
          <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-1 block">Continente</label>
          <select 
            className="w-full bg-white/5 border border-white/10 rounded-lg py-1.5 px-3 text-xs focus:outline-none focus:border-psy-cyan/50 text-white"
            value={selectedContinent}
            onChange={(e) => setSelectedContinent(e.target.value)}
          >
            {continents.map(c => <option key={c} value={c} className="bg-psy-dark text-white">{c}</option>)}
          </select>
        </div>

        {/* Ambiente / Eco-Setting */}
        <div>
          <label className="text-[10px] uppercase tracking-wider text-psy-cyan font-bold mb-1 block">Ambiente / Natureza</label>
          <div className="flex flex-wrap gap-1">
            {ambientes.map(a => (
              <button
                key={a}
                type="button"
                onClick={() => setSelectedAmbiente(a)}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[10px] font-bold border transition-all",
                  selectedAmbiente === a 
                    ? "bg-psy-cyan/20 border-psy-cyan text-psy-cyan" 
                    : "bg-white/5 border-white/5 text-gray-400 hover:text-white"
                )}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        {/* Subgênero */}
        <div>
          <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-1 block">Subgênero Musical</label>
          <select 
            className="w-full bg-white/5 border border-white/10 rounded-lg py-1.5 px-3 text-xs focus:outline-none focus:border-psy-cyan/50 text-white"
            value={selectedGenre}
            onChange={(e) => setSelectedGenre(e.target.value)}
          >
            {genres.map(g => <option key={g} value={g} className="bg-psy-dark text-white">{g}</option>)}
          </select>
        </div>

        {/* Tamanho do Evento */}
        <div>
          <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-1 block">Porte do Evento</label>
          <div className="flex gap-1">
            {tamanhos.map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setSelectedTamanho(t)}
                className={cn(
                  "flex-1 py-1 rounded-md text-[9px] font-bold border transition-all text-center",
                  selectedTamanho === t 
                    ? "bg-psy-magenta/20 border-psy-magenta text-psy-magenta" 
                    : "bg-white/5 border-white/5 text-gray-400 hover:text-white"
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Checkboxes: Camping / Pet Friendly */}
        <div className="pt-2 flex items-center justify-between text-xs gap-2">
          <label className="flex items-center gap-1.5 cursor-pointer text-gray-300 hover:text-white">
            <input 
              type="checkbox" 
              checked={campingOnly} 
              onChange={e => setCampingOnly(e.target.checked)}
              className="accent-psy-cyan rounded" 
            />
            <span className="text-[11px]">⛺ Camping Incluso</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer text-gray-300 hover:text-white">
            <input 
              type="checkbox" 
              checked={petFriendlyOnly} 
              onChange={e => setPetFriendlyOnly(e.target.checked)}
              className="accent-psy-cyan rounded" 
            />
            <span className="text-[11px]">🐕 Pet Friendly</span>
          </label>
        </div>
      </div>

      <div className="pt-3 border-t border-white/10">
        <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
          <span>Festivais Encontrados:</span>
          <span className="text-psy-cyan font-bold">{filteredList.length}</span>
        </div>

        <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1 custom-scrollbar">
          {filteredList.map(festival => {
            const isInRoute = routeFestivals.some(rf => rf.id === festival.id);
            return (
              <div 
                key={festival.id}
                className={cn(
                  "p-2.5 rounded-xl border bg-white/5 flex items-center justify-between gap-2 group transition-all duration-300",
                  isInRoute ? "border-psy-neon/40 bg-psy-neon/5" : "border-white/5 hover:border-white/10"
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-xs font-bold text-white truncate">{festival.nome}</h4>
                    {festival.ambiente && (
                      <span className="text-[8px] px-1.5 py-0.2 bg-psy-cyan/20 text-psy-cyan rounded font-bold">
                        {festival.ambiente}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-400 truncate">{festival.país} • {festival.cidade}</p>
                  <p className="text-[9px] text-psy-magenta mt-0.5">
                    {new Date(festival.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => isInRoute ? onRemoveFromRoute(festival.id) : onPlanTrip(festival)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all shrink-0",
                    isInRoute 
                      ? "bg-red-500/20 text-red-300 border border-red-500/30" 
                      : "bg-psy-neon/10 text-psy-neon border border-psy-neon/20 hover:bg-psy-neon/20"
                  )}
                >
                  {isInRoute ? "Remover" : "Planejar"}
                </button>
              </div>
            );
          })}
          {filteredList.length === 0 && (
            <p className="text-center text-xs text-gray-500 py-6">Nenhum festival encontrado com estes filtros.</p>
          )}
        </div>
      </div>
    </div>
  );
}

