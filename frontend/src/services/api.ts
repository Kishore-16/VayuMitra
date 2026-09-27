import type {
  HourlyForecastPoint,
  CPCBStation,
  InversionSounding,
  StubbleFire,
  PlumeTrajectory,
  AerosolFeedbackDiagnostic,
  GRAPStatusResponse,
  ForecastSummary,
  SimulationParams,
  SimulationResult
} from "../types";

const API_BASE = "http://localhost:8000/api";

export async function fetchForecast72h(): Promise<HourlyForecastPoint[]> {
  const res = await fetch(`${API_BASE}/forecast/72h`);
  if (!res.ok) throw new Error("Failed to fetch 72h forecast");
  return res.json();
}

export async function fetchForecastSummary(): Promise<ForecastSummary> {
  const res = await fetch(`${API_BASE}/forecast/summary`);
  if (!res.ok) throw new Error("Failed to fetch forecast summary");
  return res.json();
}

export async function fetchFeedbackDiagnostics(): Promise<AerosolFeedbackDiagnostic[]> {
  const res = await fetch(`${API_BASE}/forecast/feedback`);
  if (!res.ok) throw new Error("Failed to fetch feedback diagnostics");
  return res.json();
}

export async function fetchStations(): Promise<CPCBStation[]> {
  const res = await fetch(`${API_BASE}/stations`);
  if (!res.ok) throw new Error("Failed to fetch stations");
  return res.json();
}

export async function fetchStationById(id: string): Promise<CPCBStation> {
  const res = await fetch(`${API_BASE}/stations/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch station ${id}`);
  return res.json();
}

export async function fetchInversionSounding(hour: number = 0): Promise<InversionSounding> {
  const res = await fetch(`${API_BASE}/inversion/sounding?hour=${hour}`);
  if (!res.ok) throw new Error(`Failed to fetch inversion sounding for hour ${hour}`);
  return res.json();
}

export async function fetchInversionTimeline(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/inversion/timeline`);
  if (!res.ok) throw new Error("Failed to fetch inversion timeline");
  return res.json();
}

export async function fetchActiveFires(): Promise<StubbleFire[]> {
  const res = await fetch(`${API_BASE}/plume/fires`);
  if (!res.ok) throw new Error("Failed to fetch stubble fires");
  return res.json();
}

export async function fetchPlumeTrajectories(): Promise<PlumeTrajectory[]> {
  const res = await fetch(`${API_BASE}/plume/trajectories`);
  if (!res.ok) throw new Error("Failed to fetch plume trajectories");
  return res.json();
}

export async function fetchGRAPStatus(): Promise<GRAPStatusResponse> {
  const res = await fetch(`${API_BASE}/grap/status`);
  if (!res.ok) throw new Error("Failed to fetch GRAP status");
  return res.json();
}

export async function runSimulation(params: SimulationParams): Promise<SimulationResult> {
  const res = await fetch(`${API_BASE}/simulation/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params)
  });
  if (!res.ok) throw new Error("Failed to run policy simulation");
  return res.json();
}
