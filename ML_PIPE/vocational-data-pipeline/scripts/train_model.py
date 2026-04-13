"""
Entrenamiento y comparación de clasificadores para macro-areas vocacionales (V2).
Carga datos sintéticos, divide train/test estratificado, validación cruzada 5-fold,
evaluación en test, selección por F1 macro (CV), informe por clase y exportación joblib.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    f1_score,
    precision_score,
    recall_score,
)
from sklearn.model_selection import StratifiedKFold, cross_validate, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC

ROOT = Path(__file__).resolve().parent.parent
RAW_CSV = ROOT / "data" / "raw" / "synthetic_students.csv"
PROCESSED_DIR = ROOT / "data" / "processed"
TRAIN_CSV = PROCESSED_DIR / "train.csv"
TEST_CSV = PROCESSED_DIR / "test.csv"
MODELS_DIR = ROOT / "models"
MODEL_PATH = MODELS_DIR / "vocational_model.joblib"
SCALER_PATH = MODELS_DIR / "scaler.joblib"

TARGET_COL = "macro_area"
RANDOM_STATE = 42
TEST_SIZE = 0.2
N_SPLITS = 5

CV_SCORING = ["accuracy", "precision_macro", "recall_macro", "f1_macro"]


def _build_estimators() -> list[tuple[str, object]]:
    """Cuatro estimadores: dos con Pipeline+escala, dos con datos crudos."""
    lr = Pipeline(
        [
            ("scaler", StandardScaler()),
            (
                "clf",
                LogisticRegression(
                    max_iter=2000,
                    solver="lbfgs",
                    random_state=RANDOM_STATE,
                ),
            ),
        ]
    )
    svm = Pipeline(
        [
            ("scaler", StandardScaler()),
            (
                "clf",
                SVC(kernel="rbf", random_state=RANDOM_STATE),
            ),
        ]
    )
    rf = RandomForestClassifier(
        n_estimators=200,
        random_state=RANDOM_STATE,
        n_jobs=-1,
    )
    hgb = HistGradientBoostingClassifier(
        max_iter=300,
        random_state=RANDOM_STATE,
    )
    return [
        ("Regresión Logística (Multinomial)", lr),
        ("SVM (RBF)", svm),
        ("Random Forest", rf),
        ("HistGradientBoosting", hgb),
    ]


def _fmt_header(width: int = 32) -> str:
    return (
        f"{'Modelo':<{width}}"
        f"{'Accuracy':>10}"
        f"{'Precision':>12}"
        f"{'Recall':>12}"
        f"{'F1 (macro)':>12}"
    )


def _fmt_row(name: str, acc: float, p: float, r: float, f1: float, width: int = 32) -> str:
    return (
        f"{name:<{width}}"
        f"{acc:>10.4f}"
        f"{p:>12.4f}"
        f"{r:>12.4f}"
        f"{f1:>12.4f}"
    )


def main() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        try:
            sys.stdout.reconfigure(encoding="utf-8")
        except OSError:
            pass

    if not RAW_CSV.is_file():
        raise FileNotFoundError(f"No se encontró el dataset: {RAW_CSV}")

    df = pd.read_csv(RAW_CSV, encoding="utf-8")
    if TARGET_COL not in df.columns:
        raise ValueError(f"Falta la columna objetivo '{TARGET_COL}'.")

    feature_cols = [c for c in df.columns if c != TARGET_COL]
    X = df[feature_cols]
    y = df[TARGET_COL]

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=TEST_SIZE,
        stratify=y,
        random_state=RANDOM_STATE,
    )

    os.makedirs(PROCESSED_DIR, exist_ok=True)
    train_df = pd.concat([X_train, y_train], axis=1)
    test_df = pd.concat([X_test, y_test], axis=1)
    train_df.to_csv(TRAIN_CSV, index=False, encoding="utf-8")
    test_df.to_csv(TEST_CSV, index=False, encoding="utf-8")
    print(f"Train: {len(train_df)} filas -> {TRAIN_CSV}")
    print(f"Test:  {len(test_df)} filas -> {TEST_CSV}\n")

    skf = StratifiedKFold(n_splits=N_SPLITS, shuffle=True, random_state=RANDOM_STATE)
    estimators = _build_estimators()

    # Validación cruzada (solo train)
    print("=" * 78)
    print(f"Validación cruzada ({N_SPLITS}-Fold, estratificada) — promedios en train")
    print("=" * 78)
    print(_fmt_header())
    print("-" * 78)

    cv_f1_means: dict[str, float] = {}

    for name, est in estimators:
        cv = cross_validate(
            est,
            X_train,
            y_train,
            cv=skf,
            scoring=CV_SCORING,
            n_jobs=-1,
        )
        acc_m = float(np.mean(cv["test_accuracy"]))
        p_m = float(np.mean(cv["test_precision_macro"]))
        r_m = float(np.mean(cv["test_recall_macro"]))
        f1_m = float(np.mean(cv["test_f1_macro"]))
        cv_f1_means[name] = f1_m
        print(_fmt_row(name, acc_m, p_m, r_m, f1_m))
    print()

    # Evaluacion en conjunto de prueba (entrenado todo con X_train) 
    print("=" * 78)
    print("Conjunto de prueba (test) — métricas globales")
    print("=" * 78)
    print(_fmt_header())
    print("-" * 78)

    test_metrics: dict[str, dict[str, float]] = {}
    fitted: dict[str, object] = {}

    for name, est in estimators:
        est.fit(X_train, y_train)
        y_pred = est.predict(X_test)
        acc = accuracy_score(y_test, y_pred)
        p = precision_score(y_test, y_pred, average="macro", zero_division=0)
        r = recall_score(y_test, y_pred, average="macro", zero_division=0)
        f1 = f1_score(y_test, y_pred, average="macro", zero_division=0)
        test_metrics[name] = {"acc": acc, "p": p, "r": r, "f1": f1}
        fitted[name] = est
        print(_fmt_row(name, acc, p, r, f1))
    print()

    # Seleccion de ganador por mayor F1 macro en CV (no por test, para evitar sobreajustes al holdout)
    best_name = max(cv_f1_means, key=cv_f1_means.get)
    best_est = fitted[best_name]
    print(
        f"Modelo seleccionado (mayor F1 macro promedio en CV): {best_name}\n"
        f"  F1 macro (CV): {cv_f1_means[best_name]:.4f}\n"
        f"  F1 macro (test): {test_metrics[best_name]['f1']:.4f}\n"
    )

    y_test_pred = best_est.predict(X_test)
    print("=" * 78)
    print(f"classification_report — {best_name} (evaluado sobre test)")
    print("=" * 78)
    print(classification_report(y_test, y_test_pred, digits=4, zero_division=0))
    print()

    # Exportacion
    os.makedirs(MODELS_DIR, exist_ok=True)
    joblib.dump(best_est, MODEL_PATH)
    print(f"Modelo guardado: {MODEL_PATH}")

    uses_scaler = isinstance(best_est, Pipeline) and "scaler" in best_est.named_steps
    if uses_scaler:
        scaler = best_est.named_steps["scaler"]
        joblib.dump(scaler, SCALER_PATH)
        print(f"Scaler guardado: {SCALER_PATH}")
    else:
        if SCALER_PATH.is_file():
            SCALER_PATH.unlink()
            print(f"Eliminado {SCALER_PATH} (modelo sin escalado).")
        else:
            print("No se exporta scaler (Random Forest / HistGradientBoosting).")

    print("\nListo.")


if __name__ == "__main__":
    main()
