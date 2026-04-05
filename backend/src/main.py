import asyncio
import websockets
import json
from datetime import datetime, timezone
import os
from dotenv import load_dotenv
from pathlib import Path
import logging
from processor import process

from plugins.MarineTraffic.connection import connect_ais_stream
import asyncpg


async def main(api_key):
    queue = asyncio.Queue()
    db_pool = await asyncpg.create_pool("postgresql://{}:{}@/{}".format(
        api_key["db_user"],
        api_key["db_password"],
        # api_key["db_host"],
        # api_key["db_port"],
        api_key["db_name"]
    ))
    # postgresql://{}:{}@{}:{}/{} for win testing

    
    await asyncio.gather(
        connect_ais_stream(api_key["marine_traffic_api_key"], queue),
        process(queue, db_pool),
    )


if __name__ == "__main__":
    logger = logging.getLogger(__name__)
    logging.basicConfig(level=logging.INFO,
                        format='%(asctime)s [%(levelname)s] %(message)s',
                        handlers=[
                            logging.StreamHandler()
                       ])
    
    env_path = Path(__file__).parent.parent / ".env"
    load_dotenv(dotenv_path=env_path)
    config = {
        "marine_traffic_api_key": os.getenv("MARINE_TRAFFIC_API_KEY"),
        "db_host": os.getenv("DB_HOST"),
        "db_port": os.getenv("DB_PORT"),
        "db_name": os.getenv("DB_NAME"),
        "db_user": os.getenv("DB_USER"),
        "db_password": os.getenv("DB_PASSWORD"),
    }

    missing = [k for k, v in config.items() if not v]

    if missing:
        for key in missing:
            logger.error(f"{key} missing.")
    else:
        asyncio.run(main(config))