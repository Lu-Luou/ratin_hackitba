import json
import sys
import os
import joblib
import numpy as np
import pandas as pd
import requests
from sentinelhub import SHConfig, SentinelHubSession
from http.server import BaseHTTPRequestHandler

# ── Paths ─────────────────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, '..', '..', 'models')
MODEL_PATH = os.path.join(MODELS_DIR, 'ar_yield_regressor.joblib')
FEATURE_META_PATH = os.path.join(MODELS_DIR, 'feature_columns.json')

# ── Sentinel Hub credentials ───────────────────────────────────────────────────
config = SHConfig(use_defaults=True)
config.sh_client_id = os.getenv('SENTINEL_HUB_CLIENT_ID')
config.sh_client_secret = os.getenv('SENTINEL_HUB_CLIENT_SECRET')

if not config.sh_client_id or not config.sh_client_secret:
    raise RuntimeError(
        "Missing Sentinel Hub credentials. Set SENTINEL_HUB_CLIENT_ID and SENTINEL_HUB_CLIENT_SECRET."
    )

# ── Lazy globals ───────────────────────────────────────────────────────────────
_model = None
_feature_order = None
_feature_means = None

# ── Sanity thresholds ──────────────────────────────────────────────────────────
NDVI_MIN_VIABLE = 0.15   # below this → likely bare soil, water, or desert
NDVI_MAX_VALID = 0.95   # above this → sensor artifact / permanent forest


# ── Satellite data fetcher ─────────────────────────────────────────────────────
def get_lean_stats(bbox_list, start_date, end_date):
    session = SentinelHubSession(config=config)
    access_token = session.token.get('access_token')
    if not access_token:
        raise Exception("Failed to retrieve Sentinel Hub access token.")

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {access_token}"
    }

    evalscript = """
        //VERSION=3
        function setup() {
            return {
                input: [{ bands: ["B02","B03","B04","B05","B08","B11","B12","B8A","B01","dataMask"], units: "DN" }],
                output: [
                    { id: "bands",    bands: 9 },
                    { id: "ndvi",     bands: 1 },
                    { id: "dataMask", bands: 1 }
                ]
            };
        }
        function evaluatePixel(samples) {
            let ndvi = (samples.B08 - samples.B04) / (samples.B08 + samples.B04 + 0.0001);
            return {
                ndvi:     [ndvi],
                bands:    [samples.B02, samples.B03, samples.B04, samples.B05,
                           samples.B08, samples.B11, samples.B12, samples.B8A, samples.B01],
                dataMask: [samples.dataMask]
            };
        }
    """

    payload = {
        "input": {
            "bounds": {
                "bbox": bbox_list,
                "properties": {"crs": "http://www.opengis.net/def/crs/OGC/1.3/CRS84"}
            },
            "data": [{"type": "sentinel-2-l2a", "dataFilter": {"mosaickingOrder": "leastCC"}}]
        },
        "aggregation": {
            "timeRange": {"from": f"{start_date}T00:00:00Z", "to": f"{end_date}T00:00:00Z"},
            "aggregationInterval": {"of": "P1D"},
            "evalscript": evalscript,
            "resx": 0.001,
            "resy": 0.001,
            "targetCRS": "http://www.opengis.net/def/crs/EPSG/0/3857"
        }
    }

    response = requests.post(
        "https://services.sentinel-hub.com/api/v1/statistics",
        json=payload, headers=headers, timeout=120
    )
    if response.status_code != 200:
        raise Exception(
            f"Sentinel Hub API Error {response.status_code}: {response.text}")

    data_payload = response.json()
    all_ndvi = []
    band_series = {f"band_{i}": [] for i in range(9)}

    for entry in data_payload.get("data", []):
        outputs = entry.get("outputs", {})
        if not outputs:
            continue

        ndvi_val = (
            outputs.get("ndvi", {})
            .get("bands", {})
            .get("B0", {})
            .get("stats", {})
            .get("mean")
        )
        if ndvi_val is None:
            continue
        all_ndvi.append(ndvi_val)

        bands_info = outputs.get("bands", {}).get("bands", {})
        for i in range(9):
            mean_val = bands_info.get(f"B{i}", {}).get(
                "stats", {}).get("mean", 0.0)
            band_series[f"band_{i}"].append(float(mean_val))

    if not all_ndvi:
        raise ValueError(
            "No valid satellite data found for this bbox / date range.")

    features = {
        "ndvi_avg": float(np.mean(all_ndvi)),
        "ndvi_max": float(np.max(all_ndvi)),
        "ndvi_min": float(np.min(all_ndvi)),
    }
    for i in range(9):
        features[f"temp_band_{i}_avg"] = float(
            np.mean(band_series[f"band_{i}"]))
        features[f"temp_band_{i}_max"] = float(
            np.max(band_series[f"band_{i}"]))
    print(f"Extracted features: {features}")
    return features


# ── Model loader ───────────────────────────────────────────────────────────────
def _load_model_and_metadata():
    global _model, _feature_order, _feature_means
    if _model is None:
        if not os.path.exists(MODEL_PATH):
            raise RuntimeError(f"Model file not found: {MODEL_PATH}")
        _model = joblib.load(MODEL_PATH)

    if _feature_order is None or _feature_means is None:
        if os.path.exists(FEATURE_META_PATH):
            with open(FEATURE_META_PATH, 'r') as f:
                meta = json.load(f)
            _feature_order = meta['feature_columns']
            _feature_means = np.array(meta['feature_means'], dtype=float)
        else:
            sys.path.append(BASE_DIR)
            import train_argentina
            train_df = train_argentina.load_split('train')
            _feature_order = [c for c in train_df.columns if c != 'yield']
            _feature_means = train_df[_feature_order].mean(
            ).values.astype(float)

    return _model, _feature_order, _feature_means


