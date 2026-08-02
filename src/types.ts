export interface InfrastructurePOI {
  id: string;
  nome: string;
  categoria: 'aeroporto' | 'rodoviária' | 'porto' | 'camping' | 'hotel' | 'hostel' | 'hospital' | 'atração_natural' | 'ponto_turistico';
  latitude: number;
  longitude: number;
  cidade?: string;
  país?: string;
  distanciaKm?: number;
  festivalIdRelacionado?: string;
  detalhes?: string;
}

export interface Festival {
  id: string;
  nome: string;
  país: string;
  cidade: string;
  latitude: number;
  longitude: number;
  data: string;
  vertentes: string[];
  status: 'Ativo' | 'Inativo';
  descrição: string;
  continente: string;
  ambiente?: 'Praia' | 'Montanha' | 'Floresta' | 'Lago' | 'Rio' | 'Deserto' | 'Vale';
  tamanho?: 'Pequeno' | 'Médio' | 'Grande' | 'Massivo';
  faixaPreço?: '€' | '€€' | '€€€';
  campingIncluso?: boolean;
  petFriendly?: boolean;
  familiaFriendly?: boolean;
  pois?: InfrastructurePOI[];
}

export interface TravelRoute {
  festivals: Festival[];
  totalDistance: number;
}

export type MapTileStyle = 'dark' | 'satellite' | 'topo' | 'light';

export interface MapLayersState {
  festivais: boolean;
  aeroportos: boolean;
  acomodacoes: boolean;
  natureza: boolean;
  servicos: boolean;
  bufferRadius: boolean;
  heatmap: boolean;
}
