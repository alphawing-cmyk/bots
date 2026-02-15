import asyncio
import json
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import redis.asyncio as redis_async
from app.core.config import settings
from app.core.events import EVENT_CHANNEL

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(tags=["ws"])

@router.websocket("/ws")
async def ws_endpoint(ws: WebSocket):
    await ws.accept()
    logger.info("WebSocket connection accepted")
    
    r = None
    pubsub = None
    keepalive_task = None

    try:
        # Create Redis connection with proper error handling
        r = redis_async.Redis.from_url(
            settings.celery_broker_url, 
            decode_responses=True,
            retry_on_timeout=True,
            socket_keepalive=True
        )
        
        # Test Redis connection
        await r.ping()
        
        pubsub = r.pubsub()
        await pubsub.subscribe(EVENT_CHANNEL)
        logger.info(f"Subscribed to Redis channel: {EVENT_CHANNEL}")

        # Send a hello so client knows we're connected
        await ws.send_json({
            "type": "hello", 
            "channel": EVENT_CHANNEL,
            "status": "connected"
        })

        # Create keepalive task to detect disconnections
        async def send_keepalive():
            try:
                while True:
                    await asyncio.sleep(25)  # Send ping every 25 seconds
                    try:
                        await ws.send_json({"type": "ping"})
                    except (WebSocketDisconnect, RuntimeError, ConnectionError):
                        logger.debug("WebSocket disconnected, stopping keepalive")
                        break
            except asyncio.CancelledError:
                logger.debug("Keepalive task cancelled")
                raise
            except Exception as e:
                logger.error(f"Keepalive error: {e}")

        keepalive_task = asyncio.create_task(send_keepalive())

        # Main message loop
        while True:
            try:
                # Check for client messages with timeout
                try:
                    client_msg = await asyncio.wait_for(
                        ws.receive_text(), 
                        timeout=0.1
                    )
                    # Handle client messages if needed
                    logger.debug(f"Received client message: {client_msg[:100]}")
                except asyncio.TimeoutError:
                    pass  # No client message, continue to Redis
                except WebSocketDisconnect:
                    logger.info("Client disconnected")
                    break

                # Check Redis messages with timeout
                try:
                    msg = await pubsub.get_message(
                        ignore_subscribe_messages=True, 
                        timeout=0.1
                    )
                    
                    if msg and msg.get("type") == "message":
                        data = msg.get("data")
                        try:
                            # Try to parse as JSON
                            payload = json.loads(data)
                            await ws.send_json(payload)
                            logger.debug(f"Sent Redis message: {type(payload)}")
                        except json.JSONDecodeError:
                            # Send as raw data if not JSON
                            await ws.send_json({
                                "type": "raw", 
                                "data": data,
                                "channel": msg.get("channel")
                            })
                        except Exception as e:
                            logger.error(f"Error sending message: {e}")
                            
                except asyncio.TimeoutError:
                    continue  # No Redis message, continue loop
                except redis_async.ConnectionError as e:
                    logger.error(f"Redis connection error: {e}")
                    # Try to reconnect Redis
                    try:
                        await r.ping()
                    except:
                        logger.error("Redis connection lost, attempting to reconnect...")
                        # Recreate Redis connection
                        if r:
                            await r.close()
                        r = redis_async.Redis.from_url(
                            settings.celery_broker_url, 
                            decode_responses=True
                        )
                        pubsub = r.pubsub()
                        await pubsub.subscribe(EVENT_CHANNEL)
                        logger.info("Redis reconnected and resubscribed")
                    continue
                    
            except WebSocketDisconnect:
                logger.info("WebSocket disconnected by client")
                break
            except asyncio.CancelledError:
                logger.info("WebSocket task cancelled (likely backend reload)")
                break
            except Exception as e:
                logger.error(f"Unexpected error in WebSocket loop: {e}")
                # Don't break immediately on unexpected errors, try to continue
                await asyncio.sleep(1)
                continue

    except WebSocketDisconnect:
        logger.info("WebSocket disconnected")
    except asyncio.CancelledError:
        logger.info("WebSocket task cancelled (backend reloading)")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        # Clean up tasks
        logger.info("Cleaning up WebSocket connection")
        
        # Cancel keepalive task
        if keepalive_task and not keepalive_task.done():
            keepalive_task.cancel()
            try:
                await keepalive_task
            except (asyncio.CancelledError, Exception):
                pass
        
        # Clean up Redis pubsub
        if pubsub:
            try:
                # Use asyncio.shield to prevent cancellation during cleanup
                await asyncio.shield(pubsub.unsubscribe(EVENT_CHANNEL))
                await asyncio.shield(pubsub.close())
                logger.info("Redis pubsub closed")
            except (asyncio.CancelledError, Exception) as e:
                logger.error(f"Error closing pubsub: {e}")
        
        # Clean up Redis client
        if r:
            try:
                await asyncio.shield(r.close())
                logger.info("Redis client closed")
            except (asyncio.CancelledError, Exception) as e:
                logger.error(f"Error closing Redis client: {e}")
        
        # Close WebSocket if still open
        try:
            await ws.close()
        except (RuntimeError, Exception):
            pass
        
        logger.info("WebSocket connection cleaned up")