# ── Predictor ──────────────────────────────────────────────────────────────────
def predict_from_partial_features(partial_features: dict):
    model, feature_order, feature_means = _load_model_and_metadata()

    # Start from training means, overwrite with provided values
    x = feature_means.copy()
    name_to_idx = {name: i for i, name in enumerate(feature_order)}

    for k, v in partial_features.items():
        if k not in name_to_idx:
            continue
        try:
            x[name_to_idx[k]] = float(v)
        except Exception:
            continue

    # FIX 1: use a DataFrame so sklearn sees named columns, no warning
    X_df = pd.DataFrame([x], columns=feature_order)
    return model.predict(X_df).tolist()


# ── Main entry point ───────────────────────────────────────────────────────────
def predict_from_bbox(
    min_lon: float, min_lat: float,
    max_lon: float, max_lat: float,
    start_date: str = "2023-11-01",
    end_date:   str = "2024-04-30"
):
    """
    Full pipeline: bbox → satellite features → sanity check → model prediction.

    Args:
        min_lon, min_lat, max_lon, max_lat: bounding box in WGS84 degrees
        start_date, end_date: ISO date strings (YYYY-MM-DD)

    Returns:
        dict with 'features', 'predictions', and optional 'warning'
    """
    bbox = [min_lon, min_lat, max_lon, max_lat]
    features = get_lean_stats(bbox, start_date, end_date)

    # FIX 2: sanity guard — reject clearly non-agricultural areas
    ndvi_avg = features["ndvi_avg"]
    ndvi_max = features["ndvi_max"]

    if ndvi_avg < NDVI_MIN_VIABLE:
        raise ValueError(
            f"NDVI too low for cropland (avg={ndvi_avg:.3f}). "
            "This area appears to be bare soil, desert, or water. "
            "Prediction aborted."
        )
    if ndvi_max > NDVI_MAX_VALID:
        return {
            "features":    features,
            "predictions": predict_from_partial_features(features),
            "warning":     f"High max NDVI ({ndvi_max:.3f}) — area may include forest or permanent vegetation, not just crops."
        }

    predictions = predict_from_partial_features(features)
    return {"features": features, "predictions": predictions}


# ── CLI ────────────────────────────────────────────────────────────────────────
def main():
    raw = sys.stdin.read()
    try:
        payload = json.loads(raw) if raw else {}
    except json.JSONDecodeError:
        payload = {}

    if "bbox" in payload:
        bbox = payload["bbox"]  # [min_lon, min_lat, max_lon, max_lat]
        try:
            result = predict_from_bbox(
                min_lon=bbox[0],
                min_lat=bbox[1],
                max_lon=bbox[2],
                max_lat=bbox[3],
                start_date=payload.get("start_date", "2024-07-15"),
                end_date=payload.get("end_date",   "2024-08-15"),
            )
            print(json.dumps(result))
        except Exception as e:
            print(json.dumps({"error": str(e)}))

    else:
        # Legacy: raw feature dict passed directly
        features = payload.get("features", payload)
        if not isinstance(features, dict):
            print(json.dumps(
                {"error": "Expected JSON with 'bbox' or feature dict."}))
            return
        try:
            preds = predict_from_partial_features(features)
            print(json.dumps({"predictions": preds}))
        except Exception as e:
            print(json.dumps({"error": str(e)}))

# ── Vercel handler ─────────────────────────────────────────────────────────────

class handler(BaseHTTPRequestHandler):

    def do_GET(self):
        self._respond(200, {"status": "ok", "message": "POST a bbox to get yield predictions."})

    def do_POST(self):
        length  = int(self.headers.get('Content-Length', 0))
        raw     = self.rfile.read(length).decode('utf-8')

        try:
            payload = json.loads(raw) if raw else {}
        except json.JSONDecodeError:
            payload = {}

        try:
            if "bbox" in payload:
                bbox   = payload["bbox"]
                result = predict_from_bbox(
                    min_lon    = bbox[0],
                    min_lat    = bbox[1],
                    max_lon    = bbox[2],
                    max_lat    = bbox[3],
                    start_date = payload.get("start_date", "2023-11-01"),
                    end_date   = payload.get("end_date",   "2024-04-30"),
                )
                self._respond(200, result)
            else:
                features = payload.get("features", payload)
                if not isinstance(features, dict):
                    self._respond(400, {"error": "Expected JSON with 'bbox' or feature dict."})
                    return
                preds = predict_from_partial_features(features)
                self._respond(200, {"predictions": preds})

        except ValueError as e:
            self._respond(422, {"error": str(e)})
        except Exception as e:
            self._respond(500, {"error": str(e)})

    def _respond(self, status: int, body: dict):
        encoded = json.dumps(body).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type',   'application/json')
        self.send_header('Content-Length', str(len(encoded)))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(encoded)

    def log_message(self, format, *args):
        pass  # silence default Apache-style request logs

if __name__ == '__main__':
    result = predict_from_bbox(-62.45, -27.65, -62.44, -27.64, "2022-11-01", "2023-04-30")  
    print(json.dumps(result, indent=2))
