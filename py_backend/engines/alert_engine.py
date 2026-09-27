from abc import ABC, abstractmethod
from typing import List
from datetime import datetime
from models.schemas import ForecastPoint, PlumeForecast, AlertRecord

class NotificationChannel(ABC):
    @abstractmethod
    def send(self, alert: AlertRecord) -> bool:
        pass

class WebhookNotificationStub(NotificationChannel):
    def send(self, alert: AlertRecord) -> bool:
        print(f"[NOTIFICATION STUB] Alert {alert.id} dispatched: {alert.title} -> {alert.message}")
        return True

class AlertEngine:
    def __init__(self):
        self.channels: List[NotificationChannel] = [WebhookNotificationStub()]

    def process_forecast(self, series: List[ForecastPoint], plume: PlumeForecast) -> List[AlertRecord]:
        alerts: List[AlertRecord] = []
        peak = max(series, key=lambda s: s.aqi)

        if peak.aqi >= 400:
            stage = "Stage IV (Emergency)" if peak.aqi > 450 else "Stage III (Severe)"
            alert = AlertRecord(
                id=f"ALT-GRAP-{peak.step}",
                forecast_id=peak.step,
                zone_id=peak.zone_id,
                triggered_ts=datetime.utcnow(),
                threshold_crossed=400,
                grap_stage=stage,
                title=f"GRAP {stage} Threshold Crossing",
                message=f"Forecasted AQI reaches {peak.aqi} ({peak.aqi_category}) at +{peak.hour_offset}h. Construction bans & emergency traffic restrictions advised."
            )
            alerts.append(alert)

        if plume.alert_level == "CRITICAL":
            alert = AlertRecord(
                id=f"ALT-PLUME-{int(plume.eta_hours)}",
                zone_id="DELHI_NCR",
                triggered_ts=datetime.utcnow(),
                threshold_crossed=300,
                grap_stage="Stage II (Very Poor)",
                title="Stubble Burning Plume Ingress",
                message=f"Active fires in Punjab producing +{plume.estimated_pm25_contribution:.0f} µg/m³ PM2.5 plume flux. ETA: {plume.eta_hours} hours."
            )
            alerts.append(alert)

        if peak.isi >= 0.75:
            alert = AlertRecord(
                id=f"ALT-INV-{peak.step}",
                zone_id=peak.zone_id,
                triggered_ts=datetime.utcnow(),
                threshold_crossed=350,
                grap_stage=peak.grap_stage,
                title="Severe Temperature Inversion Layer",
                message=f"Vertical lapse rate inversion active. Boundary layer height collapsed to {int(peak.pbl_height_m)}m."
            )
            alerts.append(alert)

        # Dispatch alerts through notification channels
        for a in alerts:
            for ch in self.channels:
                ch.send(a)

        return alerts
