"""One-off import of the original Google Sheets exports into public/data/*.json."""
import datetime as dt
import json
import re
import sys
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "data"


def char_id(label: str) -> str:
    game, name = label.strip().split(" ", 1)
    return f"{game.lower()}-{name.lower()}"


def fmt_time(v) -> str:
    if isinstance(v, dt.time):
        return v.strftime("%H:%M:%S")
    if isinstance(v, dt.timedelta):
        s = int(v.total_seconds())
        return f"{s // 3600:02d}:{s % 3600 // 60:02d}:{s % 60:02d}"
    m = re.fullmatch(r"\s*(\d{1,2}):(\d{2}):(\d{2})\s*", str(v))
    if not m:
        raise ValueError(f"bad time {v!r}")
    h, mi, s = map(int, m.groups())
    return f"{h:02d}:{mi:02d}:{s:02d}"


def rows(path: Path):
    ws = openpyxl.load_workbook(path, data_only=True)["Form Responses 1"]
    return [r for r in ws.iter_rows(min_row=2, values_only=True) if r[0]]


def iso(ts: dt.datetime) -> str:
    return ts.replace(microsecond=0).isoformat()


def main(coop_xlsx: str, solo_xlsx: str) -> None:
    coop = [
        {
            "id": f"coop-{i + 1}",
            "loggedAt": iso(r[0]),
            "thomas": char_id(r[1]),
            "craig": char_id(r[2]),
            "level": int(r[3]),
            "time": fmt_time(r[4]),
            "thomasScore": int(r[5]),
            "craigScore": int(r[6]),
        }
        for i, r in enumerate(rows(Path(coop_xlsx)))
    ]
    solo = [
        {
            "id": f"solo-{i + 1}",
            "loggedAt": iso(r[0]),
            "character": char_id(r[1]),
            "blitz": "alternate" if r[2].startswith("Alternate") else "default",
            "star": "alternate" if r[3].startswith("Alternate") else "default",
            "level": int(r[4]),
            "time": fmt_time(r[5]),
            "score": int(r[6]),
        }
        for i, r in enumerate(rows(Path(solo_xlsx)))
    ]
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "coop-runs.json").write_text(json.dumps(coop, indent=2) + "\n")
    (OUT / "solo-runs.json").write_text(json.dumps(solo, indent=2) + "\n")
    print(f"coop: {len(coop)} runs, solo: {len(solo)} runs")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
