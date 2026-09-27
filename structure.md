# Delhi-NCR High-Resolution Coupled AQI Forecasting System
**Project Codename:** DELHI-AIR-COUPLED  
**Version:** 1.0  
**Document Type:** Complete Project Specification for Development  
**Last Updated:** September 2026

---

## 1. Project Overview

### 1.1 Title
Development of a High-Resolution, Fully Coupled Meteorology–Chemistry Forecasting System for 72-hour Air Quality Index (AQI) Prediction over Delhi NCR, with Explicit Atmospheric Inversion Tracking and Stubble-Burning Plume Dispersion.

### 1.2 Problem Statement Summary
Traditional AQI models treat meteorology and pollution dispersion separately. In Delhi NCR, strong two-way feedback exists: atmospheric inversions trap pollutants (especially stubble-burning PM2.5), while high aerosol loadings modify local temperature, wind, and Planetary Boundary Layer (PBL) height. This system addresses the gap by implementing a fully coupled WRF-Chem based workflow that dynamically links weather and chemistry, delivers high-resolution 72-hour forecasts, and provides actionable diagnostics via a real-time dashboard.

### 1.3 Primary Objectives
- Deliver accurate 72-hour forecasts of PM2.5, PM10, O₃, NOₓ and Indian AQI at high spatial resolution over Delhi NCR.
- Explicitly model and diagnose atmospheric inversion strength and its impact on pollution trapping.
- Predict dispersion and arrival of regional stubble-burning plumes under evolving meteorological conditions.
- Capture two-way aerosol–radiation–PBL feedback.
- Provide a user-friendly real-time dashboard for decision support (GRAP, public advisories).

### 1.4 Success Criteria
| Metric                              | Target                                      |
|-------------------------------------|---------------------------------------------|
| PM2.5 RMSE (peak episodes)          | ≤ 25–30% improvement over current AQEWS    |
| AQI categorical accuracy (Very Poor+) | ≥ 85%                                      |
| Inversion strength detection        | Correct identification of major events     |
| Plume arrival timing error          | ≤ 6 hours                                  |
| Operational latency                 | Full 72-h cycle completed within 4–5 hours |
| Dashboard uptime                    | ≥ 99%                                      |

---

## 2. System Architecture

### 2.1 High-Level Block Diagram



╔════════════════════════════════════════════════════════════════════╗
║                    REAL-TIME DATA INGESTION                       ║
╚════════════════════════════════════════════════════════════════════╝
                     │
       ┌─────────────┼──────────────┬───────────────┬────────────────┐
       ▼             ▼              ▼               ▼                ▼
   WEATHER        POLLUTION       SATELLITE        FIRE            CHEMICAL
   OBSERVATIONS   OBSERVATIONS    OBSERVATIONS     DATA            BOUNDARY
       │             │              │               │              CONDITIONS
       │             │              │          Stubble burning      │
       │             │         (MODIS/VIIRS AOD)    │              │
       └─────────────┴──────────────┴───────────────┴────────────────┘
                     │
                     ▼
╔════════════════════════════════════════════════════════════════════╗
║         DATA QUALITY CONTROL + MULTI-SOURCE ASSIMILATION          ║
║                                                                    ║
║  • Meteorological Assimilation (WRFDA / GSI)                       ║
║  • Chemical / Aerosol Assimilation (AOD + surface PM)              ║
║  • Fire emission scaling & QC                                      ║
╚════════════════════════════════════════════════════════════════════╝
                     │
                     ▼
╔════════════════════════════════════════════════════════════════════╗
║                    CURRENT ATMOSPHERIC STATE                      ║
║ Temperature | Wind | Humidity | Pressure | PBL | Aerosol Loading  ║
╚════════════════════════════════════════════════════════════════════╝
                     │
          ┌──────────┴───────────┐
          ▼                      ▼
╔══════════════════╗   ╔══════════════════════════╗
║ DYNAMIC EMISSION ║   ║ ATMOSPHERIC INVERSION   ║
║ ESTIMATION       ║   ║ ANALYSIS                 ║
║                  ║   ║                          ║
║ • Anthropogenic  ║   ║ • Temperature profile    ║
║ • Fires + FRP    ║   ║ • Stability indices      ║
║ • Plume-rise     ║   ║ • PBL height             ║
║   parameterisation║  ║ • Inversion strength     ║
║ • Crop info      ║   ║                          ║
╚══════════════════╝   ╚══════════════════════════╝
          │                      │
          └──────────┬───────────┘
                     ▼
