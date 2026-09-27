import random
from datetime import datetime, timedelta

def get_industrial_anomalies():
    """
    Simulates Context-Aware Anomaly Detection.
    Compares 'Real-Time Sensor Data' with a 'Dynamic Baseline' (calculated from past data for that specific time/weather).
    If Actual - Baseline > Threshold, it triggers an anomaly alert.
    """
    now = datetime.now()
    
    # Pre-defined major industrial clusters in Delhi-NCR
    industrial_zones = [
        {"id": "IND-001", "name": "Bawana Industrial Area", "lat": 28.7915, "lon": 77.0673},
        {"id": "IND-002", "name": "Okhla Industrial Estate", "lat": 28.5273, "lon": 77.2798},
        {"id": "IND-003", "name": "Narela Industrial Area", "lat": 28.8427, "lon": 77.0913},
        {"id": "IND-004", "name": "Patparganj Industrial Area", "lat": 28.6360, "lon": 77.3155},
        {"id": "IND-005", "name": "Faridabad Sector 24/25", "lat": 28.3732, "lon": 77.3153},
    ]

    anomalies = []

    for zone in industrial_zones:
        # Simulate a dynamic baseline based on the current hour (e.g., lower at night, higher during day traffic)
        hour = now.hour
        base_expected_pm25 = 80 if (hour < 6 or hour > 22) else 150 
        
        # Add some random weather/seasonal adjustment to the baseline
        dynamic_baseline = base_expected_pm25 + random.randint(-10, 20)

        # Simulate real-time sensor reading
        # We artificially force a spike in 1 or 2 zones to show the anomaly detection working
        is_anomalous = random.random() < 0.3 # 30% chance for a zone to spike for the demo
        
        if is_anomalous:
            # Significant spike
            actual_pm25 = dynamic_baseline + random.randint(80, 250)
        else:
            # Normal fluctuation
            actual_pm25 = dynamic_baseline + random.randint(-15, 15)

        spike_value = actual_pm25 - dynamic_baseline
        threshold = 50 # If actual is 50+ points higher than baseline, it's an anomaly

        if spike_value > threshold:
            severity = "CRITICAL" if spike_value > 150 else ("HIGH" if spike_value > 100 else "MEDIUM")
            anomalies.append({
                "id": f"ALERT-{zone['id']}-{int(now.timestamp())}",
                "zone_name": zone["name"],
                "lat": zone["lat"],
                "lon": zone["lon"],
                "timestamp": now.isoformat(),
                "actual_pm25": actual_pm25,
                "dynamic_baseline": dynamic_baseline,
                "spike_value": spike_value,
                "severity": severity,
                "message": f"Unexplained PM2.5 spike (+{spike_value} µg/m³) detected. Possible unauthorized emissions.",
                "status": "ACTIVE"
            })

    return {
        "timestamp": now.isoformat(),
        "total_anomalies": len(anomalies),
        "anomalies": sorted(anomalies, key=lambda x: x["spike_value"], reverse=True)
    }
