import Papa from 'papaparse';
import { Festival, InfrastructurePOI } from '../types';
import { db, collection, getDocs, setDoc, doc } from '../firebase';

const countryToContinent: Record<string, string> = {
  'Portugal': 'Europa',
  'Hungary': 'Europa',
  'Brazil': 'América do Sul',
  'Croatia': 'Europa',
  'India': 'Ásia',
  'Germany': 'Europa',
  'Switzerland': 'Europa',
  'Netherlands': 'Europa',
  'Israel': 'Ásia',
  'USA': 'América do Norte',
  'Australia': 'Oceania',
};

const festivalMetaPreset: Record<string, Partial<Festival>> = {
  'Boom Festival': {
    ambiente: 'Lago',
    tamanho: 'Massivo',
    faixaPreço: '€€€',
    campingIncluso: true,
    petFriendly: false,
    familiaFriendly: true,
  },
  'Ozora Festival': {
    ambiente: 'Vale',
    tamanho: 'Massivo',
    faixaPreço: '€€',
    campingIncluso: true,
    petFriendly: true,
    familiaFriendly: true,
  },
  'Universo Paralello': {
    ambiente: 'Praia',
    tamanho: 'Massivo',
    faixaPreço: '€€',
    campingIncluso: true,
    petFriendly: false,
    familiaFriendly: false,
  },
  'MoDem Festival': {
    ambiente: 'Floresta',
    tamanho: 'Grande',
    faixaPreço: '€€',
    campingIncluso: true,
    petFriendly: false,
    familiaFriendly: false,
  },
  'Hilltop Festival': {
    ambiente: 'Praia',
    tamanho: 'Médio',
    faixaPreço: '€',
    campingIncluso: false,
    petFriendly: true,
    familiaFriendly: false,
  },
  'Antaris Project': {
    ambiente: 'Floresta',
    tamanho: 'Médio',
    faixaPreço: '€€',
    campingIncluso: true,
    petFriendly: true,
    familiaFriendly: true,
  },
  'ZNA Gathering': {
    ambiente: 'Lago',
    tamanho: 'Médio',
    faixaPreço: '€€',
    campingIncluso: true,
    petFriendly: false,
    familiaFriendly: true,
  },
  'Shankra Festival': {
    ambiente: 'Montanha',
    tamanho: 'Grande',
    faixaPreço: '€€',
    campingIncluso: true,
    petFriendly: false,
    familiaFriendly: true,
  }
};

function generateNearbyPOIs(fest: { id: string; nome: string; latitude: number; longitude: number; cidade: string; país: string }): InfrastructurePOI[] {
  const lat = fest.latitude;
  const lng = fest.longitude;

  return [
    {
      id: `poi-aero-${fest.id}`,
      nome: `Aeroporto Internacional de ${fest.cidade}`,
      categoria: 'aeroporto',
      latitude: lat + 0.28,
      longitude: lng - 0.35,
      cidade: fest.cidade,
      país: fest.país,
      distanciaKm: 42,
      festivalIdRelacionado: fest.id,
      detalhes: 'Hub aéreo principal com translado direto para o festival.'
    },
    {
      id: `poi-hosp-${fest.id}`,
      nome: `Hospital Regional de ${fest.cidade}`,
      categoria: 'hospital',
      latitude: lat - 0.08,
      longitude: lng + 0.12,
      cidade: fest.cidade,
      país: fest.país,
      distanciaKm: 14,
      festivalIdRelacionado: fest.id,
      detalhes: 'Atendimento médico 24h e suporte de emergência.'
    },
    {
      id: `poi-camp-${fest.id}`,
      nome: `Eco Camping ${fest.nome}`,
      categoria: 'camping',
      latitude: lat + 0.03,
      longitude: lng + 0.02,
      cidade: fest.cidade,
      país: fest.país,
      distanciaKm: 3,
      festivalIdRelacionado: fest.id,
      detalhes: 'Área com sombras, água potável, duchas quentes e banheiros químicos.'
    },
    {
      id: `poi-nat-${fest.id}`,
      nome: `Mirante & Parque Natural de ${fest.cidade}`,
      categoria: 'atração_natural',
      latitude: lat - 0.05,
      longitude: lng - 0.07,
      cidade: fest.cidade,
      país: fest.país,
      distanciaKm: 8,
      festivalIdRelacionado: fest.id,
      detalhes: 'Ponto turístico com trilhas, cachoeiras e pôr do sol inesquecível.'
    }
  ];
}