╔════════════════════════════════════════════════════════════════════╗
║              HIGH-RESOLUTION DOMAIN CONFIGURATION                  ║
║                                                                    ║
║  Nested Domains: Outer (IGP ~9-15 km) → Intermediate →             ║
║  Inner Delhi-NCR (≤ 1–2 km or finer)                               ║
║  + Urban Canopy Model + High vertical resolution in lowest 2–3 km  ║
╚════════════════════════════════════════════════════════════════════╝
                     │
                     ▼
╔════════════════════════════════════════════════════════════════════╗
║                         WRF-Chem                                  ║
║                                                                    ║
║                FULLY COUPLED TWO-WAY SYSTEM                        ║
║                                                                    ║
║  METEOROLOGY                       CHEMISTRY / AEROSOLS            ║
║  ────────────                      ──────────────────              ║
║  Temperature                       PM2.5 / PM10                    ║
║  Wind                              O₃ , NOₓ                        ║
║  PBL height                        Secondary Inorganic Aerosols    ║
║  Humidity                          Secondary Organic Aerosols      ║
║  Radiation (SW/LW)                 Optical Properties (updated)    ║
║  Pressure                          Vertical plume-rise             ║
║                                                                    ║
║        WEATHER  ←────── AEROSOL-RADIATION FEEDBACK ──────→ CHEMISTRY║
║        (Temp, PBL, Wind modified by aerosol loading)               ║
╚════════════════════════════════════════════════════════════════════╝
                     │
          ┌──────────┼───────────────────────────┐
          ▼          ▼                           ▼
╔══════════════╗ ╔══════════╗ ╔══════════════════════════════╗
║ WEATHER      ║ ║ POLLUTION║ ║ AEROSOL-RADIATION &          ║
║ FORECAST     ║ ║ FORECAST ║ ║ INVERSION DIAGNOSTICS        ║
║              ║ ║          ║ ║                              ║
║ Temp         ║ ║ PM2.5    ║ ║ • Radiative forcing          ║
║ Wind         ║ ║ PM10     ║ ║ • PBL modification by aerosols║
║ PBL          ║ ║ O₃       ║ ║ • Inversion strength evolution║
║ Humidity     ║ ║ NOₓ      ║ ║                              ║
╚══════════════╝ ╚══════════╝ ╚══════════════════════════════╝
          │          │                 │
          │          │                 │
          │          ▼                 │
          │   ╔══════════════════╗     │
          │   ║ STUBBLE-BURNING  ║     │
          │   ║ PLUME ENGINE     ║     │
          │   ║                  ║     │
          │   ║ Source + Plume-rise║    │
          │   ║ Trajectory       ║     │
          │   ║ Dispersion       ║     │
          │   ║ Arrival time     ║     │
          │   ║ Delhi-NCR Impact ║     │
          │   ╚══════════════════╝     │
          │          │                 │
          └──────────┼─────────────────┘
                     ▼
╔════════════════════════════════════════════════════════════════════╗
║                     72-HOUR DELHI-NCR FORECAST                    ║
║                                                                    ║
║ Weather + Pollution + Inversion Strength + Aerosol-Radiation      ║
║ Feedback + Stubble-Plume Impact                                   ║
╚════════════════════════════════════════════════════════════════════╝
                     │
                     ▼
╔════════════════════════════════════════════════════════════════════╗
║                       ML / ERROR CORRECTION                       ║
║                                                                    ║
║ Forecast ↔ CPCB / Satellite Observations                          ║
║ Learn systematic biases (including feedback-related errors)        ║
║ Correct 72-h forecast                                             ║
╚════════════════════════════════════════════════════════════════════╝
                     │
                     ▼
╔════════════════════════════════════════════════════════════════════╗
║                         FINAL OUTPUT                              ║
║                                                                    ║
║  • 72-h Weather Forecast                                          ║
║  • 72-h PM2.5 / PM10 / O₃ / AQI Forecast                          ║
║  • Inversion Strength & Evolution                                 ║
║  • Aerosol-Radiation Feedback Diagnostics                         ║
║  • Stubble-Plume Trajectory & Impact                              ║
║  • Expected Delhi-NCR Air Quality Impact                          ║
╚════════════════════════════════════════════════════════════════════╝
                     │
                     ▼
