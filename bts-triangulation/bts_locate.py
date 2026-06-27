"""
BTS triangulation core.

Given a list of cell observations (MCC, MNC, LAC, CID + signal or timing-advance),
resolves each cell to a known geographic position and then estimates the device
position via weighted least-squares trilateration.

Tower position sources, in order of preference:
  1. `lat`/`lon` provided inline in the observation (offline / authoritative).
  2. OpenCellID public API  (https://opencellid.org)  -- needs OCID_API_KEY.
  3. Local cache file `cache/cells.json`.

Distance estimation:
  - If `ta` (Timing Advance) is present  -> d = TA * 550 m (GSM bit-period).
  - Else if `rssi` (dBm) is present      -> log-distance path-loss model.
  - Else                                 -> a coarse default radius from `range`
                                            field (OpenCellID returns one).
"""

from __future__ import annotations

import json
import math
import os
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

import requests
from scipy.optimize import least_squares


# ---------- geo helpers ----------

EARTH_R = 6_371_000.0  # meters

def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlmb = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlmb / 2) ** 2
    return 2 * EARTH_R * math.asin(math.sqrt(a))


def meters_to_deg(lat: float) -> tuple[float, float]:
    """Return (deg_per_meter_lat, deg_per_meter_lon) at a given latitude."""
    m_per_deg_lat = 111_132.0
    m_per_deg_lon = 111_320.0 * math.cos(math.radians(lat))
    return 1.0 / m_per_deg_lat, 1.0 / m_per_deg_lon


# ---------- data model ----------

@dataclass
class Observation:
    mcc: int
    mnc: int
    lac: int            # also called TAC on LTE / NRTAC on 5G
    cid: int
    radio: str = "gsm"  # gsm | umts | lte | nr
    rssi: Optional[float] = None   # dBm (negative)
    ta: Optional[int] = None       # timing advance steps
    lat: Optional[float] = None    # if known (offline mode)
    lon: Optional[float] = None
    range_m: Optional[float] = None  # tower coverage radius hint

    @property
    def key(self) -> str:
        return f"{self.radio}:{self.mcc}-{self.mnc}-{self.lac}-{self.cid}"


@dataclass
class ResolvedCell:
    obs: Observation
    lat: float
    lon: float
    distance_m: float
    weight: float = 1.0
    source: str = "inline"


@dataclass
class Fix:
    lat: float
    lon: float
    accuracy_m: float
    used: list[ResolvedCell] = field(default_factory=list)


# ---------- tower resolution ----------

CACHE_FILE = Path(__file__).with_name("cache") / "cells.json"


def _load_cache() -> dict:
    if CACHE_FILE.exists():
        try:
            return json.loads(CACHE_FILE.read_text())
        except json.JSONDecodeError:
            return {}
    return {}


def _save_cache(cache: dict) -> None:
    CACHE_FILE.parent.mkdir(exist_ok=True)
    CACHE_FILE.write_text(json.dumps(cache, indent=2))


def opencellid_lookup(obs: Observation, api_key: str) -> Optional[dict]:
    """Hit the OpenCellID free endpoint. Returns dict with lat/lon/range or None."""
    radio = obs.radio.upper()
    url = (
        "https://opencellid.org/cell/get"
        f"?key={api_key}&mcc={obs.mcc}&mnc={obs.mnc}"
        f"&lac={obs.lac}&cellid={obs.cid}&radio={radio}&format=json"
    )
    try:
        r = requests.get(url, timeout=10)
        if r.status_code != 200:
            return None
        data = r.json()
        if "lat" not in data or "lon" not in data:
            return None
        return {
            "lat": float(data["lat"]),
            "lon": float(data["lon"]),
            "range": float(data.get("range", 1000)),
        }
    except (requests.RequestException, ValueError):
        return None


# ---------- distance estimation ----------

def distance_from_ta(ta: int, radio: str = "gsm") -> float:
    """
    GSM:  1 TA step = ~550 m   (bit period * c / 2)
    UMTS: 1 chip = ~78 m
    LTE:  1 TA step = ~78 m    (16 * Ts)
    """
    if radio in ("lte", "umts", "nr"):
        return ta * 78.0
    return ta * 550.0


