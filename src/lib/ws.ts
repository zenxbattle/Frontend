let socket: WebSocket | null = null;
let socketUrl: string | null = null;

export const getWS = (url: string = "ws://localhost:7777/ws"): WebSocket => {
  const shouldReconnect =
    !socket ||
    socket.readyState === WebSocket.CLOSED ||
    socket.readyState === WebSocket.CLOSING ||
    socketUrl !== url;

  if (shouldReconnect) {
    if (socket && socket.readyState === WebSocket.OPEN && socketUrl !== url) {
      socket.close();
    }
    socketUrl = url;
    socket = new WebSocket(url);
  }
  return socket;
};

export const closeWS = () => {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.close();
  }
  socket = null;
  socketUrl = null;
};

export const PING_SERVER = "PING_SERVER"

export const USER_JOINED = "USER_JOINED"
export const USER_LEFT = "USER_LEFT"
export const CREATOR_ABANDON = "CREATOR_ABANDON"
export const CHALLENGE_STARTED = "CHALLENGE_STARTED"
export const OWNER_LEFT = "OWNER_LEFT"
export const OWNER_JOINED = "OWNER_JOINED"
export const LEADERBOARD_UPDATE = "LEADERBOARD_UPDATE"
export const NEW_SUBMISSION = "NEW_SUBMISSION"

export const JOIN_CHALLENGE = "JOIN_CHALLENGE"
export const RETRIEVE_CHALLENGE = "RETRIEVE_CHALLENGE"
export const CURRENT_LEADERBOARD = "CURRENT_LEADERBOARD"
