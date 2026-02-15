type WsHandler = (msg: any) => void;

export class BotWsClient {
  private url: string;
  private ws: WebSocket | null = null;
  private handlers = new Set<WsHandler>();
  private stopped = false;
  private retry = 0;

  constructor(url: string) {
    this.url = url;
  }

  subscribe(handler: WsHandler) {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  start() {
    this.stopped = false;
    this.connect();
  }

  stop() {
    this.stopped = true;
    try {
      this.ws?.close();
    } catch {}
    this.ws = null;
  }

  private connect() {
    if (this.stopped) return;

    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      this.retry = 0;
    };

    this.ws.onmessage = (evt) => {
      let data: any = evt.data;
      try {
        data = JSON.parse(evt.data);
      } catch {}
      for (const h of this.handlers) h(data);
    };

    this.ws.onclose = () => {
      this.ws = null;
      if (this.stopped) return;

      const delay = Math.min(10_000, 500 * Math.pow(2, this.retry++)); // exponential up to 10s
      window.setTimeout(() => this.connect(), delay);
    };

    this.ws.onerror = () => {
      // let onclose handle reconnect
      try {
        this.ws?.close();
      } catch {}
    };
  }
}

export function makeWsUrl(path = "/api/ws") {
  const apiBase = import.meta.env.VITE_API_BASE ?? "http://localhost:8000/api";
  // Convert http(s)://host/api -> ws(s)://host/api/ws
  const u = new URL(apiBase);
  u.protocol = u.protocol === "https:" ? "wss:" : "ws:";
  // apiBase already ends with /api typically, but makeWsUrl takes path
  u.pathname = path.startsWith("/") ? path : `/${path}`;
  u.search = "";
  return u.toString();
}
