import React, { useState } from 'react';
import { Download, FileCode, Database, Check, X, Layers, Globe } from 'lucide-react';
import { Festival } from '../types';

interface SpatialExporterProps {
  festivals: Festival[];
  routeFestivals: Festival[];
  onClose: () => void;
}

export default function SpatialExporter({ festivals, routeFestivals, onClose }: SpatialExporterProps) {
  const [exportSource, setExportSource] = useState<'filtered' | 'route'>('filtered');
  const [format, setFormat] = useState<'geojson' | 'kml' | 'gpx' | 'csv' | 'json'>('geojson');
  const [downloaded, setDownloaded] = useState(false);

  const selectedData = exportSource === 'route' ? routeFestivals : festivals;

  const generateGeoJSON = () => {
    const features = selectedData.map(f => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [f.longitude, f.latitude]
      },
      properties: {
        id: f.id,
        nome: f.nome,
        país: f.país,
        cidade: f.cidade,
        data: f.data,
        vertentes: f.vertentes.join(', '),
        status: f.status,
        continente: f.continente,
        ambiente: f.ambiente || 'Não informado',
        tamanho: f.tamanho || 'Médio',
        faixaPreço: f.faixaPreço || '€€',
        descrição: f.descrição
      }
    }));

    // If exporting route, also add Polyline geometry
    if (exportSource === 'route' && selectedData.length > 1) {
      features.push({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: selectedData.map(f => [f.longitude, f.latitude])
        },
        properties: {
          name: 'Rota Nomad Maps',
          type: 'TravelRoute',
          totalNodes: selectedData.length
        }
      } as any);
    }

    return JSON.stringify({
      type: 'FeatureCollection',
      crs: {
        type: 'name',
        properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' }
      },
      features
    }, null, 2);
  };

  const generateKML = () => {
    const placemarks = selectedData.map(f => `
    <Placemark>
      <name>${f.nome}</name>
      <description><![CDATA[<b>Data:</b> ${f.data}<br/><b>Local:</b> ${f.cidade}, ${f.país}<br/><b>Vertentes:</b> ${f.vertentes.join(', ')}]]></description>
      <Point>
        <coordinates>${f.longitude},${f.latitude},0</coordinates>
      </Point>
    </Placemark>`).join('');

    let routeLine = '';
    if (exportSource === 'route' && selectedData.length > 1) {
      const coords = selectedData.map(f => `${f.longitude},${f.latitude},0`).join(' ');
      routeLine = `
    <Placemark>
      <name>Trajeto de Viagem</name>
      <LineString>
        <coordinates>${coords}</coordinates>
      </LineString>
    </Placemark>`;
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Nomad Maps Export - ${exportSource.toUpperCase()}</name>
    ${placemarks}
    ${routeLine}
  </Document>
</kml>`;
  };

  const generateGPX = () => {
    const wpts = selectedData.map(f => `
  <wpt lat="${f.latitude}" lon="${f.longitude}">
    <name>${f.nome}</name>
    <desc>${f.cidade}, ${f.país} - ${f.data}</desc>
  </wpt>`).join('');

    let trk = '';
    if (exportSource === 'route' && selectedData.length > 1) {
      const trkpts = selectedData.map(f => `
      <trkpt lat="${f.latitude}" lon="${f.longitude}">
        <name>${f.nome}</name>
      </trkpt>`).join('');

      trk = `
  <trk>
    <name>Rota Psicodélica Nomad Maps</name>
    <trkseg>
      ${trkpts}
    </trkseg>
  </trk>`;
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Nomad Maps GIS Platform" xmlns="http://www.topografix.com/GPX/1/1">
  ${wpts}
  ${trk}
</gpx>`;
  };

  const generateCSV = () => {
    const headers = ['id', 'nome', 'país', 'cidade', 'latitude', 'longitude', 'data', 'vertentes', 'continente', 'ambiente', 'status'];
    const rows = selectedData.map(f => [
      `"${f.id}"`,
      `"${f.nome}"`,
      `"${f.país}"`,
      `"${f.cidade}"`,
      f.latitude,
      f.longitude,
      `"${f.data}"`,
      `"${f.vertentes.join(';')}"`,
      `"${f.continente}"`,
      `"${f.ambiente || ''}"`,
      `"${f.status}"`
    ].join(','));

    return [headers.join(','), ...rows].join('\n');
  };

  const generateJSON = () => {
    return JSON.stringify(selectedData, null, 2);
  };

  const handleDownload = () => {
    let content = '';
    let mimeType = 'text/plain';
    let ext = format;

    switch (format) {
      case 'geojson':
        content = generateGeoJSON();
        mimeType = 'application/geo+json';
        ext = 'geojson';
        break;
      case 'kml':
        content = generateKML();
        mimeType = 'application/vnd.google-earth.kml+xml';
        ext = 'kml';
        break;
      case 'gpx':
        content = generateGPX();
        mimeType = 'application/gpx+xml';
        ext = 'gpx';
        break;
      case 'csv':
        content = generateCSV();
        mimeType = 'text/csv';
        ext = 'csv';
        break;
      case 'json':
        content = generateJSON();
        mimeType = 'application/json';
        ext = 'json';
        break;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nomad_maps_${exportSource}_${Date.now()}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-[2000] bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-psy-dark border border-psy-cyan/30 rounded-2xl w-full max-w-lg overflow-hidden shadow-[0_0_50px_rgba(34,211,238,0.15)] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-psy-cyan/10 border border-psy-cyan/20 rounded-xl">
              <Database className="w-5 h-5 text-psy-cyan" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white leading-tight">Exportar Dados Espaciais (SIG)</h3>
              <p className="text-[10px] text-gray-400">Formatos compatíveis com QGIS, Google Earth, Garmin & Mapbox</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Data Source Picker */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2 block">
              Fonte de Dados
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setExportSource('filtered')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  exportSource === 'filtered'
                    ? 'bg-psy-cyan/10 border-psy-cyan text-psy-cyan font-bold'
                    : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'
                }`}
              >
                <p className="text-xs font-bold">Festivais Filtrados</p>
                <p className="text-[10px] opacity-70 mt-0.5">{festivals.length} registro(s)</p>
              </button>

              <button
                type="button"
                onClick={() => setExportSource('route')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  exportSource === 'route'
                    ? 'bg-psy-magenta/10 border-psy-magenta text-psy-magenta font-bold'
                    : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'
                }`}
              >
                <p className="text-xs font-bold">Rota Planejada</p>
                <p className="text-[10px] opacity-70 mt-0.5">{routeFestivals.length} festival(is)</p>
              </button>
            </div>
          </div>

          {/* Export Format Selector */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2 block">
              Formato de Arquivo Espacial
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'geojson', name: 'GeoJSON', desc: 'QGIS & WebGIS' },
                { id: 'kml', name: 'KML', desc: 'Google Earth' },
                { id: 'gpx', name: 'GPX', desc: 'GPS & Garmin' },
                { id: 'csv', name: 'CSV', desc: 'Tabela de Pontos' },
                { id: 'json', name: 'JSON API', desc: 'Raw Dataset' }
              ].map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFormat(f.id as any)}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    format === f.id
                      ? 'bg-psy-neon/15 border-psy-neon text-psy-neon font-bold shadow-[0_0_10px_rgba(0,255,0,0.2)]'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'
                  }`}
                >
                  <p className="text-xs font-bold">{f.name}</p>
                  <p className="text-[9px] text-gray-400 mt-0.5">{f.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Format Summary Info */}
          <div className="p-3 bg-black/40 border border-white/5 rounded-xl text-xs text-gray-300 flex items-start gap-2.5">
            <Globe className="w-4 h-4 text-psy-cyan shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              {format === 'geojson' && "Padrão OGC RFC 7946 com coordenadas EPSG:4326. Contém propriedades de atributos e geometrias para software SIG."}
              {format === 'kml' && "Formato OGC KML pronto para abrir no Google Earth Pro, Maps.me ou navegador Web."}
              {format === 'gpx' && "Formato GPS para navegar por waypoints e rotas terrestres em dispositivos esportivos."}
              {format === 'csv' && "Formato delimitado por vírgulas contendo atributos espaciais de Latitude e Longitude."}
              {format === 'json' && "Coleção estruturada de objetos de festivais pronta para desenvolvimento Web."}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-white/5 flex items-center justify-between">
          <span className="text-[10px] text-gray-400 font-medium">
            Exportando {selectedData.length} item(ns)
          </span>
          <button
            type="button"
            onClick={handleDownload}
            disabled={selectedData.length === 0}
            className="psy-button psy-button-primary px-5 py-2 text-xs font-bold flex items-center gap-2"
          >
            {downloaded ? (
              <>
                <Check className="w-4 h-4 text-psy-neon" /> Baixado com Sucesso!
              </>
            ) : (
              <>
                <Download className="w-4 h-4" /> Exportar Arquivo .{format.toUpperCase()}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
