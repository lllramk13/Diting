import asyncio
import websockets
import json
from datetime import datetime, timezone
import os
from dotenv import load_dotenv


async def connect_ais_stream(api_key, bounding_boxes=[[[43.0, -80.0], [44.0, -78.0]]], 
                             filter_message_types=["PositionReport"], filters_ship_mmsi=None):
    try:
        print(f"[*] 正在接入全球航运主干网 ...")
        async with websockets.connect("wss://stream.aisstream.io/v0/stream") as websocket:
            # send authentication message
            auth_message = {
                "APIKey": api_key,
                "BoundingBoxes": bounding_boxes, # list of bounding boxes
                "FiltersShipMMSI": filters_ship_mmsi, # optional list of MMSI numbers to filter by
                "FilterMessageTypes": filter_message_types # only receive specified message types
            }
            auth_message_json = json.dumps(auth_message)
            await websocket.send(auth_message_json)

            async for message in websocket:
                message = json.loads(message)
                message_type = message['MessageType']
                
                if message_type == "PositionReport":
                    ais_message = message['Message']['PositionReport']
                    print(f"[{datetime.now(timezone.utc)}] ShipId: {ais_message['UserID']} Latitude: {ais_message['Latitude']} Longitude: {ais_message['Longitude']}")
    
    except websockets.exceptions.ConnectionClosed as e:
        print(f"\n[!] 谛听警告：被服务器强行踢下线！原因: {e}")
    except Exception as e:
        print(f"\n[!] 系统崩溃: {e}")

if __name__ == "__main__":
    load_dotenv()
    api_key = os.getenv("MARINE_TRAFFIC_API_KEY")
    if not api_key:
        print("[!] 错误: MARINE_TRAFFIC_API_KEY 环境变量为空。")
    else:
        asyncio.run(connect_ais_stream(api_key))