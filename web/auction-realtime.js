export function connectAuction(auctionId, token, { onMessage, onConnection, onExpired }) {
  const url = new URL("/ws", location.href);
  url.protocol = location.protocol === "https:" ? "wss:" : "ws:";
  let socket;
  let retry;
  let stopped = false;
  let delay = 1000;

  function connect() {
    socket = new WebSocket(url);
    socket.addEventListener("open", () => {
      socket.send(JSON.stringify({ type: "AUTHENTICATE", accessToken: token }));
    });
    socket.addEventListener("message", ({ data }) => {
      if (stopped) return;
      const event = JSON.parse(data);
      if (event.type === "AUTHENTICATED") {
        socket.send(JSON.stringify({ type: "SUBSCRIBE", auctionId }));
      } else if (event.type === "ERROR") {
        if (event.error.code === "INVALID_TOKEN") onExpired();
        else socket.close();
      } else if (event.auctionId === auctionId) {
        if (event.type === "SUBSCRIBED") {
          delay = 1000;
          onConnection(true);
        }
        onMessage(event.type);
      }
    });
    socket.addEventListener("close", () => {
      if (stopped) return;
      onConnection(false);
      retry = setTimeout(connect, delay);
      delay = Math.min(delay * 2, 15000);
    });
  }

  onConnection(false);
  connect();
  return () => {
    stopped = true;
    clearTimeout(retry);
    socket.close();
  };
}
