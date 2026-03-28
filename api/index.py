import json
from http.server import BaseHTTPRequestHandler

import os
import joblib
import numpy as np

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BASE_DIR)
MODELS_DIR = os.path.join(PROJECT_ROOT, "models")

MODEL_PATH = os.path.join(MODELS_DIR, "ar_yield_regressor.joblib")
FEATURE_META_PATH = os.path.join(MODELS_DIR, "feature_columns.json")

_model = None
_feature_order = None
_feature_means = None


def _load_model_and_metadata():
    global _model, _feature_order, _feature_means

    if _model is None:
        if not os.path.exists(MODEL_PATH):
            raise RuntimeError(f"Model file not found: {MODEL_PATH}")
        _model = joblib.load(MODEL_PATH)

    if _feature_order is None or _feature_means is None:
        if os.path.exists(FEATURE_META_PATH):
            with open(FEATURE_META_PATH, "r") as f:
                meta = json.load(f)
            _feature_order = meta["feature_columns"]
            _feature_means = np.array(meta["feature_means"], dtype=float)
        else:
            raise RuntimeError(
                "FEATURE_META_PATH not found; training fallback not available in Vercel"
            )

    return _model, _feature_order, _feature_means


def predict_from_partial_features(partial_features: dict):
    model, feature_order, feature_means = _load_model_and_metadata()

    x = feature_means.copy()
    name_to_idx = {name: i for i, name in enumerate(feature_order)}

    for k, v in partial_features.items():
        if k not in name_to_idx:
            continue
        try:
            val = float(v)
        except Exception:
            continue
        x[name_to_idx[k]] = val

    X = np.expand_dims(x, axis=0)
    y_pred = model.predict(X)
    return y_pred.tolist()


class handler(BaseHTTPRequestHandler):
    def _send_json(self, status: int, payload: dict):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        try:
            length = int(self.headers.get("Content-Length", "0"))
            raw = self.rfile.read(length).decode("utf-8") if length > 0 else ""
            try:
                payload = json.loads(raw) if raw else {}
            except json.JSONDecodeError:
                payload = {}

            features = payload.get("features", payload)
            if not isinstance(features, dict):
                self._send_json(
                    400,
                    {"error": "Invalid input. Expected JSON object of featureName: value."},
                )
                return

            preds = predict_from_partial_features(features)
            self._send_json(200, {"predictions": preds})

        except Exception as e:
            self._send_json(500, {"error": str(e)})

    def do_GET(self):
        self._send_json(200, {"status": "ok"})
