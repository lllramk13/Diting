from pydantic import BaseModel, Field, model_validator, ConfigDict, computed_field
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
    
    @computed_field
    @property
    def length(self) -> Optional[int]:
        if self.dimension_to_bow is not None and self.dimension_to_stern is not None:
            return self.dimension_to_bow + self.dimension_to_stern
        return None

    @computed_field
    @property
    def width(self) -> Optional[int]:
        if self.dimension_to_port is not None and self.dimension_to_starboard is not None:
            return self.dimension_to_port + self.dimension_to_starboard
        return None
    

class SarAircraftModel(BaseModel):
    mmsi: int = Field(alias="UserID")
    name: Optional[str] = Field(None, alias="Name")
    equipment_type: Optional[int] = None

    model_config = ConfigDict(populate_by_name=True)


class AidToNavigationModel(BaseModel):
    mmsi: int = Field(alias="UserID")
    name: Optional[str] = Field(None, alias="Name")
    aton_type: Optional[int] = None
    latitude: Optional[float] = Field(None, alias="Latitude")
    longitude: Optional[float] = Field(None, alias="Longitude")
    is_virtual: Optional[bool] = None
    is_off_position: Optional[bool] = None

    model_config = ConfigDict(populate_by_name=True)


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
    mmsi: int = Field(alias="UserID")
    latitude: Optional[float] = Field(alias="Latitude")
    longitude: Optional[float] = Field(alias="Longitude")

    model_config = ConfigDict(populate_by_name=True)


class MarineAlertModel(BaseModel):
    mmsi: int = Field(alias="UserID")
    entity_type: Optional[str] = None
    alert_type: Optional[str] = None
    latitude: Optional[float] = Field(alias="Latitude")
    longitude: Optional[float] = Field(alias="Longitude")
    alert_text: Optional[str] = None
    timestamp: Optional[datetime] = None
    is_resolved: Optional[bool] = None

    model_config = ConfigDict(populate_by_name=True)


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
    mmsi: int = Field(alias="UserID")
    
    latitude: float = Field(alias="Latitude")
    longitude: float = Field(alias="Longitude")
    sog: float = Field(alias="SOG")
    cog: float = Field(alias="COG")
    
    altitude: int = Field(alias="Altitude")
    alt_from_baro: bool = Field(alias="AltFromBaro")
    
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    model_config = ConfigDict(populate_by_name=True)