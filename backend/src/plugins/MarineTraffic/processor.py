from .models import *
from pydantic import ValidationError
from .repository import *
import logging

logger = logging.getLogger(__name__)

MARINE_ROUTER = {
    "PositionReport": [ShipPositionModel],
    "StandardClassBPositionReport": [ShipPositionModel],
    "LongRangeAisBroadcastMessage": [ShipPositionModel],

    "ShipStaticData": [ShipModel, VoyageModel],
    "StaticDataReport": [ShipModel], 

    "StandardSearchAndRescueAircraftReport": [SarAircraftPositionModel],
    "SafetyBroadcastMessage": [MarineAlertModel],
    "AidsToNavigationReport": [AidToNavigationModel],
    "BaseStationReport": [BaseStationModel]
}


async def process_marine_traffic(data: dict):
    message_type = data.get("MessageType")
    ModelClass = MARINE_ROUTER.get(message_type)        

    if ModelClass:
        try:
            payload = data["Message"][message_type]
            for model in ModelClass:
                parsed = model(**payload)
                print(parsed)
                logger.info(f"Parsed {model.__name__}: MMSI {parsed.mmsi}")

                if model == ShipModel:
                    await save_ship(parsed)
                elif model == VoyageModel:
                    await save_voyage(parsed)
                elif model == ShipPositionModel:
                    await save_ship_position(parsed)
                elif model == SarAircraftPositionModel:
                    await save_sar_aircraft_position(parsed)
                elif model == MarineAlertModel:
                    await save_marine_alert(parsed)
                elif model == AidToNavigationModel:
                    await save_aid_to_navigation(parsed)
                elif model == BaseStationModel:
                    await save_base_station(parsed)

        except ValidationError as e:
            logger.error(f"Dirty data: {e}")
        except KeyError as e:
            logger.error(f"Missing payload: {e}")
        except Exception as e:
            logger.error(f"Unexpected error in process_marine_traffic: {type(e).__name__}: {e}")

    else:
        pass