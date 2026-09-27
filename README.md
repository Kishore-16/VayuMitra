# DELHI-AIR-COUPLED 🌪️
### High-Resolution Coupled Meteorology–Chemistry AQI & Inversion Forecasting System for Delhi-NCR

> **Prototype Status:** Fully Operational Prototype (100% Free Open-Source Stack)  
> **Target Problem Statement:** SIH 2026 — 72-Hour Coupled Air Quality Prediction, Atmospheric Inversion Tracking & Stubble-Burning Plume Dispersion.

---

## 🌟 Key Capabilities Implemented

1. **Coupled Two-Way Aerosol–Radiation–PBL Dynamics**
   - Calculates radiative solar dimming ($-W/m^2$), surface cooling ($\Delta T$), and Planetary Boundary Layer (PBL) height compression ($\Delta h_{PBL}$).
   - Captures the aerosol trapping amplification effect that traditional decoupled models miss.

2. **Explicit Atmospheric Inversion Tracking & Vertical Soundings**
   - 20-level vertical thermodynamic soundings ($0–3000\,\text{m}$ AGL).
   - Real-time diagnostic of Inversion Base, Inversion Top, Inversion Strength Index ($^\circ\text{C}/100\,\text{m}$), and Ventilation Coefficient ($V_c = \text{PBLH} \times U_{10}$).

3. **Stubble-Burning Plume Dispersion Engine**
   - Real-time monitoring of Punjab/Haryana/UP fire clusters (VIIRS/MODIS FRP).
   - Dynamic Freitas plume-rise injection height solver.
   - Forward Lagrangian transport trajectories with arrival time (ETA in hours) and Delhi PM2.5 influx share.

4. **34+ Delhi-NCR CPCB CAAQMS Monitoring Stations**
   - Real-time downscaling across Anand Vihar, Punjabi Bagh, IGI Airport, RK Puram, Bawana, Mundka, Noida Sec-62, Ghaziabad, Gurugram, Faridabad, Sonipat, etc.
   - 72-hour station-specific timeline forecasts and pollutant breakdown (PM2.5, PM10, NO2, O3, AQI).

5. **CAQM GRAP Decision Support & Emergency Advisories**
   - Automated evaluation of statutory GRAP Stages (I to IV).
   - Prescribed municipal actions (construction bans, BS-III/IV restrictions, DG set bans, WFH).
   - One-click export of Official GRAP Emergency Advisories.

6. **Interactive "What-If" Policy & Weather Sandbox**
   - Live sliders for Stubble Fire Bans, Vehicular Cuts, Industrial Curfews, and Wind Speed/Direction shifts.
   - Real-time recalculation of resulting 72-hour AQI curves, avoided peak PM2.5 ($\mu\text{g/m}^3$), and GRAP stage downshifts.

---

## 🚀 How to Run the Prototype

### 1. Backend (FastAPI + Coupled Physics Engine)
```bash
cd backend
python run.py
```
- **Backend API URL:** [http://localhost:8000](http://localhost:8000)
- **Interactive Swagger Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)

### 2. Frontend (React + Vite + Leaflet + Tailwind CSS)
```bash
cd frontend
npx vite --host 127.0.0.1 --port 5173
```
- **Web Dashboard URL:** [http://localhost:5173](http://localhost:5173)

---

## 📡 Key REST API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/forecast/72h` | `GET` | 72-hour hourly coupled forecast with weather, pollutants & AQI |
| `/api/forecast/summary` | `GET` | High-level summary KPIs (current AQI, peak projected, avg PM2.5) |
| `/api/forecast/feedback` | `GET` | Two-way aerosol-radiation feedback diagnostics |
| `/api/stations` | `GET` | 34+ CPCB monitoring stations with downscaled readings |
| `/api/inversion/sounding?hour={0..71}` | `GET` | Vertical atmospheric sounding profile ($0-3000\,\text{m}$) |
| `/api/plume/fires` | `GET` | Active stubble burning clusters with Fire Radiative Power (FRP) |
| `/api/plume/trajectories` | `GET` | Forward Lagrangian smoke plume trajectories & arrival ETAs |
| `/api/grap/status` | `GET` | CAQM GRAP Stage I–IV status & mandatory directives |
| `/api/simulation/run` | `POST` | Real-time "What-If" policy intervention solver |

---

## 🛠️ Technology Stack (100% Free & Open-Source)

- **Backend:** Python 3.11+, FastAPI, Uvicorn, Pydantic, NumPy, SciPy, HTTPX.
- **Frontend:** React 19, Vite, TypeScript, Tailwind CSS v4, Lucide Icons, Leaflet GIS, Recharts.
- **Data Ingestion:** Open-Meteo Free Global Forecast & Air Quality APIs + NASA FIRMS Open Stubble Data + CPCB CAAQMS Stations.
- **Hosting / Deployment Ready:** Runs entirely on local machine or standard cloud VM.