╔════════════════════════════════════════════════════════════════════╗
║                    REAL-TIME DASHBOARD                            ║
║                                                                    ║
║ High-res Maps | 72-h Timeline | Plume Trajectories |              ║
║ Inversion Strength | Aerosol-Radiation Feedback | AQI | Weather   ║
╚════════════════════════════════════════════════════════════════════╝
                     │
                     └───────────────↺
                         NEW OBSERVATIONS



---

## 3. Technology Stack

### 3.1 Core Modelling
- **WRF-Chem** v4.5+ (Fortran, MPI + OpenMP)
- **WRFDA / GSI** for data assimilation
- Compiler: Intel oneAPI or GNU

### 3.2 Data & Processing
- **Python** 3.11+ (xarray, pandas, numpy, scipy, MetPy, wrf-python, salem)
- **PREP-CHEM-SRC** + custom FRP scaling scripts
- Storage: MinIO (object), TimescaleDB + PostGIS (time-series & spatial)

### 3.3 Machine Learning
- PyTorch or scikit-learn + XGBoost/LightGBM
- FastAPI + ONNX for serving

### 3.4 Orchestration
- Apache Airflow or Prefect
- Slurm (HPC job scheduler)
- Docker + Singularity

### 3.5 Dashboard & API
- Backend: FastAPI
- Frontend: React + TypeScript
- Maps: Leaflet / Mapbox GL JS
- Charts: Plotly.js
- Alternative rapid prototype: Streamlit / Dash

### 3.6 Infrastructure
- HPC cluster (preferred) or Cloud (AWS ParallelCluster / Azure CycleCloud)
- Monitoring: Prometheus + Grafana
- Version Control: Git + DVC

---

## 4. Detailed Component Specifications

### 4.1 Domain Configuration
- **D01 (Outer)**: ~9–15 km covering major stubble source regions (Punjab, Haryana, Western UP)
- **D02 (Intermediate)**: ~3 km
- **D03 (Inner)**: ≤ 1–2 km focused on Delhi NCR
- Vertical levels: ≥ 45–50, with high resolution in lowest 2–3 km
- Urban Canopy Model (UCM) or BEP/BEM activated over Delhi

### 4.2 Physics & Chemistry Options (Recommended Starting Point)
- PBL Scheme: YSU or MYJ (sensitivity testing required)
- Microphysics: Lin or Morrison
- Radiation: RRTMG
- Chemistry: MOZART-MOSAIC (or latest optimised mechanism)
- Aerosol-Radiation Feedback: Fully enabled
- Plume-rise: Freitas or equivalent for fire emissions

### 4.3 Emission Handling
- Baseline anthropogenic: Latest available high-resolution inventory (update every 2–3 years)
- Fire emissions: Real-time VIIRS/MODIS FRP → FINN or custom scaling
- Vertical distribution: Online plume-rise parameterisation
- Biogenic & dust: MEGAN + GOCART or equivalent

### 4.4 Assimilation Strategy
- Meteorological: WRFDA (3DVar/4DVar) or GSI
- Chemical: AOD assimilation (MODIS/VIIRS) + surface PM2.5/PM10
- Cycling: Daily or 6-hourly

### 4.5 Post-processing Products
1. Gridded 72-h forecasts (hourly): PM2.5, PM10, O₃, NO₂, AQI, T2, WS10, PBLH
2. Inversion strength index (custom diagnostic)
3. Aerosol radiative forcing and PBL modification fields
4. Stubble plume trajectories and concentration footprints
5. Point forecasts for major CPCB stations and key locations

### 4.6 ML Bias Correction
- Input features: Raw model output + meteorological predictors + time-of-day/season
- Target: Residual (Observation – Model)
- Separate models for PM2.5, O₃, and AQI categories
- Retraining frequency: Weekly or after major emission changes

---

## 5. Development Roadmap

### Phase 1: Foundation (Weeks 1–6)
- Environment setup (WRF-Chem compilation, domain generation)
- Static data preparation (terrain, land-use, urban morphology)
- Baseline emission inventory integration
- Basic offline WRF-Chem test runs

### Phase 2: Coupled System & Diagnostics (Weeks 7–14)
- Enable full two-way feedback
- Implement inversion analysis module
- Develop dynamic fire emission + plume-rise pipeline
- Aerosol optical property updates
- Initial verification against historical episodes (2022–2025 stubble seasons)

