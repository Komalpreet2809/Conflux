"""Pydantic request/response schemas for the Conflux API."""

from __future__ import annotations

from pydantic import BaseModel, Field, field_validator

from app.data.venues import VENUES_BY_ID
from app.ml.features import EVENT_TYPES, Event


class SimulateRequest(BaseModel):
    venueId: str = Field(..., description="Venue id from /api/venues")
    eventType: str = Field(..., description="Event type key from /api/event-types")
    attendance: int = Field(..., gt=0, le=300000)
    startHour: float = Field(..., ge=0, le=23.75)
    dow: int = Field(..., ge=0, le=6, description="0=Mon ... 6=Sun")
    isHoliday: bool = False
    rain: int = Field(0, ge=0, le=2, description="0 clear / 1 light / 2 heavy")
    tempC: float = Field(26.0, ge=10, le=48)
    durationMin: int = Field(180, ge=30, le=600)
    manpowerBudget: int = Field(60, ge=0, le=400)

    @field_validator("venueId")
    @classmethod
    def _venue_ok(cls, v: str) -> str:
        if v not in VENUES_BY_ID:
            raise ValueError(f"Unknown venueId '{v}'")
        return v

    @field_validator("eventType")
    @classmethod
    def _type_ok(cls, v: str) -> str:
        if v not in EVENT_TYPES:
            raise ValueError(f"Unknown eventType '{v}'")
        return v

    def to_event(self) -> Event:
        return Event(
            venue_id=self.venueId,
            event_type=self.eventType,
            attendance=self.attendance,
            start_hour=self.startHour,
            dow=self.dow,
            is_holiday=self.isHoliday,
            rain=self.rain,
            temp_c=self.tempC,
            duration_min=self.durationMin,
        )
