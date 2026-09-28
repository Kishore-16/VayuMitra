export type Basemap = 'dark' | 'positron' | 'voyager' | 'esri'
export interface Layers {
  stations: boolean
  fires: boolean
  plumes: boolean
  wind: boolean
  heat: boolean
  airshed: boolean
  anomalies: boolean
}

export const BASEMAPS: Record<Basemap, { label: string; url: string; attribution: string }> = {
  dark: {
    label: 'Dark',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri',
  },
  positron: {
    label: 'Light',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri',
  },
  voyager: {
    label: 'Streets',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
  },
  esri: {
    label: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri',
  },
}

export const PRESETS = {
  ncr: { label: 'Delhi-NCR', center: [28.62, 77.18] as [number, number], zoom: 10 },
  punjab: { label: 'Punjab stubble belt', center: [30.35, 75.7] as [number, number], zoom: 8 },
  airshed: { label: 'Full airshed', center: [29.7, 76.2] as [number, number], zoom: 7 },
}
export type Preset = keyof typeof PRESETS

