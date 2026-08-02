import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Festival, MapTileStyle, MapLayersState } from '../types';
import { useEffect, useState } from 'react';
import { cn } from '../lib/utils';
import { Layers, Download, Eye, Compass, Plane, Tent, Cross, Trees, Globe2, MapPin } from 'lucide-react';
import SpatialExporter from './SpatialExporter';

// Custom Marker Creators using Leaflet DivIcon
const createCustomIcon = (bgColor: string, borderColor: string, iconSymbol: string, shadowColor: string) => {
  return L.divIcon({
    className: 'custom-map-pin',
    html: `<div style="
      background-color: ${bgColor};
      border: 2px solid ${borderColor};
      color: white;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      box-shadow: 0 0 12px ${shadowColor};
      cursor: pointer;
      transition: transform 0.2s;
    ">${iconSymbol}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  });
};

const festivalIcon = createCustomIcon('#0f172a', '#22d3ee', '🎪', 'rgba(34, 211, 238, 0.6)');
const selectedFestivalIcon = createCustomIcon('#22d3ee', '#d946ef', '⭐', 'rgba(217, 70, 239, 0.8)');
const airportIcon = createCustomIcon('#1e293b', '#3b82f6', '✈️', 'rgba(59, 130, 246, 0.5)');
const campingIcon = createCustomIcon('#022c22', '#10b981', '⛺', 'rgba(16, 185, 129, 0.5)');
const naturalIcon = createCustomIcon('#14532d', '#22c55e', '🏞️', 'rgba(34, 197, 94, 0.5)');
const hospitalIcon = createCustomIcon('#450a0a', '#ef4444', '🏥', 'rgba(239, 68, 68, 0.5)');

interface MapProps {
  festivals: Festival[];
  selectedFestivals: Festival[];
  onSelectFestival: (festival: Festival) => void;
  onPlanTrip: (festival: Festival) => void;
  onRemoveFromRoute: (id: string) => void;
  routeFestivals: Festival[];
}

function MapUpdater({ festivals }: { festivals: Festival[] }) {
  const map = useMap();
  useEffect(() => {
    if (festivals.length > 0) {
      const bounds = L.latLngBounds(festivals.map(f => [f.latitude, f.longitude]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [festivals, map]);
  return null;
}

export default function Map({ 
  festivals, 
  selectedFestivals, 
  onSelectFestival, 
  onPlanTrip,
  onRemoveFromRoute,
  routeFestivals 
}: MapProps) {
  const [tileStyle, setTileStyle] = useState<MapTileStyle>('dark');
  const [showExporter, setShowExporter] = useState(false);
  const [layersPanelOpen, setLayersPanelOpen] = useState(false);

  const [layers, setLayers] = useState<MapLayersState>({
    festivais: true,
    aeroportos: true,
    acomodacoes: true,
    natureza: true,
    servicos: true,
    bufferRadius: false,
    heatmap: false,
  });

  // Tile layer URL dictionary
  const tileUrls: Record<MapTileStyle, { url: string; attr: string }> = {
    dark: {
      url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      attr: '&copy; OpenStreetMap contributors &copy; CARTO'
    },
    satellite: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attr: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    },
    topo: {
      url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
      attr: 'Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap (CC-BY-SA)'
    },
    light: {
      url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      attr: '&copy; OpenStreetMap contributors &copy; CARTO'
    }
  };

  // Sort route by date to ensure temporal order route rendering
  const sortedRoute = [...routeFestivals].sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
  const routePositions = sortedRoute.map(f => [f.latitude, f.longitude] as [number, number]);

  return (
    <div className="h-full w-full relative group">
      <MapContainer 
        center={[20, 0]} 
        zoom={2} 
        className="h-full w-full"
        scrollWheelZoom={true}
      >
        <TileLayer
          key={tileStyle}
          attribution={tileUrls[tileStyle].attr}
          url={tileUrls[tileStyle].url}
        />

        {/* Render Buffer Radius (50km) around festivals when enabled */}
        {layers.bufferRadius && festivals.map(festival => (
          <Circle
            key={`buffer-${festival.id}`}
            center={[festival.latitude, festival.longitude]}
            radius={50000} // 50km
            pathOptions={{
              color: '#22d3ee',
              fillColor: '#22d3ee',
              fillOpacity: 0.08,
              weight: 1,
              dashArray: '4, 4'
            }}
          />
        ))}

        {/* Render Festival Pins */}
        {layers.festivais && festivals.map((festival) => {
          const isInRoute = routeFestivals.some(r => r.id === festival.id);
          const isSelected = selectedFestivals.some(s => s.id === festival.id);

          return (
            <Marker 
              key={festival.id} 
              position={[festival.latitude, festival.longitude]}
              icon={isSelected ? selectedFestivalIcon : festivalIcon}
              eventHandlers={{
                click: () => onSelectFestival(festival)
              }}
            >
              <Popup>
                <div className="p-2 min-w-[220px]">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold bg-psy-neon/20 text-psy-neon border border-psy-neon/30">
                      {festival.ambiente || 'Festival'}
                    </span>
                    <span className="text-[10px] text-gray-400 font-medium">
                      {festival.tamanho || 'Médio'} • {festival.faixaPreço || '€€'}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-psy-cyan leading-tight mb-1">{festival.nome}</h3>
                  <p className="text-xs text-gray-300 mb-2">{festival.país} - {festival.cidade}</p>
                  <p className="text-[10px] text-psy-magenta font-semibold mb-2">
                    📅 {new Date(festival.data).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </p>

                  <div className="flex flex-wrap gap-1 mb-3">
                    {festival.vertentes.slice(0, 3).map(v => (
                      <span key={v} className="text-[9px] px-2 py-0.5 bg-psy-purple/30 text-gray-200 rounded-full border border-psy-purple/50">
                        {v}
                      </span>
                    ))}
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-white/10">
                    <button 
                      type="button"
                      onClick={() => onSelectFestival(festival)}
                      className="text-xs flex-1 py-1.5 bg-psy-cyan/20 border border-psy-cyan/50 rounded-lg hover:bg-psy-cyan/40 transition-colors font-bold text-psy-cyan"
                    >
                      Detalhes
                    </button>
                    <button 
                      type="button"
                      onClick={() => isInRoute ? onRemoveFromRoute(festival.id) : onPlanTrip(festival)}
                      className={cn(
                        "text-xs flex-1 py-1.5 rounded-lg transition-colors border font-bold",
                        isInRoute 
                          ? "bg-red-500/20 border-red-500/50 text-red-200 hover:bg-red-500/40" 
                          : "bg-psy-magenta/20 border-psy-magenta/50 text-psy-magenta hover:bg-psy-magenta/40"
                      )}
                    >
                      {isInRoute ? "Remover" : "Planejar"}
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Render Infrastructure & Spatial POI Layers */}
        {festivals.flatMap(f => f.pois || []).map(poi => {
          if (poi.categoria === 'aeroporto' && !layers.aeroportos) return null;
          if (poi.categoria === 'camping' && !layers.acomodacoes) return null;
          if (poi.categoria === 'atração_natural' && !layers.natureza) return null;
          if (poi.categoria === 'hospital' && !layers.servicos) return null;

          let icon = airportIcon;
          if (poi.categoria === 'camping') icon = campingIcon;
          if (poi.categoria === 'atração_natural') icon = naturalIcon;
          if (poi.categoria === 'hospital') icon = hospitalIcon;

          return (
            <Marker
              key={poi.id}
              position={[poi.latitude, poi.longitude]}
              icon={icon}
            >
              <Popup>
                <div className="p-2 min-w-[180px]">
                  <span className="text-[9px] uppercase font-bold text-psy-cyan block mb-1">
                    {poi.categoria.replace('_', ' ')}
                  </span>
                  <h4 className="text-sm font-bold text-white mb-1">{poi.nome}</h4>
                  <p className="text-[10px] text-gray-300 leading-tight mb-2">{poi.detalhes}</p>
                  {poi.distanciaKm && (
                    <span className="text-[10px] text-psy-neon font-bold block">
                      📍 ~{poi.distanciaKm} km do festival
                    </span>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Render Polyline Route */}
        {routePositions.length > 1 && (
          <Polyline 
            positions={routePositions} 
            color="#d946ef" 
            weight={3.5} 
            dashArray="10, 10"
            className="animate-pulse"
          />
        )}

        <MapUpdater festivals={festivals} />
      </MapContainer>

      {/* Floating Toolbar & Layers Control Overlay */}
      <div className="absolute top-6 right-6 z-[1000] flex flex-col items-end gap-3">
        {/* Basemap & Export Buttons */}
        <div className="flex items-center gap-2 bg-psy-dark/90 backdrop-blur-md p-1.5 rounded-2xl border border-white/10 shadow-2xl">
          <button
            type="button"
            onClick={() => setLayersPanelOpen(!layersPanelOpen)}
            className={cn(
              "p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all",
              layersPanelOpen ? "bg-psy-cyan/20 text-psy-cyan border border-psy-cyan/30" : "text-gray-300 hover:text-white hover:bg-white/5"
            )}
            title="Gerenciar Camadas do Mapa"
          >
            <Layers className="w-4 h-4" />
            <span className="hidden sm:inline">Camadas GIS</span>
          </button>

          <button
            type="button"
            onClick={() => setShowExporter(true)}
            className="p-2 bg-psy-neon/15 hover:bg-psy-neon/25 border border-psy-neon/30 text-psy-neon rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
            title="Exportar Dados Espaciais (GeoJSON/KML/GPX)"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Exportar SIG</span>
          </button>
        </div>

        {/* Floating Layer Control Panel */}
        {layersPanelOpen && (
          <div className="w-64 bg-psy-dark/95 backdrop-blur-xl border border-white/15 rounded-2xl p-4 shadow-2xl space-y-4 animate-fadeIn">
            <div>
              <h4 className="text-[10px] uppercase font-bold text-psy-cyan tracking-wider mb-2">Estilo do Mapa Base</h4>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'dark', label: 'Dark Psy' },
                  { id: 'satellite', label: 'Satélite' },
                  { id: 'topo', label: 'Topográfico' },
                  { id: 'light', label: 'Claro' },
                ].map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setTileStyle(s.id as MapTileStyle)}
                    className={cn(
                      "px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-all text-center",
                      tileStyle === s.id 
                        ? "bg-psy-cyan/20 border-psy-cyan text-psy-cyan" 
                        : "bg-white/5 border-white/5 text-gray-400 hover:text-white"
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-white/10 pt-3 space-y-2">
              <h4 className="text-[10px] uppercase font-bold text-psy-magenta tracking-wider mb-1">Camadas Vetoriais</h4>
              
              {[
                { key: 'festivais', label: '🎪 Festivais', color: 'text-psy-cyan' },
                { key: 'aeroportos', label: '✈️ Aeroportos & Transporte', color: 'text-blue-400' },
                { key: 'acomodacoes', label: '⛺ Campings & Acomodação', color: 'text-emerald-400' },
                { key: 'natureza', label: '🏞️ Pontos Naturais & Atrações', color: 'text-green-400' },
                { key: 'servicos', label: '🏥 Hospitais & Serviços', color: 'text-red-400' },
                { key: 'bufferRadius', label: '🎯 Raio de Influência (50km)', color: 'text-psy-neon' },
              ].map(item => (
                <label key={item.key} className="flex items-center justify-between text-xs text-gray-300 cursor-pointer hover:text-white">
                  <span className={item.color}>{item.label}</span>
                  <input
                    type="checkbox"
                    checked={(layers as any)[item.key]}
                    onChange={(e) => setLayers({ ...layers, [item.key]: e.target.checked })}
                    className="accent-psy-cyan rounded w-3.5 h-3.5"
                  />
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Map Legend */}
      <div className="absolute bottom-6 left-6 z-[1000] flex flex-col gap-2">
        <div className="psy-card py-2 px-4 flex flex-wrap items-center gap-4 text-[11px] font-medium bg-psy-dark/90 backdrop-blur-md border border-white/10 shadow-xl">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-psy-cyan shadow-[0_0_5px_#22d3ee]"></div>
            <span>Festivais ({festivals.length})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-psy-magenta shadow-[0_0_5px_#d946ef]"></div>
            <span>Rota ({routeFestivals.length})</span>
          </div>
          {layers.aeroportos && (
            <div className="flex items-center gap-1">
              <span>✈️ Transporte</span>
            </div>
          )}
          {layers.acomodacoes && (
            <div className="flex items-center gap-1">
              <span>⛺ Campings</span>
            </div>
          )}
        </div>
      </div>

      {/* Spatial Exporter Modal */}
      {showExporter && (
        <SpatialExporter 
          festivals={festivals}
          routeFestivals={routeFestivals}
          onClose={() => setShowExporter(false)}
        />
      )}
    </div>
  );
}