def distance_from_rssi(rssi_dbm: float, freq_mhz: float = 900.0) -> float:
    """
    Log-distance path-loss model.
        PL(d) = PL(d0) + 10 * n * log10(d / d0)
    Solved for d. Assumes Tx power ~ +43 dBm (typical macro BTS) and antenna
    gains net to ~0 dB at the receiver. n=3.0 for suburban, 4.0 for dense urban.
    Free-space PL at 1 m (d0=1m) for 900 MHz ~= 31.5 dB.
    """
    tx_dbm = 43.0
    n = 3.5
    pl_d0 = 32.44 + 20 * math.log10(freq_mhz) - 60  # FSPL at 1 m
    pl = tx_dbm - rssi_dbm
    return 10 ** ((pl - pl_d0) / (10 * n))


def estimate_distance(obs: Observation, fallback_range: float) -> tuple[float, float]:
    """Return (distance_m, weight). Higher weight = more reliable."""
    if obs.ta is not None:
        return distance_from_ta(obs.ta, obs.radio), 4.0
    if obs.rssi is not None:
        d = distance_from_rssi(obs.rssi)
        # RSSI is noisy; weight inversely to distance
        return d, max(0.2, 2.0 - math.log10(max(d, 1)))
    return fallback_range, 0.5


# ---------- resolve all observations ----------

def resolve(observations: list[Observation], api_key: Optional[str] = None) -> list[ResolvedCell]:
    cache = _load_cache()
    out: list[ResolvedCell] = []
    dirty = False

    for obs in observations:
        if obs.lat is not None and obs.lon is not None:
            d, w = estimate_distance(obs, obs.range_m or 1000)
            out.append(ResolvedCell(obs, obs.lat, obs.lon, d, w, "inline"))
            continue

        if obs.key in cache:
            entry = cache[obs.key]
            d, w = estimate_distance(obs, entry.get("range", 1000))
            out.append(ResolvedCell(obs, entry["lat"], entry["lon"], d, w, "cache"))
            continue

        if not api_key:
            print(f"[skip] no inline coords and no OCID key for {obs.key}")
            continue

        info = opencellid_lookup(obs, api_key)
        if info is None:
            print(f"[miss] OpenCellID has no record for {obs.key}")
            continue

        cache[obs.key] = {**info, "fetched_at": int(time.time())}
        dirty = True
        d, w = estimate_distance(obs, info["range"])
        out.append(ResolvedCell(obs, info["lat"], info["lon"], d, w, "opencellid"))

    if dirty:
        _save_cache(cache)
    return out


# ---------- trilateration ----------

def trilaterate(cells: list[ResolvedCell]) -> Optional[Fix]:
    """
    Weighted non-linear least-squares: minimize sum_i w_i * (|p - p_i| - d_i)^2.
    Returns None when < 2 cells are usable; uses the strongest cell alone for 1.
    """
    cells = [c for c in cells if c.distance_m > 0]
    if not cells:
        return None
    if len(cells) == 1:
        c = cells[0]
        return Fix(c.lat, c.lon, c.distance_m, [c])

    # Initial guess: weighted centroid.
    wsum = sum(c.weight for c in cells)
    x0 = sum(c.lat * c.weight for c in cells) / wsum
    y0 = sum(c.lon * c.weight for c in cells) / wsum

    lat0 = x0
    dlat_per_m, dlon_per_m = meters_to_deg(lat0)

    def residuals(p):
        lat, lon = p
        res = []
        for c in cells:
            d = haversine(lat, lon, c.lat, c.lon)
            res.append(math.sqrt(c.weight) * (d - c.distance_m))
        return res

    result = least_squares(residuals, x0=[x0, y0], method="lm", max_nfev=200)
    lat, lon = result.x
    rms = math.sqrt(sum(r * r for r in result.fun) / len(result.fun))
    return Fix(lat, lon, rms, cells)


# ---------- input parsing ----------

def load_observations(path: str) -> list[Observation]:
    raw = json.loads(Path(path).read_text())
    return [Observation(**item) for item in raw]
