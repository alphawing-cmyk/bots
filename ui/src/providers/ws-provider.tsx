import * as React from "react";
import useWebSocket, { ReadyState, type Options } from "react-use-websocket";

type WsMessage = any;

type WsContextValue = {
  lastMessage: WsMessage | null;
  sendJson: (data: any) => void;
  readyState: ReadyState;
  status: "connecting" | "open" | "closing" | "closed";
};

const WsContext = React.createContext<WsContextValue | null>(null);

function wsStatus(rs: ReadyState): WsContextValue["status"] {
  switch (rs) {
    case ReadyState.OPEN:
      return "open";
    case ReadyState.CONNECTING:
      return "connecting";
    case ReadyState.CLOSING:
      return "closing";
    case ReadyState.CLOSED:
    default:
      return "closed";
  }
}

function makeWsUrl(path: string) {
  const apiBase = import.meta.env.VITE_API_BASE ?? "http://localhost:8001/api";
  const url = new URL(apiBase);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  const basePath = url.pathname.replace(/\/$/, "");
  url.pathname = `${basePath}${path.startsWith("/") ? path : `/${path}`}`;
  url.search = "";
  return url.toString();
}

// Singleton pattern to ensure only one WebSocket connection
let sharedWebSocket: { url: string; options: Options } | null = null;

export function WsProvider({ children }: { children: React.ReactNode }) {
  const socketUrl = React.useMemo(() => makeWsUrl("/ws"), []);
  
  // Use a ref to track if this is the first mount
  const isFirstMount = React.useRef(true);

  // Memoize options to prevent unnecessary re-renders
  const options = React.useMemo<Options>(
    () => ({
      shouldReconnect: () => true,
      reconnectAttempts: 10,
      reconnectInterval: 1000,
      share: true,
      onMessage: (event) =>{
        console.log(`Received Message: ${event.data}`);
      },
      onError: (event) => {
        console.error("WebSocket error:", event);
      },
      // Add connection logging (optional)
      onOpen: () => {
        console.log("WebSocket connection established");
      },
      onClose: () => {
        console.log("WebSocket connection closed");
      },
    }),
    []
  );

  // Only create the WebSocket connection if it's the first mount
  // or if the URL/options have changed
  const shouldConnect = React.useMemo(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return true;
    }
    
    // Check if we already have a shared connection with different params
    if (sharedWebSocket) {
      const isSameConnection = 
        sharedWebSocket.url === socketUrl && 
        JSON.stringify(sharedWebSocket.options) === JSON.stringify(options);
      
      if (!isSameConnection) {
        console.warn("WebSocket configuration changed, reconnecting...");
        return true;
      }
      
      return false;
    }
    
    return true;
  }, [socketUrl, options]);

  // Conditionally use the WebSocket hook
  const { lastJsonMessage, sendJsonMessage, readyState } = useWebSocket(
    shouldConnect ? socketUrl : null, // Pass null to prevent connection
    options,
    shouldConnect // Only enable when shouldConnect is true
  );

  // Update shared connection info when connected
  React.useEffect(() => {
    if (readyState === ReadyState.OPEN) {
      sharedWebSocket = { url: socketUrl, options };
    }
  }, [readyState, socketUrl, options]);

  // Clean up shared reference on unmount
  React.useEffect(() => {
    return () => {
      // Only clear if this provider was the one that created the connection
      if (sharedWebSocket?.url === socketUrl) {
        sharedWebSocket = null;
      }
    };
  }, [socketUrl]);

  const value = React.useMemo<WsContextValue>(
    () => ({
      lastMessage: (lastJsonMessage ?? null) as WsMessage | null,
      sendJson: sendJsonMessage,
      readyState,
      status: wsStatus(readyState),
    }),
    [lastJsonMessage, sendJsonMessage, readyState],
  );

  return <WsContext.Provider value={value}>{children}</WsContext.Provider>;
}

export function useWs() {
  const ctx = React.useContext(WsContext);
  if (!ctx) throw new Error("useWs must be used within WsProvider");
  return ctx;
}