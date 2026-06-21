"""Real Bengaluru event venues with approximate geo-coordinates and capacities.

Coordinates are real (rounded). Capacities are public/realistic figures used to
ground the synthetic-data generator and the live forecast. ``base_radius_km`` is
the nominal footprint over which an event at full attendance exerts traffic
pressure (used by the distance-decay impact model).
"""

from __future__ import annotations

from dataclasses import dataclass, asdict


@dataclass(frozen=True)
class Venue:
    id: str
    name: str
    lat: float
    lng: float
    capacity: int
    base_radius_km: float
    # Event types this venue typically hosts (drives default scenario presets).
    typical_events: tuple[str, ...]

    def to_dict(self) -> dict:
        return asdict(self)


VENUES: list[Venue] = [
    Venue(
        id="chinnaswamy",
        name="M. Chinnaswamy Stadium",
        lat=12.9788,
        lng=77.5996,
        capacity=40000,
        base_radius_km=3.2,
        typical_events=("cricket", "concert"),
    ),
    Venue(
        id="kanteerava",
        name="Sree Kanteerava Stadium",
        lat=12.9698,
        lng=77.5957,
        capacity=24000,
        base_radius_km=2.6,
        typical_events=("football", "athletics", "concert"),
    ),
    Venue(
        id="palace_grounds",
        name="Bengaluru Palace Grounds",
        lat=13.0007,
        lng=77.5900,
        capacity=100000,
        base_radius_km=4.5,
        typical_events=("concert", "festival", "rally", "exhibition"),
    ),
    Venue(
        id="freedom_park",
        name="Freedom Park",
        lat=12.9774,
        lng=77.5810,
        capacity=50000,
        base_radius_km=3.0,
        typical_events=("rally", "protest", "festival"),
    ),
    Venue(
        id="vidhana_soudha",
        name="Vidhana Soudha Precinct",
        lat=12.9794,
        lng=77.5907,
        capacity=30000,
        base_radius_km=2.8,
        typical_events=("rally", "vip_movement", "protest"),
    ),
    Venue(
        id="kanteerava_indoor",
        name="Kanteerava Indoor Stadium",
        lat=12.9690,
        lng=77.5950,
        capacity=12000,
        base_radius_km=1.8,
        typical_events=("concert", "kabaddi", "badminton"),
    ),
    Venue(
        id="national_college",
        name="National College Grounds, Basavanagudi",
        lat=12.9419,
        lng=77.5731,
        capacity=35000,
        base_radius_km=2.7,
        typical_events=("festival", "concert", "rally"),
    ),
    Venue(
        id="jayamahal",
        name="Jayamahal Palace Grounds",
        lat=13.0046,
        lng=77.5963,
        capacity=20000,
        base_radius_km=2.2,
        typical_events=("exhibition", "festival", "concert"),
    ),
]

VENUES_BY_ID: dict[str, Venue] = {v.id: v for v in VENUES}


def get_venue(venue_id: str) -> Venue:
    if venue_id not in VENUES_BY_ID:
        raise KeyError(f"Unknown venue: {venue_id}")
    return VENUES_BY_ID[venue_id]
