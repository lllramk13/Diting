"""message = json.loads(message)
                message_type = message['MessageType']
                
                if message_type == "PositionReport":
                    ais_message = message['Message']['PositionReport']
                    print(f"[{datetime.now(timezone.utc)}] ShipId: {ais_message['UserID']} Latitude: {ais_message['Latitude']} Longitude: {ais_message['Longitude']}")
"""