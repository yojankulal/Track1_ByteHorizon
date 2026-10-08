"""
FloodTwin - Flood Probability Model Training

Trains an XGBoost classifier using the preprocessed MODIS flood dataset.

Dataset:
    data/preprocessed/modis_clean.parquet

Expected columns:
    lon
    lat
    precip_1d
    precip_3d
    landcover
    elevation
    slope
    TWI
    upstream_area_log
    aspect_sin
    aspect_cos
    target
    split
    block_id
    holdout_event

Outputs:
    models/flood_xgb.json
    models/metrics.json
    models/feature_importance.csv
    models/shap_importance.csv
    models/confusion_matrix.png
"""


from pathlib import Path
import json

import numpy as np
import pandas as pd
import xgboost as xgb

from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    average_precision_score,
    confusion_matrix,
    classification_report,
)

import matplotlib.pyplot as plt

import shap


# ============================================================
# 1. PATHS
# ============================================================

PROJECT_ROOT = Path(__file__).resolve().parents[1]

DATA_PATH = PROJECT_ROOT / "data" / "preprocessed" / "modis_clean.parquet"
MODEL_DIR = PROJECT_ROOT / "models"

MODEL_DIR.mkdir(parents=True, exist_ok=True)


# ============================================================
# 2. FEATURES
# ============================================================

FEATURES = [
    "lon",
    "lat",
    "precip_1d",
    "precip_3d",
    "landcover",
    "elevation",
    "slope",
    "TWI",
    "upstream_area_log",
    "aspect_sin",
    "aspect_cos",
]

TARGET = "target"


# ============================================================
# 3. LOAD DATA
# ============================================================

print("=" * 70)
print("FloodTwin - Flood Probability Model")
print("=" * 70)

print("\n[1/8] Loading dataset...")

if not DATA_PATH.exists():
    raise FileNotFoundError(
        f"Dataset not found:\n{DATA_PATH}\n\n"
        "Make sure preprocessing was completed successfully."
    )

df = pd.read_parquet(DATA_PATH)

print(f"Dataset shape: {df.shape}")
print(f"Features used: {len(FEATURES)}")


# ============================================================
# 4. CHECK REQUIRED COLUMNS
# ============================================================

required_columns = FEATURES + [TARGET, "split"]

missing_columns = [
    column for column in required_columns
    if column not in df.columns
]

if missing_columns:
    raise ValueError(
        f"Missing required columns: {missing_columns}"
    )

print("\nRequired columns verified.")


# ============================================================
# 5. CREATE TRAIN / VALIDATION / TEST SETS
# ============================================================

print("\n[2/8] Creating dataset splits...")

train_df = df[df["split"] == "train"].copy()
val_df = df[df["split"] == "val"].copy()
test_df = df[df["split"] == "test"].copy()

print(f"Train:      {len(train_df):,}")
print(f"Validation: {len(val_df):,}")
print(f"Test:       {len(test_df):,}")


X_train = train_df[FEATURES]
y_train = train_df[TARGET]

X_val = val_df[FEATURES]
y_val = val_df[TARGET]

X_test = test_df[FEATURES]
y_test = test_df[TARGET]


# ============================================================
# 6. CLASS IMBALANCE
# ============================================================

print("\n[3/8] Checking class balance...")

negative_count = int((y_train == 0).sum())
positive_count = int((y_train == 1).sum())

if positive_count == 0:
    raise ValueError("Training dataset contains no positive flood samples.")

scale_pos_weight = negative_count / positive_count

print(f"Non-flood samples: {negative_count:,}")
print(f"Flood samples:     {positive_count:,}")
print(f"scale_pos_weight:  {scale_pos_weight:.3f}")


# ============================================================
# 7. TRAIN XGBOOST
# ============================================================

print("\n[4/8] Training XGBoost model...")
print("This may take a little while.\n")

model = xgb.XGBClassifier(
    n_estimators=600,
    max_depth=7,
    learning_rate=0.05,
    subsample=0.85,
    colsample_bytree=0.85,
    min_child_weight=3,
    gamma=0.1,
    reg_alpha=0.1,
    reg_lambda=1.0,

    objective="binary:logistic",
    eval_metric="aucpr",

    scale_pos_weight=scale_pos_weight,

    tree_method="hist",

    random_state=42,
    n_jobs=-1,
)


model.fit(
    X_train,
    y_train,

    eval_set=[
        (X_train, y_train),
        (X_val, y_val),
    ],

    verbose=True,
)


# ============================================================
# 8. PREDICTIONS
# ============================================================

print("\n[5/8] Generating predictions...")

train_probability = model.predict_proba(X_train)[:, 1]
val_probability = model.predict_proba(X_val)[:, 1]
test_probability = model.predict_proba(X_test)[:, 1]


# Default classification threshold
THRESHOLD = 0.50

train_prediction = (train_probability >= THRESHOLD).astype(int)
val_prediction = (val_probability >= THRESHOLD).astype(int)
test_prediction = (test_probability >= THRESHOLD).astype(int)


# ============================================================
# 9. EVALUATION FUNCTION
# ============================================================

def evaluate_split(name, y_true, probability, prediction):

    metrics = {
        "accuracy": float(
            accuracy_score(y_true, prediction)
        ),

        "precision": float(
            precision_score(
                y_true,
                prediction,
                zero_division=0
            )
        ),

        "recall": float(
            recall_score(
                y_true,
                prediction,
                zero_division=0
            )
        ),

        "f1": float(
            f1_score(
                y_true,
                prediction,
                zero_division=0
            )
        ),

        "roc_auc": float(
            roc_auc_score(
                y_true,
                probability
            )
        ),

        "pr_auc": float(
            average_precision_score(
                y_true,
                probability
            )
        ),
    }

    print("\n" + "-" * 60)
    print(name)
    print("-" * 60)

    for key, value in metrics.items():
        print(f"{key:12}: {value:.4f}")

    print("\nConfusion Matrix:")
    print(confusion_matrix(y_true, prediction))

    print("\nClassification Report:")
    print(
        classification_report(
            y_true,
            prediction,
            zero_division=0
        )
    )

    return metrics


