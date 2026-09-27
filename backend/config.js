// Data Source Configuration Registry (Adapter Pattern Config)
export const config = {
  version: "1.0.0-surrogate",
  dataSources: {
    weather: {
      provider: "mock", // 'mock' | 'imd' | 'era5'
      status: "HEALTHY",
      lastFetch: new Date().toISOString(),
      label: "IMD AWS & ERA5 Coupled Weather Feed",
      mockDescription: "Statistical Delhi NCR climatology generator (winter inversion calibrated)"
    },
    pollution: {
      provider: "mock", // 'mock' | 'cpcb' | 'safar'
      status: "HEALTHY",
      lastFetch: new Date().toISOString(),
      label: "CPCB 40-Station Continuous Ground Network",
      mockDescription: "CPCB diurnal PM2.5/PM10/O3/NO2 distribution model"
    },
    fire: {
      provider: "mock", // 'mock' | 'viirs' | 'modis'
      status: "HEALTHY",
      lastFetch: new Date().toISOString(),
      label: "NASA VIIRS/MODIS Stubble Fire Radiative Power (FRP)",
      mockDescription: "Punjab/Haryana stubble fire event & plume flux simulator"
    },
    satellite: {
      provider: "mock", // 'mock' | 'sentinel5p' | 'insat3d'
      status: "STANDBY",
      lastFetch: new Date().toISOString(),
      label: "Copernicus Sentinel-5P TROPOMI & INSAT-3D AOD",
      mockDescription: "Sample optical depth (AOD 550nm) and HCHO/NO2 satellite tiles"
    }
  }
};