### Phase 3: Assimilation & ML Layer (Weeks 15–20)
- Implement meteorological + chemical assimilation
- Build ML bias-correction pipeline
- Historical reforecast training dataset creation

### Phase 4: Operational Pipeline & Dashboard (Weeks 21–28)
- Airflow/Prefect DAG development
- Real-time data ingestion services
- FastAPI backend + React dashboard
- End-to-end operational cycle testing

### Phase 5: Validation, Optimisation & Handover (Weeks 29–36)
- Comprehensive verification (2023–2026 seasons)
- Sensitivity experiments (PBL scheme, chemistry, resolution)
- Documentation, training, and operational handover
- Performance tuning for runtime

---

## 6. Data Requirements

| Category              | Sources                              | Frequency     | Format      |
|-----------------------|--------------------------------------|---------------|-------------|
| Meteorological IC/BC  | ERA5, IMD GFS, GDAS                  | 6-hourly     | GRIB2/NetCDF|
| Surface Observations  | CPCB CAAQMS                          | Hourly       | JSON/CSV    |
| Satellite AOD         | MODIS, VIIRS                         | Daily        | HDF5/NetCDF |
| Fire Emissions        | FIRMS, VIIRS FRP, FINN               | Near real-time| CSV/GeoJSON |
| Chemical BC           | CAMS / GEOS-CF / previous cycle      | 6-hourly     | NetCDF      |
| Static Data           | MODIS land-use, SRTM, urban morphology| Once        | GeoTIFF/NetCDF|

---

## 7. Dashboard Functional Requirements

- Interactive high-resolution AQI / PM2.5 / O₃ maps (zoomable to neighbourhood scale)
- 72-hour timeline charts for selected locations
- Atmospheric inversion strength spatial maps + vertical profiles
- Animated stubble-plume trajectories with arrival time estimates
- Aerosol-radiation feedback diagnostics (optional advanced layer)
- Station-wise comparison (Forecast vs CPCB)
- Alert thresholds aligned with GRAP stages
- Export capability (PNG, CSV, GeoJSON)
- Mobile-responsive design

---

## 8. Team Structure (Recommended)

| Role                        | Count | Responsibility                              |
|-----------------------------|-------|---------------------------------------------|
| Project Lead / Scientist    | 1     | Scientific direction, verification          |
| Atmospheric Modeller        | 2     | WRF-Chem configuration, physics/chemistry   |
| Data Engineer               | 1–2   | Ingestion, QC, assimilation pipelines       |
| ML Engineer                 | 1     | Bias correction models                      |
| Full-stack Developer        | 1–2   | Dashboard + API                             |
| DevOps / HPC Engineer       | 1     | Orchestration, deployment, monitoring       |
| Domain Expert (Air Quality) | 1     | Emission inventories, interpretation        |

---

## 9. Risks and Mitigations

| Risk                              | Impact | Mitigation                                      |
|-----------------------------------|--------|-------------------------------------------------|
| Outdated emission inventories     | High   | Modular emission update pipeline + annual review|
| High computational cost           | High   | Nested domains + efficient physics options      |
| Poor representation of secondary aerosols | Medium | Chemistry mechanism sensitivity tests         |
| Satellite data gaps (clouds/night)| Medium | Multi-sensor fusion + ML gap-filling            |
| Operational latency               | Medium | Optimised I/O, parallel post-processing         |

---

## 10. Verification & Validation Plan

- Historical case studies: Major stubble-burning episodes (2017, 2022, 2023, 2024, 2025)
- Continuous real-time verification against 39+ CPCB stations
- Metrics: RMSE, MAE, Bias, Correlation, Categorical scores (POD, FAR for AQI classes)
- Process evaluation: PBL height, radiation fluxes, inversion frequency vs available observations (WiFEX, radiosondes)

---

## 11. Deliverables

1. Fully documented and containerised WRF-Chem configuration
2. End-to-end operational pipeline (Airflow DAGs)
3. ML bias-correction models + serving API
4. Production-ready real-time dashboard
5. Scientific verification report
6. User and technical documentation
7. Training material for operational staff

---

## 12. References & Related Systems

- AQEWS / AIRWISE (IITM–IMD–NCAR)
- DM-Chem (NCMRWF)
- WRF-Chem official documentation
- Peer-reviewed studies on aerosol–PBL feedback over Delhi and IGP (2020–2026)

---

**Document Status:** Ready for development kickoff.  
**Next Step:** Detailed technical design review and resource allocation.