import yaml
import os
from adapters.base_adapter import DataSourceAdapter
from adapters.mock_adapter import MockDataAdapter
from adapters.live_adapters import IMDAdapter, CPCBAdapter, VIIRSAdapter, Sentinel5PAdapter

def load_config():
    config_path = os.path.join(os.path.dirname(__file__), "..", "config.yaml")
    if os.path.exists(config_path):
        with open(config_path, "r") as f:
            return yaml.safe_load(f)
    return {
        "data_sources": {
            "weather": "mock",
            "pollution": "mock",
            "fire": "mock",
            "satellite": "mock"
        }
    }

REGISTRY = {
    "weather": {"mock": MockDataAdapter, "imd": IMDAdapter, "era5": IMDAdapter},
    "pollution": {"mock": MockDataAdapter, "cpcb": CPCBAdapter, "safar": CPCBAdapter},
    "fire": {"mock": MockDataAdapter, "viirs": VIIRSAdapter},
    "satellite": {"mock": MockDataAdapter, "sentinel5p": Sentinel5PAdapter}
}

def get_adapter(data_type: str) -> DataSourceAdapter:
    """
    Factory function returning the configured DataSourceAdapter.
    Guarantees strict separation: business modules only interact with the abstract interface.
    """
    cfg = load_config()
    provider = cfg.get("data_sources", {}).get(data_type, "mock")

    adapter_cls = REGISTRY.get(data_type, {}).get(provider, MockDataAdapter)
    return adapter_cls()
