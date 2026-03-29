import os
import json
import joblib
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score

# Paths
DATA_ROOT = os.path.join("training_data", "soybeans_updated", "soybeans", "argentina")
MODELS_DIR = "models"
os.makedirs(MODELS_DIR, exist_ok=True)

def load_split(split_name="train"):
    path = os.path.join(DATA_ROOT, split_name)

    # Load raw arrays
    hists = np.load(f"{path}_hists.npz", allow_pickle=True)['data'] 
    ndvi = np.load(f"{path}_ndvi.npz", allow_pickle=True)['data']   
    yields = np.load(f"{path}_yields.npz", allow_pickle=True)['data']
    locs = np.load(f"{path}_locs.npz", allow_pickle=True)['data']

    n_samples = yields.shape[0]
    bin_weights = np.arange(32)

    # --- LEAN FEATURE ENGINEERING ---
    # Weather: Collapse bins to weighted centers
    w_sum = np.sum(hists, axis=2) + 1e-6
    daily_weighted_centers = np.sum(hists * bin_weights[None, None, :, None], axis=2) / w_sum
    
    # Fill empty/NaN weather with the center bin (16) to avoid 0.0 bias
    daily_weighted_centers = np.nan_to_num(daily_weighted_centers, nan=16.0)

    weather_seasonal_mean = np.mean(daily_weighted_centers, axis=1) 
    weather_seasonal_max = np.max(daily_weighted_centers, axis=1)  

    # NDVI: Reduce to key stats
    ndvi_flat = ndvi.reshape(n_samples, -1)
    ndvi_mean = np.mean(ndvi_flat, axis=1, keepdims=True)
    ndvi_max = np.max(ndvi_flat, axis=1, keepdims=True)
    ndvi_min = np.min(ndvi_flat, axis=1, keepdims=True)

    # Combine (No Year)
    X = np.concatenate([
        weather_seasonal_mean, 
        weather_seasonal_max, 
        ndvi_mean, 
        ndvi_max, 
        ndvi_min,
        locs.reshape(n_samples, -1), 
    ], axis=1)

    cols = [f"temp_band_{i}_avg" for i in range(9)]
    cols += [f"temp_band_{i}_max" for i in range(9)]
    cols += ["ndvi_avg", "ndvi_max", "ndvi_min", "loc_id"]

    df = pd.DataFrame(X, columns=cols)
    df['yield'] = yields.astype(float)
    
    return df

def main():
    print("🚀 Training LEAN Argentina Soybean Model...")
    train_df = load_split("train")
    test_df = load_split("test")

    X_train = train_df.drop(columns=['yield'])
    y_train = train_df['yield']
    X_test = test_df.drop(columns=['yield'])
    y_test = test_df['yield']

    reg = RandomForestRegressor(
        n_estimators=500,
        max_depth=12,
        min_samples_leaf=5,
        max_features='sqrt',
        n_jobs=-1,
        random_state=42
    )

    reg.fit(X_train, y_train)

    # Evaluate
    y_pred = reg.predict(X_test)
    print(f"✓ Lean Model R² Score: {r2_score(y_test, y_pred):.3f}")

    # --- FEATURE METADATA GENERATION ---
    feature_columns = X_train.columns.tolist()
    
    # Calculate means. We replace 0 with NaN first so the mean reflects the 
    # actual climate, not a "zero-inflated" average.
    means_series = X_train.replace(0, np.nan).mean(numeric_only=True)
    # If a column is ALL zeros/NaNs, fallback to the median or 0.0
    fallback_series = X_train.median(numeric_only=True)

    feature_means = []
    for col in feature_columns:
        # Get mean, then fallback to median, then fallback to 0.0 if both are NaN
        val = means_series.get(col, fallback_series.get(col, 0.0))
        # Ensure we don't save any NaNs into the JSON
        feature_means.append(float(np.nan_to_num(val, nan=0.0)))

    # Save Metadata (NOW PROPERLY OUTSIDE THE LOOP)
    meta = {
        "feature_columns": feature_columns,
        "feature_means": feature_means,
    }
    
    meta_path = os.path.join(MODELS_DIR, "feature_columns.json")
    with open(meta_path, "w") as f:
        json.dump(meta, f, indent=4)
    
    # Save Model
    joblib.dump(reg, os.path.join(MODELS_DIR, "ar_yield_regressor.joblib"))
    print(f"✓ feature_columns.json and Model saved to {MODELS_DIR}")

    # Plot Importance
    importances = reg.feature_importances_
    indices = np.argsort(importances)[-10:]
    plt.figure(figsize=(10, 6))
    plt.barh(range(len(indices)), importances[indices])
    plt.yticks(range(len(indices)), [X_train.columns[i] for i in indices])
    plt.title("Top 10 Lean Features")
    plt.savefig(os.path.join(MODELS_DIR, "ar_soybean_feature_importance.png"))

if __name__ == "__main__":
    main()