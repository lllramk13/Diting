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


async def process_marine_traffic(data: dict, db_pool):
    message_type = data.get("MessageType")
    ModelClass = MARINE_ROUTER.get(message_type)        

    if ModelClass:
        try:
            payload = data["Message"][message_type]
            for model in ModelClass:
                parsed = model(**payload)
                logger.info(f"Parsed {model.__name__}: MMSI {parsed.mmsi}")

                if model == ShipModel:
                    await save_ship(db_pool, parsed)
                elif model == VoyageModel:
                    await save_voyage(db_pool, parsed)
                elif model == ShipPositionModel:
                    await save_ship_position(db_pool, parsed)
                elif model == SarAircraftPositionModel:
                    await save_sar_aircraft_position(db_pool, parsed)
                elif model == MarineAlertModel:
                    await save_marine_alert(db_pool, parsed)
                elif model == AidToNavigationModel:
                    await save_aid_to_navigation(db_pool, parsed)
                elif model == BaseStationModel:
                    await save_base_station(db_pool, parsed)

        except ValidationError as e:
            logger.error(f"Dirty data: {e}")
        except KeyError as e:
            logger.error(f"Missing payload: {e}")
        except Exception as e:
            logger.error(f"Unexpected error in process_marine_traffic: {type(e).__name__}: {e}")

    else:
        pass