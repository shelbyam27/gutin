"""
CLI:  python cli.py <observations.json> [--map out.html]

`observations.json` schema (list of objects):
  {
    "mcc": 510, "mnc": 10, "lac": 12345, "cid": 67890,
    "radio": "lte",                # gsm | umts | lte | nr
    "rssi": -78,                   # optional, dBm
    "ta":   3,                     # optional, timing advance steps
    "lat":  -6.20,  "lon": 106.81, # optional inline tower coordinates
    "range_m": 1500                # optional coverage hint
  }

Set OCID_API_KEY env var to enable OpenCellID lookups for cells that have no
inline coordinates.
"""

import argparse
import json
import os
import sys
from pathlib import Path

from bts_locate import load_observations, resolve, trilaterate


HTML_TEMPLATE = """<!doctype html>
<html><head><meta charset="utf-8"><title>BTS fix</title>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>html,body,#map{height:100%;margin:0}</style></head>
<body><div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
const fix = __FIX__;
const towers = __TOWERS__;
const map = L.map('map').setView([fix.lat, fix.lon], 14);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'OSM'}).addTo(map);
L.marker([fix.lat, fix.lon]).addTo(map)
  .bindPopup('Estimated fix<br>accuracy ±'+Math.round(fix.accuracy_m)+' m').openPopup();
L.circle([fix.lat, fix.lon],{radius:fix.accuracy_m,color:'red',fillOpacity:0.05}).addTo(map);
for (const t of towers) {
  L.circleMarker([t.lat,t.lon],{radius:6,color:'#1e7'}).addTo(map)
    .bindPopup('BTS '+t.key+'<br>d≈'+Math.round(t.distance_m)+' m<br>src: '+t.source);
  L.circle([t.lat,t.lon],{radius:t.distance_m,color:'#1e7',fillOpacity:0.05,weight:1}).addTo(map);
}
</script></body></html>
"""


def main() -> int:
    ap = argparse.ArgumentParser(description="BTS trilateration tool")
    ap.add_argument("observations", help="Path to JSON observation file")
    ap.add_argument("--map", default="map.html", help="Output HTML map (default: map.html)")
    ap.add_argument("--no-map", action="store_true", help="Skip HTML map output")
    args = ap.parse_args()

    obs = load_observations(args.observations)
    if not obs:
        print("no observations parsed", file=sys.stderr)
        return 1

    api_key = os.getenv("OCID_API_KEY")
    cells = resolve(obs, api_key=api_key)
    if not cells:
        print("no cells could be resolved to coordinates", file=sys.stderr)
        return 2

    fix = trilaterate(cells)
    if fix is None:
        print("trilateration failed", file=sys.stderr)
        return 3

    print(f"\nfix: {fix.lat:.6f}, {fix.lon:.6f}   (+/- {fix.accuracy_m:.0f} m, {len(fix.used)} cells)")
    print(f"https://www.openstreetmap.org/?mlat={fix.lat}&mlon={fix.lon}#map=16/{fix.lat}/{fix.lon}")
    print()
    for c in fix.used:
        print(f"  {c.obs.key:35s}  d~={c.distance_m:7.0f} m  w={c.weight:4.2f}  ({c.source})")

    if not args.no_map:
        towers = [
            {"key": c.obs.key, "lat": c.lat, "lon": c.lon,
             "distance_m": c.distance_m, "source": c.source}
            for c in fix.used
        ]
        html = (HTML_TEMPLATE
                .replace("__FIX__", json.dumps({"lat": fix.lat, "lon": fix.lon,
                                                "accuracy_m": fix.accuracy_m}))
                .replace("__TOWERS__", json.dumps(towers)))
        Path(args.map).write_text(html, encoding="utf-8")
        print(f"\nmap: {Path(args.map).resolve()}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
