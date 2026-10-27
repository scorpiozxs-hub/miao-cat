"""Train a compact 8-class CNN and export the browser-ready ONNX model."""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
import torch
from torch import nn
from torch.utils.data import DataLoader, TensorDataset


class SketchCNN(nn.Module):
    def __init__(self, class_count: int = 8):
        super().__init__()
        self.features = nn.Sequential(
            nn.Conv2d(1, 24, 3, padding=1), nn.BatchNorm2d(24), nn.ReLU(), nn.MaxPool2d(2),
            nn.Conv2d(24, 48, 3, padding=1), nn.BatchNorm2d(48), nn.ReLU(), nn.MaxPool2d(2),
            nn.Conv2d(48, 64, 3, padding=1), nn.ReLU(), nn.AdaptiveAvgPool2d((3, 3)),
        )
        self.classifier = nn.Sequential(nn.Flatten(), nn.Linear(64 * 3 * 3, 96), nn.ReLU(), nn.Dropout(0.2), nn.Linear(96, class_count))

    def forward(self, inputs: torch.Tensor) -> torch.Tensor:
        return self.classifier(self.features(inputs))


def load_split(path: Path) -> TensorDataset:
    with np.load(path) as data:
        images = torch.from_numpy(data["images"].copy()).float().unsqueeze(1).div_(255.0)
        labels = torch.from_numpy(data["labels"].copy()).long()
    return TensorDataset(images, labels)


def evaluate(model: nn.Module, loader: DataLoader, device: torch.device, classes: int) -> dict:
    confusion = np.zeros((classes, classes), dtype=np.int64)
    model.eval()
    with torch.inference_mode():
        for images, labels in loader:
            predictions = model(images.to(device)).argmax(1).cpu().numpy()
            actual = labels.numpy()
            np.add.at(confusion, (actual, predictions), 1)
    total = int(confusion.sum())
    return {"accuracy": float(np.trace(confusion) / max(total, 1)),
            "perClassAccuracy": (np.diag(confusion) / np.maximum(confusion.sum(1), 1)).tolist(),
            "confusionMatrix": confusion.tolist(), "samples": total}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset-dir", type=Path, default=Path("training") / "artifacts" / "quickdraw-28")
    parser.add_argument("--model-path", type=Path, default=Path("public") / "models" / "quickdraw-8class.onnx")
    parser.add_argument("--epochs", type=int, default=20)
    parser.add_argument("--batch-size", type=int, default=512)
    parser.add_argument("--seed", type=int, default=20261028)
    args = parser.parse_args()
    torch.manual_seed(args.seed)
    np.random.seed(args.seed)
    torch.set_num_threads(max(1, min(8, torch.get_num_threads())))
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    train = DataLoader(load_split(args.dataset_dir / "train.npz"), batch_size=args.batch_size, shuffle=True)
    validation = DataLoader(load_split(args.dataset_dir / "validation.npz"), batch_size=args.batch_size)
    test = DataLoader(load_split(args.dataset_dir / "test.npz"), batch_size=args.batch_size)
    model = SketchCNN().to(device)
    optimizer = torch.optim.AdamW(model.parameters(), lr=0.001, weight_decay=1e-4)
    loss_fn = nn.CrossEntropyLoss()
    best_loss, best_state, stale = float("inf"), None, 0
    checkpoint_path = args.dataset_dir / "best-checkpoint.pt"
    for epoch in range(args.epochs):
        model.train()
        total_loss, total = 0.0, 0
        for images, labels in train:
            images, labels = images.to(device), labels.to(device)
            optimizer.zero_grad(set_to_none=True)
            loss = loss_fn(model(images), labels)
            loss.backward()
            optimizer.step()
            total_loss += float(loss.item()) * len(labels)
            total += len(labels)
        model.eval()
        val_loss, val_total = 0.0, 0
        with torch.inference_mode():
            for images, labels in validation:
                images, labels = images.to(device), labels.to(device)
                loss = loss_fn(model(images), labels)
                val_loss += float(loss.item()) * len(labels)
                val_total += len(labels)
        val_loss /= max(1, val_total)
        print(f"epoch {epoch + 1}/{args.epochs} train_loss={total_loss / max(1, total):.4f} val_loss={val_loss:.4f}", flush=True)
        if val_loss < best_loss:
            best_loss, stale = val_loss, 0
            best_state = {key: value.detach().cpu().clone() for key, value in model.state_dict().items()}
            torch.save({"model": best_state, "epoch": epoch + 1, "validationLoss": best_loss}, checkpoint_path)
        else:
            stale += 1
            if stale >= 4:
                break
    if best_state is None:
        raise RuntimeError("Training did not produce a model checkpoint")
    model.load_state_dict(best_state)
    model.to("cpu").eval()
    metrics = {"validation": evaluate(model, validation, torch.device("cpu"), 8),
               "test": evaluate(model, test, torch.device("cpu"), 8),
               "classes": ["cat", "dog", "rabbit", "fish", "bear", "mouse", "face", "house"],
               "input": {"shape": [1, 1, 28, 28], "dtype": "float32", "range": [0.0, 1.0], "whiteInkOnBlack": True},
               "trainingDevice": str(device), "seed": args.seed}
    args.model_path.parent.mkdir(parents=True, exist_ok=True)
    dummy = torch.zeros(1, 1, 28, 28, dtype=torch.float32)
    torch.onnx.export(model, (dummy,), str(args.model_path), input_names=["image"], output_names=["logits"],
                      opset_version=18, dynamo=True, verify=True)
    metrics_path = args.model_path.with_suffix(".metrics.json")
    metrics_path.write_text(json.dumps(metrics, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"model": str(args.model_path.resolve()), "bytes": args.model_path.stat().st_size,
                      "metrics": metrics_path.resolve().as_posix(), "testAccuracy": metrics["test"]["accuracy"]}, indent=2))


if __name__ == "__main__":
    main()
