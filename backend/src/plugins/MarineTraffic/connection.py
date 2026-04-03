import asyncio
import websockets
import json
import logging

logger = logging.getLogger(__name__)


async def connect_ais_stream(api_key,
                             queue: asyncio.Queue,
                             bounding_boxes=[[[-90.0, -180.0], [90.0, 180.0]]], 
                             filter_message_types=None,
                             filters_ship_mmsi=None):
    try:
        logger.info("Connecting to AIS Stream...")
        async with websockets.connect("wss://stream.aisstream.io/v0/stream") as websocket:
            subscribe_message = {
                "APIKey": api_key,
                "BoundingBoxes": bounding_boxes,
            }

            if filter_message_types:
                subscribe_message["FilterMessageTypes"] = filter_message_types
            if filters_ship_mmsi:
                subscribe_message["FiltersShipMMSI"] = filters_ship_mmsi

            await websocket.send(json.dumps(subscribe_message))
            logger.info("Subscribed to AIS Stream")

            async for message in websocket:
                await queue.put({
                    "source": "MarineTraffic",
                    "data": json.loads(message)
                })
    except websockets.exceptions.ConnectionClosed as e:
        logger.error(f"Error connecting to AIS Stream: {e}")
    except Exception as e:
        logger.error(f"Unexpected error: {e}")

