import asyncio
import logging
from plugins.MarineTraffic.processor import process_marine_traffic

logger = logging.getLogger(__name__)


async def process(queue: asyncio.Queue):
    while True:
        item = await queue.get()
        logger.info(f"Got item from queue: source={item.get('source')}")

        if item["source"] == "MarineTraffic":
            await process_marine_traffic(item["data"])
        
        queue.task_done()