export async function loadFestivals(): Promise<Festival[]> {
  const fetchWithTimeout = async (): Promise<Festival[]> => {
    const festivalsCol = collection(db, 'festivals');
    const snapshot = await getDocs(festivalsCol);
    
    if (snapshot.empty) {
      console.log('Firestore empty, seeding from CSV...');
      const csvFestivals = await loadFromCSV();
      for (const f of csvFestivals) {
        try {
          await setDoc(doc(db, 'festivals', f.id), f);
        } catch (err) {
          console.warn('Could not seed festival to Firestore:', err);
        }
      }
      return csvFestivals;
    }
    
    const rawList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Festival));
    return rawList.map(f => {
      const preset = festivalMetaPreset[f.nome] || {
        ambiente: 'Floresta',
        tamanho: 'Médio',
        faixaPreço: '€€',
        campingIncluso: true,
        petFriendly: false,
        familiaFriendly: true
      };
      const pois = f.pois || generateNearbyPOIs(f);
      return { ...preset, ...f, pois };
    });
  };

  const timeoutPromise = new Promise<Festival[]>((_, reject) => 
    setTimeout(() => reject(new Error('Firestore timeout')), 1200)
  );

  try {
    return await Promise.race([fetchWithTimeout(), timeoutPromise]);
  } catch (error) {
    console.warn('Firestore fetch timed out or failed, serving instant local dataset:', error);
    return await loadFromCSV();
  }
}

async function loadFromCSV(): Promise<Festival[]> {
  const response = await fetch('/festivals.csv');
  const csvText = await response.text();
  
  return new Promise((resolve, reject) => {
    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const festivals: Festival[] = results.data.map((row: any, index: number) => {
          const nome = (row['Nome'] || row['nome'] || 'Festival Trance').trim();
          
          // Parse WKT geometry if present: "POINT (lon lat)"
          const wkt = row['WKT'] || row['wkt'] || '';
          let lat = parseFloat(row['latitude'] || row['lat'] || '0');
          let lng = parseFloat(row['longitude'] || row['lng'] || row['lon'] || '0');

          if (wkt && wkt.includes('POINT')) {
            const match = wkt.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
            if (match) {
              lng = parseFloat(match[1]);
              lat = parseFloat(match[2]);
            }
          }

          const país = (row['Pais'] || row['país'] || row['pais'] || 'Internacional').trim();
          const cidade = row['cidade/localização'] || row['cidade'] || país;
          const continente = (row['Continente'] || row['continente'] || countryToContinent[país] || 'Outro').trim();

          // Vertentes e Subvertentes
          const vertentePrincipal = row['Vertente principal'] || '';
          const subvertentes = row['Subvertentes'] || '';
          const rawVertentes = row['vertentes'] || `${vertentePrincipal}, ${subvertentes}`;
          
          const vertentesSet = new Set<string>();
          rawVertentes.split(/[,;/]+/).forEach((v: string) => {
            const clean = v.trim();
            if (clean && clean !== 'Psytrance - multigênero') {
              vertentesSet.add(clean);
            }
          });
          if (vertentesSet.size === 0) {
            vertentesSet.add('Psytrance');
            vertentesSet.add('Full-On');
          }
          const vertentes = Array.from(vertentesSet);

          const status = (row['Status'] || row['status'] || 'Ativo').trim() as 'Ativo' | 'Inativo';
          const id = `fest-${index}`;

          // Realistic month dates if missing
          let dateStr = row['data'];
          if (!dateStr) {
            if (continente === 'América do Sul' || continente === 'Oceania') {
              dateStr = index % 2 === 0 ? '2025-12-28' : '2025-01-18';
            } else if (continente === 'Europa') {
              dateStr = index % 2 === 0 ? '2025-07-20' : '2025-08-12';
            } else {
              dateStr = index % 2 === 0 ? '2025-04-15' : '2025-10-05';
            }
          }

          const preset = festivalMetaPreset[nome] || {
            ambiente: (index % 4 === 0 ? 'Praia' : index % 4 === 1 ? 'Montanha' : index % 4 === 2 ? 'Floresta' : 'Lago') as any,
            tamanho: (index % 3 === 0 ? 'Massivo' : index % 3 === 1 ? 'Grande' : 'Médio') as any,
            faixaPreço: '€€',
            campingIncluso: true,
            petFriendly: index % 5 === 0,
            familiaFriendly: true
          };

          const descrição = row['descrição'] || `Encontro mundial de música eletrônica e cultura psicodélica em ${país}.`;

          return {
            id,
            nome,
            país,
            cidade,
            latitude: lat,
            longitude: lng,
            data: dateStr,
            vertentes,
            status: status === 'Inativo' ? 'Inativo' : 'Ativo',
            descrição,
            continente,
            ...preset,
            pois: generateNearbyPOIs({ id, nome, latitude: lat, longitude: lng, cidade, país })
          };
        });

        // Filter out items without valid coordinates
        const validFestivals = festivals.filter(f => !isNaN(f.latitude) && !isNaN(f.longitude) && f.latitude !== 0 && f.longitude !== 0);
        resolve(validFestivals);
      },
      error: (error: any) => {
        reject(error);
      }
    });
  });
}
