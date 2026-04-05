import asyncpg
from .models import (
    ShipModel,
    VoyageModel,
    ShipPositionModel,
    SarAircraftPositionModel,
    MarineAlertModel,
    AidToNavigationModel,
    BaseStationModel
)
import logging

logger = logging.getLogger(__name__)


async def save_ship(pool: asyncpg.Pool, ship: ShipModel):
    sql = """
        INSERT INTO ships (
            mmsi, name, imo, call_sign, ship_type, 
            dimension_to_bow, dimension_to_stern, 
            dimension_to_port, dimension_to_starboard, max_draught
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (mmsi) DO UPDATE SET
            name = EXCLUDED.name,
            imo = EXCLUDED.imo,
            call_sign = EXCLUDED.call_sign,
            ship_type = EXCLUDED.ship_type,
            dimension_to_bow = EXCLUDED.dimension_to_bow,
            dimension_to_stern = EXCLUDED.dimension_to_stern,
            dimension_to_port = EXCLUDED.dimension_to_port,
            dimension_to_starboard = EXCLUDED.dimension_to_starboard,
            max_draught = EXCLUDED.max_draught,
            last_updated = CURRENT_TIMESTAMP;
        """
    try:
        async with pool.acquire() as connection:
            await connection.execute(sql, 
                                     ship.mmsi,
                                     ship.name,
                                     ship.imo,
                                     ship.call_sign,
                                     ship.ship_type,
                                     ship.dimension_to_bow,
                                     ship.dimension_to_stern,
                                     ship.dimension_to_port,
                                     ship.dimension_to_starboard,
                                     ship.max_draught)
            logger.info(f"Saved ship data for MMSI {ship.mmsi}")
    except Exception as e:
        logger.error(f"Error saving ship data for MMSI {ship.mmsi}: {type(e).__name__}: {e}")


async def save_voyage(pool: asyncpg.Pool, voyage: VoyageModel):
    sql = """
        INSERT INTO voyage (mmsi, destination, eta, draught, is_active)
        VALUES ($1, $2, $3, $4, TRUE)
        ON CONFLICT (mmsi) WHERE (is_active = TRUE) 
        DO UPDATE SET 
            destination = EXCLUDED.destination,
            eta = EXCLUDED.eta,
            draught = EXCLUDED.draught,
            last_updated = CURRENT_TIMESTAMP;
        """
    try:
        async with pool.acquire() as connection:
            await connection.execute(sql, 
                                     voyage.mmsi,
                                     voyage.destination,
                                     voyage.eta,
                                     voyage.draught)
            logger.info(f"Saved voyage data for MMSI {voyage.mmsi}")
    except Exception as e:
        logger.error(f"Error saving voyage data for MMSI {voyage.mmsi}: {type(e).__name__}: {e}")


async def save_ship_position(pool: asyncpg.Pool, position: ShipPositionModel):
    sql = """
        INSERT INTO ship_positions (mmsi, location, sog, cog, true_heading, nav_status, message_type, timestamp)
        VALUES ($1, ST_SetSRID(ST_MakePoint($3, $2), 4326), $4, $5, $6, $7, $8, $9)
        """
    try:
        async with pool.acquire() as connection:
            await connection.execute(sql, 
                                     position.mmsi,
                                     position.latitude,
                                     position.longitude,
                                     position.sog,
                                     position.cog,
                                     position.true_heading,
                                     position.nav_status,
                                     position.message_type,
                                     position.timestamp)
            logger.info(f"Saved ship position for MMSI {position.mmsi}")
    except Exception as e:
        logger.error(f"Error saving ship position for MMSI {position.mmsi}: {type(e).__name__}: {e}")


async def save_sar_aircraft_position(pool: asyncpg.Pool, position: SarAircraftPositionModel):
    sql = """
        INSERT INTO sar_aircraft_positions (mmsi, location, altitude, alt_from_baro, sog, cog, timestamp)
        VALUES ($1, ST_SetSRID(ST_MakePoint($3, $2), 4326), $4, $5, $6, $7, $8)
        """
    try:
        async with pool.acquire() as connection:
            await connection.execute(sql, 
                                     position.mmsi,
                                     position.latitude,
                                     position.longitude,
                                     position.altitude,
                                     position.alt_from_baro,
                                     position.sog,
                                     position.cog,
                                     position.timestamp)
            logger.info(f"Saved SAR aircraft position for MMSI {position.mmsi}")
    except Exception as e:
        logger.error(f"Error saving SAR aircraft position for MMSI {position.mmsi}: {e}")


async def save_marine_alert(pool: asyncpg.Pool, alert: MarineAlertModel):
    sql = """
        INSERT INTO marine_alerts (mmsi, entity_type, alert_type, location, alert_text, timestamp, is_resolved)
        VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint($5, $4), 4326), $6, $7, $8)
        """
    try:
        async with pool.acquire() as connection:
            await connection.execute(sql, 
                                     alert.mmsi,
                                     alert.entity_type,
                                     alert.alert_type,
                                     alert.latitude,
                                     alert.longitude,
                                     alert.alert_text,
                                     alert.timestamp,
                                     alert.is_resolved)
            logger.info(f"Saved marine alert for MMSI {alert.mmsi}")
    except Exception as e:
        logger.error(f"Error saving marine alert for MMSI {alert.mmsi}: {type(e).__name__}: {e}")


async def save_aid_to_navigation(pool: asyncpg.Pool, aton: AidToNavigationModel):
    sql = """
        INSERT INTO aids_to_navigation (mmsi, name, location, aton_type, is_virtual, is_off_position)
        VALUES ($1, $2, ST_SetSRID(ST_MakePoint($4, $3), 4326), $5, $6, $7)
        """
    try:
        async with pool.acquire() as connection:
            await connection.execute(sql, 
                                     aton.mmsi,
                                     aton.name,
                                     aton.latitude,
                                     aton.longitude,
                                     aton.aton_type,
                                     aton.is_virtual,
                                     aton.is_off_position)
            logger.info(f"Saved aid to navigation for MMSI {aton.mmsi}")
    except Exception as e:
        logger.error(f"Error saving aid to navigation for MMSI {aton.mmsi}: {type(e).__name__}: {e}")


async def save_base_station(pool: asyncpg.Pool, station: BaseStationModel):
    sql = """
        INSERT INTO base_stations (mmsi, location)
        VALUES ($1, ST_SetSRID(ST_MakePoint($3, $2), 4326))
        ON CONFLICT (mmsi) DO UPDATE SET
            location = EXCLUDED.location,
            last_updated = CURRENT_TIMESTAMP;
        """
    try:
        async with pool.acquire() as connection:
            await connection.execute(sql, 
                                     station.mmsi,
                                     station.latitude,
                                     station.longitude)
            logger.info(f"Saved base station for MMSI {station.mmsi}")
    except Exception as e:
        logger.error(f"Error saving base station for MMSI {station.mmsi}: {type(e).__name__}: {e}")
