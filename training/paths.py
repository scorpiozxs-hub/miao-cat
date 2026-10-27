"""Portable data locations; migration archives restore to training/data by default."""
import os
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def data_root():
    configured=os.environ.get('MIAO_DATA_DIR')
    if configured:return Path(configured).expanduser().resolve()
    portable=ROOT/'training/data'
    if portable.exists():return portable
    legacy=Path('D:/all_in_ai/摸凹猫/data')
    return legacy if legacy.exists() else portable
