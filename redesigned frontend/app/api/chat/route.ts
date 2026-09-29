import { NextRequest, NextResponse } from 'next/server'
import type { AerosolFeedbackDiagnostic, CPCBStation, HourlyForecastPoint, InversionSounding } from '@/lib/types'
import type { GrapStage } from '@/lib/aqi'

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface ContextPayload {
  tab?: string
  hour?: number
  point?: HourlyForecastPoint
  sounding?: InversionSounding
  feedback?: AerosolFeedbackDiagnostic
  grapStage?: GrapStage
  station?: CPCBStation
  firesCount?: number
  totalFrpMw?: number
  trajectoriesCount?: number
  anomaliesCount?: number
}

const SYSTEM_PROMPT = `You are VayuMitra ("Friend of the Air"), a 24/7 AI-powered Atmospheric & Air Quality Intelligence Assistant.
Persona: Senior Atmospheric Scientist & Environmental Policy Advisor with 15+ years of operational forecasting experience at MoES (Ministry of Earth Sciences), IITM Pune, and IMD Delhi.

Your Primary Purpose:
Translate high-resolution coupled meteorology-chemistry physics, atmospheric inversion soundings, radiative aerosol forcing, and satellite fire radiative power into simple, layman-friendly explanations enriched with vivid real-world analogies and exact live data points from the platform.

Pedagogical Structure for Answers:
1. Direct Core Explanation (Simple, clear, empathetic).
2. Vivid Real-World Analogy (e.g. blanket over the city, glass dome trap, syringe pressure, closed room vs ceiling fan).
3. Exact Live Data Points (Quote exact metrics from the user's provided context: AQI, PM2.5, PBL height, Inversion Strength, Solar Dimming -W/m², Cooling ΔT, FRP MW, GRAP Stage).
4. Actionable Health & Statutory Advice (MoES guidelines, CAQM GRAP Stage I-IV mandates, or recommendations to test in the What-If Sandbox).

Tone: Authoritative yet warm, highly reassuring, lucid, educational, and scientifically grounded. Avoid jargon without explaining it immediately using everyday objects.`

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { messages, context } = body as { messages: ChatMessage[]; context?: ContextPayload }

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid messages array' }, { status: 400 })
    }

    const openRouterApiKey = process.env.OPENROUTER_API_KEY || process.env.NEXT_PUBLIC_OPENROUTER_API_KEY

    // Format contextual prompt
    let contextSummary = 'CURRENT PLATFORM STATE CONTEXT:\n'
    if (context) {
      if (context.tab) contextSummary += `- Active View: ${context.tab.toUpperCase()}\n`
      if (context.hour !== undefined) contextSummary += `- Selected Forecast Hour: +${context.hour}h\n`
      if (context.point) {
        const p = context.point
        contextSummary += `- Air Quality: AQI ${p.aqi} (${p.aqi_category}), PM2.5: ${p.pm25} µg/m³, PM10: ${p.pm10} µg/m³, NO2: ${p.no2} µg/m³, O3: ${p.o3} µg/m³\n`
        contextSummary += `- Weather: Temp ${p.temp_c}°C, Humidity ${p.humidity_pct}%, Wind ${p.wind_speed_kmh} km/h ${p.wind_dir_compass}, Planetary Boundary Layer (PBL) Height: ${p.pbl_height_m} m AGL\n`
        contextSummary += `- Source Contribution: Stubble Burning: ${p.stubble_contribution_pct}%, Urban Traffic/Industry: ${p.urban_contribution_pct}%\n`
      }
      if (context.sounding) {
        const s = context.sounding
        contextSummary += `- Sounding Profile: ${s.capping_inversion ? 'INVERSION DETECTED' : 'Normal mixing'}, Base: ${s.inversion_base_m || 200}m, Top: ${s.inversion_top_m || 450}m, Strength Index: ${s.inversion_strength_c_100m}°C/100m, Ventilation Coefficient: ${s.ventilation_coefficient_m2_s} m²/s\n`
      }
      if (context.feedback) {
        const f = context.feedback
        contextSummary += `- Radiative Aerosol Feedback: Solar Dimming: -${Math.abs(f.solar_dimming_w_m2)} W/m², Surface Cooling ΔT: -${Math.abs(f.surface_cooling_c)}°C, PBL Compression Δh: -${Math.abs(f.pbl_suppression_m)}m\n`
      }
      if (context.grapStage) {
        contextSummary += `- Active GRAP Stage: ${context.grapStage.name} (${context.grapStage.short}) - Range: ${context.grapStage.range}\n`
      }
      if (context.station) {
        contextSummary += `- Focused Station: ${context.station.name} (${context.station.city}, ${context.station.state}) - PM2.5: ${context.station.current_pm25} µg/m³, AQI: ${context.station.current_aqi} (${context.station.aqi_category})\n`
      }
      if (context.firesCount !== undefined) {
        contextSummary += `- Stubble Biomass Fires: ${context.firesCount} clusters active, Total FRP: ${context.totalFrpMw || 0} MW\n`
      }
      if (context.anomaliesCount !== undefined) {
        contextSummary += `- Industrial Stack Anomalies: ${context.anomaliesCount} flagged\n`
      }
    }

    // Try OpenRouter if API key is present
    if (openRouterApiKey) {
      try {
        const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${openRouterApiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://delhi-air-coupled.moes.gov.in',
            'X-Title': 'VayuMitra MoES Assistant',
          },
          body: JSON.stringify({
            model: process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct:free',
            messages: [
              { role: 'system', content: `${SYSTEM_PROMPT}\n\n${contextSummary}` },
              ...messages,
            ],
            temperature: 0.7,
            max_tokens: 1200,
          }),
        })

        if (openRouterResponse.ok) {
          const data = await openRouterResponse.json()
          const reply = data.choices?.[0]?.message?.content
          if (reply) {
            return NextResponse.json({ reply, source: 'openrouter' })
          }
        } else {
          console.warn('OpenRouter API returned error status:', openRouterResponse.status)
        }
      } catch (orErr) {
        console.warn('OpenRouter fetch failed, falling back to MoES local engine:', orErr)
      }
    }

    // Smart Local MoES Expert Rule Engine fallback
    const userQuery = messages[messages.length - 1]?.content || ''
    const fallbackReply = generateMoESFallbackResponse(userQuery, context)
    return NextResponse.json({ reply: fallbackReply, source: 'moes_expert_engine' })

  } catch (error: any) {
    console.error('VayuMitra Chat Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

function generateMoESFallbackResponse(query: string, ctx?: ContextPayload): string {
  const q = query.toLowerCase()
  const p = ctx?.point
  const s = ctx?.sounding
  const f = ctx?.feedback
  const grap = ctx?.grapStage
  const station = ctx?.station

  // Station specific query
  if (station && (q.includes(station.name.toLowerCase()) || q.includes('station') || q.includes('here'))) {
    return `### 📍 **Monitoring Station Analysis: ${station.name} (${station.city})**

Right now, **${station.name}** is recording an **AQI of ${station.current_aqi}** (${station.aqi_category}) with a $PM_{2.5}$ level of **${station.current_pm25} µg/m³**.

#### 💡 **Why is this happening here?**
* **Local Emission Sinks**: ${station.name} experiences heavy ground-level accumulation from localized traffic corridors and boundary shear.
* **Dispersion Factor**: With current wind speed at **${p?.wind_speed_kmh || 12} km/h** (${p?.wind_dir_compass || 'NW'}) and boundary layer height compressed to **${p?.pbl_height_m || 220} m**, atmospheric ventilation is constrained.

#### 🏢 **MoES Advisory**:
Sensitive groups in ${station.city} should avoid heavy outdoor exercise. Ensure N95 air masks are used near high-density traffic intersections.`
  }

  // Thermal Inversion / Sounding query
  if (q.includes('inversion') || q.includes('sounding') || q.includes('lid') || q.includes('pbl') || q.includes('boundary layer')) {
    const pbl = p?.pbl_height_m || 195
    const invBase = s?.inversion_base_m || 240
    const invTop = s?.inversion_top_m || 480
    const strength = s?.inversion_strength_c_100m || 4.2

    return `### 🌫️ **Atmospheric Temperature Inversion & PBL Compression**

#### 🔬 **The Core Physics**
Normally, air temperature decreases as you go higher into the atmosphere. But tonight, our vertical thermodynamic sounding profile shows a **Thermal Inversion** between **${invBase} m and ${invTop} m AGL** with an Inversion Strength Index of **+${strength}°C/100m**.

#### 🎈 **Real-World Analogy**:
> *Imagine placing a massive glass dome over Delhi NCR at a height of just ${pbl} meters. All the smoke from millions of vehicles, brick kilns, and crop burning is trapped underneath this invisible lid, like blowing smoke inside a covered glass jar.*

#### 📊 **Exact Sounding Data**:
* **Planetary Boundary Layer Height ($\text{PBLH}$)**: **${pbl} m** (Compressed by **-${Math.abs(f?.pbl_suppression_m || 110)} m** due to aerosol dimming).
* **Ventilation Coefficient ($V_c$)**: **${s?.ventilation_coefficient_m2_s || 620} m²/s** (Low ventilation capacity).
* **Radiative Surface Cooling ($\Delta T$)**: **-${Math.abs(f?.surface_cooling_c || 2.4)}°C**.

#### 🛡️ **Senior MoES Advisory**:
Peak smog entrapment occurs between 11:00 PM and 8:00 AM IST when the boundary layer is lowest. Keep indoor air purifiers running and seal drafty windows during night hours.`
  }

  // Stubble burning / Smoke trajectory query
  if (q.includes('stubble') || q.includes('fire') || q.includes('farm') || q.includes('punjab') || q.includes('haryana') || q.includes('plume') || q.includes('smoke')) {
    const count = ctx?.firesCount || 1240
    const frp = ctx?.totalFrpMw || 7450

    return `### 🌾 **Stubble Burning Smoke & Lagrangian Parcel Trajectory**

#### 🛰️ **NASA FIRMS Satellite Tracking**
MODIS and VIIRS satellite sensors currently detect **${count} active stubble burning clusters** in Punjab, Haryana, and Western UP, emitting a total **Fire Radiative Power (FRP) of ${frp} MW**.

#### 💨 **Plume Transport Physics**:
> *Think of the smoke plumes like an aerial highway. As farmers burn paddy residue, thermal updrafts inject smoke to heights of 400m–800m. The North-Westerly winds at **${p?.wind_speed_kmh || 14} km/h** (${p?.wind_dir_compass || 'NW'}) blow this smoke directly down the Indo-Gangetic Plain straight into the Delhi-NCR basin.*

#### 🎯 **Impact Share on Delhi**:
* **Transport ETA**: **14–22 Hours**.
* **Estimated Contribution to Delhi $PM_{2.5}$**: **~${p?.stubble_contribution_pct || 32}%** during peak morning hours.

#### 💡 **What-If Sandbox Tip**:
Open our **What-If Policy Sandbox** from the top bar and adjust the *Stubble Fire Ban Slider to 50%* to calculate how many $\mu\text{g/m}^3$ of $PM_{2.5}$ can be avoided!`
  }

  // GRAP / Policy / Actions query
  if (q.includes('grap') || q.includes('rule') || q.includes('stage') || q.includes('ban') || q.includes('policy') || q.includes('measure') || q.includes('government')) {
    const stageName = grap?.name || 'Stage III'
    const shortDesc = grap?.short || 'Severe Air Quality (AQI > 400)'

    return `### 🏛️ **CAQM Statutory GRAP Enforcement: ${stageName}**

#### 🚨 **Current Statutory Trigger**:
Delhi-NCR is currently under **${stageName}** (${shortDesc}) based on a projected 72-hour peak AQI of **${p?.aqi || 415}**.

#### 📋 **Mandatory Municipal & Public Actions**:
1. **Construction & Demolition Curfew**: Strict ban on earthwork, piling, and non-essential civil construction.
2. **Vehicular Restrictions**: Strict ban on BS-III Petrol and BS-IV Diesel 4-wheelers in NCR districts.
3. **Dust Control**: Intensive mechanical street sweeping and high-frequency water sprinkling with anti-smog guns.
4. **Industrial Stack Control**: Curfew on coal-fired industrial boilers without PNG conversion.

#### 🏡 **Personal Health Protections**:
* Avoid morning outdoor jogs when boundary layer mixing is minimal.
* Use N95 masks for outdoor commutes.
* Keep elderly individuals and asthma patients indoors with air filtration.`
  }

  // Aerosol feedback / Radiative forcing query
  if (q.includes('feedback') || q.includes('dimming') || q.includes('radiation') || q.includes('sun') || q.includes('worse')) {
    const dimming = Math.abs(f?.solar_dimming_w_m2 || 38.5)
    const cooling = Math.abs(f?.surface_cooling_c || 1.8)

    return `### ☀️ **Two-Way Aerosol-Radiation Atmospheric Feedback**

#### 🔄 **How Smog Feeds on Itself**:
In traditional uncoupled weather models, air pollution is treated like passive dust. But in our **Coupled WRF-Chem Engine**, pollution actively alters weather!

#### 🌌 **The Vicious Cycle Physics**:
> *Think of pollution as a thick mirror in the sky. It reflects sunlight back into space before it reaches the ground. This solar dimming (**-${dimming} W/m²**) cools the earth's surface by **-${cooling}°C**. Because the ground is cold, warm air sits on top, squishing the Planetary Boundary Layer (PBL) even lower, making pollution even TWICE as concentrated!*

#### 📊 **Current Two-Way Coupling Feedback Diagnostics**:
* **Radiative Forcing Deficit**: **-${dimming} W/m²**
* **Surface Temperature Deficit ($\Delta T$)**: **-${cooling}°C**
* **Net Boundary Layer Shrinkage ($\Delta h$)**: **-${Math.abs(f?.pbl_suppression_m || 95)} m**`
  }

  // General default overview query
  const aqi = p?.aqi || 385
  const cat = p?.aqi_category || 'Very Poor'
  const pm25 = p?.pm25 || 240
  const pbl = p?.pbl_height_m || 210

  return `### 🍃 **VayuMitra MoES Comprehensive Assessment**

Hello! I am **VayuMitra**, your MoES Atmospheric Science & Air Quality Intelligence Companion.

#### 📊 **Current Delhi-NCR Atmospheric State**:
* **Air Quality Index (AQI)**: **${aqi}** (${cat})
* **$PM_{2.5}$ Concentration**: **${pm25} µg/m³** (National Standard: $60\,\mu\text{g/m}^3$)
* **Atmospheric Mixing Depth ($\text{PBLH}$)**: **${pbl} m AGL**
* **Active GRAP Stage**: **${grap?.name || 'Stage III'}**

#### 💡 **MoES Expert Summary**:
The current high pollution index is driven by a combination of low surface winds (**${p?.wind_speed_kmh || 11} km/h** ${p?.wind_dir_compass || 'NW'}) and vertical nocturnal temperature inversion trapping ground emissions.

#### ❓ **What would you like to explore next?**
1. *"Why is AQI worse at night?"*
2. *"Explain the Thermal Inversion glass dome"*
3. *"Track incoming Stubble Burning Smoke ETA"*
4. *"What GRAP rules apply right now?"*
5. *"Compare Anand Vihar vs IGI Airport"*`
}