# ============================================================
# 10. EVALUATE
# ============================================================

print("\n[6/8] Evaluating model...")

train_metrics = evaluate_split(
    "TRAIN",
    y_train,
    train_probability,
    train_prediction,
)

val_metrics = evaluate_split(
    "VALIDATION",
    y_val,
    val_probability,
    val_prediction,
)

test_metrics = evaluate_split(
    "TEST",
    y_test,
    test_probability,
    test_prediction,
)


# ============================================================
# 11. SAVE MODEL
# ============================================================

print("\n[7/8] Saving model...")

model_path = MODEL_DIR / "flood_xgb.json"

model.save_model(model_path)

print(f"Model saved to:")
print(model_path)


# ============================================================
# 12. SAVE METRICS
# ============================================================

metrics_output = {
    "model": "XGBoost",
    "target": TARGET,
    "features": FEATURES,

    "dataset": {
        "total_rows": int(len(df)),
        "train_rows": int(len(train_df)),
        "validation_rows": int(len(val_df)),
        "test_rows": int(len(test_df)),
    },

    "class_balance": {
        "non_flood": int((df[TARGET] == 0).sum()),
        "flood": int((df[TARGET] == 1).sum()),
        "flood_rate": float(df[TARGET].mean()),
    },

    "threshold": THRESHOLD,

    "metrics": {
        "train": train_metrics,
        "validation": val_metrics,
        "test": test_metrics,
    },
}

metrics_path = MODEL_DIR / "metrics.json"

with open(metrics_path, "w", encoding="utf-8") as f:
    json.dump(
        metrics_output,
        f,
        indent=4
    )

print(f"Metrics saved to:")
print(metrics_path)


# ============================================================
# 13. XGBOOST FEATURE IMPORTANCE
# ============================================================

importance_df = pd.DataFrame({
    "feature": FEATURES,
    "importance": model.feature_importances_,
})

importance_df = importance_df.sort_values(
    "importance",
    ascending=False
)

importance_path = MODEL_DIR / "feature_importance.csv"

importance_df.to_csv(
    importance_path,
    index=False
)

print(f"Feature importance saved to:")
print(importance_path)

print("\nFeature Importance:")
print(importance_df.to_string(index=False))


# ============================================================
# 14. CONFUSION MATRIX IMAGE
# ============================================================

cm = confusion_matrix(
    y_test,
    test_prediction
)

plt.figure(figsize=(6, 5))

plt.imshow(cm)

plt.title("FloodTwin - Test Confusion Matrix")

plt.xlabel("Predicted")
plt.ylabel("Actual")

plt.xticks(
    [0, 1],
    ["Non-Flood", "Flood"]
)

plt.yticks(
    [0, 1],
    ["Non-Flood", "Flood"]
)

for i in range(2):
    for j in range(2):
        plt.text(
            j,
            i,
            cm[i, j],
            ha="center",
            va="center"
        )

plt.colorbar()

plt.tight_layout()

cm_path = MODEL_DIR / "confusion_matrix.png"

plt.savefig(
    cm_path,
    dpi=200
)

plt.close()

print(f"\nConfusion matrix saved to:")
print(cm_path)


# ============================================================
# 15. SHAP EXPLANATIONS
# ============================================================

print("\n[8/8] Calculating SHAP feature importance...")

# SHAP can be expensive on hundreds of thousands of rows.
# Use a representative sample for explanation.

SHAP_SAMPLE_SIZE = min(
    5000,
    len(X_test)
)

X_shap = X_test.sample(
    n=SHAP_SAMPLE_SIZE,
    random_state=42
)

explainer = shap.TreeExplainer(model)

shap_values = explainer.shap_values(X_shap)

# For binary XGBoost models, SHAP normally returns
# one value per feature for each sample.

mean_abs_shap = np.abs(shap_values).mean(axis=0)

shap_df = pd.DataFrame({
    "feature": FEATURES,
    "mean_abs_shap": mean_abs_shap,
})

shap_df = shap_df.sort_values(
    "mean_abs_shap",
    ascending=False
)

shap_path = MODEL_DIR / "shap_importance.csv"

shap_df.to_csv(
    shap_path,
    index=False
)

print("\nSHAP Feature Importance:")
print(shap_df.to_string(index=False))

print(f"\nSHAP importance saved to:")
print(shap_path)


# ============================================================
# 16. FINAL SUMMARY
# ============================================================

print("\n" + "=" * 70)
print("FLOODTWIN MODEL TRAINING COMPLETE")
print("=" * 70)

print("\nGenerated files:")

for path in [
    model_path,
    metrics_path,
    importance_path,
    cm_path,
    shap_path,
]:
    print(f"  ✓ {path.relative_to(PROJECT_ROOT)}")

print("\nTest Performance:")

print(
    f"  ROC-AUC : {test_metrics['roc_auc']:.4f}"
)

print(
    f"  PR-AUC  : {test_metrics['pr_auc']:.4f}"
)

print(
    f"  Recall  : {test_metrics['recall']:.4f}"
)

print(
    f"  Precision: {test_metrics['precision']:.4f}"
)

print(
    f"  F1      : {test_metrics['f1']:.4f}"
)

print("\nFloodTwin now has a trained flood probability model.")
print("=" * 70)