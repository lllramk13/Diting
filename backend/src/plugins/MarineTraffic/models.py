from pydantic import BaseModel, Field, model_validator, ConfigDict, ValidationError
from typing import Any
from typing import Optional
from datetime import datetime, timezone


class ShipModel(BaseModel):
    mmsi: int = Field(alias="UserID")
    imo: Optional[int] = None
    name: Optional[str] = Field(None, alias="Name")

    dimension_to_bow: Optional[int] = None
    dimension_to_stern: Optional[int] = None
    dimension_to_port: Optional[int] = None
    dimension_to_starboard: Optional[int] = None

    length = dimension_to_starboard + dimension_to_port
    width = dimension_to_bow + dimension_to_stern

    call_sign: Optional[str] = None
    ship_type: Optional[int] = None
    max_draught: Optional[float] = None

    model_config = ConfigDict(populate_by_name=True)

    @model_validator(mode='before')
    @classmethod
    def flatten_dimensions(cls, data: Any) -> Any:
        if isinstance(data, dict):
            dim = data.get("Dimension", {})
            if dim:
                data["dimension_to_bow"] = dim.get("A")
                data["dimension_to_stern"] = dim.get("B")
                data["dimension_to_port"] = dim.get("C")
                data["dimension_to_starboard"] = dim.get("D")
        return data
    

class SarAircraftModel(BaseModel):
    mmsi: int
    name: Optional[str] = None
    equipment_type: Optional[int] = None


class AidToNavigationModel(BaseModel):
    mmsi: int = Field(alias="UserID")
    name: Optional[str] = None
    aton_type: Optional[int] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    is_virtual: Optional[bool] = None
    is_off_position: Optional[bool] = None


class VoyageModel(BaseModel):
    mmsi: int = Field(alias="UserID")
    
    destination: Optional[str] = Field(None, alias="Destination")
    draught: Optional[float] = Field(None, alias="MaximumStaticDraught")
    
    departure_port: Optional[str] = None 
    
    eta: Optional[datetime] = None

    model_config = ConfigDict(populate_by_name=True)

    @model_validator(mode='before')
    @classmethod
    def parse_eta(cls, data: Any) -> Any:
        if isinstance(data, dict):
            eta_raw = data.get("Eta")
            if isinstance(eta_raw, dict) and eta_raw.get("Month") != 0:
                try:
                    eta_month = eta_raw.get("Month", 1)
                    now = datetime.now(timezone.utc)
                    current_year = now.year
                    year = current_year if eta_month >= now.month else current_year + 1

                    data["eta"] = datetime(
                        year=year,
                        month=eta_month,
                        day=eta_raw.get("Day", 1),
                        hour=eta_raw.get("Hour", 0),
                        minute=eta_raw.get("Minute", 0),
                        tzinfo=timezone.utc
                    )
                except ValueError:
                    pass
        return data


class BaseStationModel(BaseModel):
    mmsi: int
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class MarineAlertModel(BaseModel):
    mmsi: int
    entity_type: Optional[str] = None
    alert_type: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    alert_text: Optional[str] = None
    timestamp: Optional[datetime] = None
    is_resolved: Optional[bool] = None


class ShipPositionModel(BaseModel):
    mmsi: int = Field(alias="UserID")

    latitude: Optional[float] = Field(None, alias="Latitude")
    longitude: Optional[float] = Field(None, alias="Longitude")
    sog: Optional[float] = Field(None, alias="Sog")
    cog: Optional[float] = Field(None, alias="Cog")

    true_heading: Optional[int] = None
    nav_status: Optional[int] = None
    message_type: Optional[str] = None
    timestamp: Optional[datetime] = Field(default_factory=datetime.utcnow)

    model_config = ConfigDict(populate_by_name=True)


class SarAircraftPositionModel(BaseModel):
    mmsi: int
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    altitude: Optional[int] = None
    alt_from_baro: Optional[bool] = None
    sog: Optional[float] = None
    cog: Optional[float] = None
    timestamp: Optional[datetime] = None