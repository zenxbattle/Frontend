import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ChallengeDocument, LeaderboardEntry } from "@/api/challengeTypes";
import {
  closeWS,
  CURRENT_LEADERBOARD,
  CREATOR_ABANDON,
  getWS,
  JOIN_CHALLENGE,
  LEADERBOARD_UPDATE,
  NEW_SUBMISSION,
  OWNER_JOINED,
  OWNER_LEFT,
  PING_SERVER,
  RETRIEVE_CHALLENGE,
  USER_JOINED,
  USER_LEFT,
} from "@/lib/ws";

type WsResponse = {
  type?: string;
  status?: string;
  success?: boolean;
  message?: string;
  error?: string | { message?: string; code?: string };
  payload?: Record<string, any>;
  leaderboard?: LeaderboardEntry[];
};

export type LiveChallengeEvent = {
  id: number;
  type: string;
  message: string;
  createdAt: number;
};

interface UseChallengeWebSocketProps {
  userProfile: { userId?: string } | undefined;
  challengeid?: string;
  password?: string;
  accessToken?: string;
  setParticipantIds: React.Dispatch<React.SetStateAction<string[]>>;
  setProblemIds: React.Dispatch<React.SetStateAction<string[]>>;
  setAbandonOverlay: React.Dispatch<React.SetStateAction<{ visible: boolean; countdown: number }>>;
}

const buildWsUrl = () => {
  if (import.meta.env.VITE_CHALLENGE_WS_URL) {
    return import.meta.env.VITE_CHALLENGE_WS_URL;
  }

  if (typeof window !== "undefined") {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.hostname}:7777/ws`;
  }

  return "ws://localhost:7777/ws";
};

const getErrorMessage = (response: WsResponse) => {
  if (typeof response.error === "string") {
    return response.error;
  }

  return response.error?.message || response.message || "Unexpected challenge websocket error";
};

const formatEventMessage = (type: string, payload?: Record<string, any>) => {
  switch (type) {
    case USER_JOINED:
      return `${payload?.userId || "A participant"} joined the room`;
    case USER_LEFT:
      return `${payload?.userId || "A participant"} left the room`;
    case OWNER_JOINED:
      return `${payload?.userId || "The host"} joined the room`;
    case OWNER_LEFT:
      return `${payload?.userId || "The host"} left the room`;
    case NEW_SUBMISSION:
      return `${payload?.userId || "A participant"} solved ${payload?.problemId || "a problem"} for ${payload?.score || 0} pts`;
    case LEADERBOARD_UPDATE:
      return `Leaderboard updated`;
    case CREATOR_ABANDON:
      return `The creator abandoned the challenge`;
    default:
      return type;
  }
};

export const useChallengeWebSocket = ({
  userProfile,
  challengeid,
  password,
  accessToken,
  setParticipantIds,
  setProblemIds,
  setAbandonOverlay,
}: UseChallengeWebSocketProps) => {
  const wsRef = useRef<WebSocket | null>(null);
  const pingSentAtRef = useRef(0);
  const challengeTokenRef = useRef<string>("");
  const followUpRefreshTimeoutRef = useRef<number | null>(null);

  const [wsStatus, setWsStatus] = useState("Connecting");
  const [challenge, setChallenge] = useState<ChallengeDocument | null>(null);
  const [err, setError] = useState<string>();
  const [latency, setLatency] = useState<number | null>(null);
  const [liveEvents, setLiveEvents] = useState<LiveChallengeEvent[]>([]);

  const wsUrl = useMemo(() => buildWsUrl(), []);

  const appendEvent = useCallback((type: string, payload?: Record<string, any>) => {
    setLiveEvents((prev) => [
      {
        id: Date.now() + Math.floor(Math.random() * 1000),
        type,
        message: formatEventMessage(type, payload),
        createdAt: Date.now(),
      },
      ...prev.slice(0, 24),
    ]);
  }, []);

  const syncChallengeState = useCallback((nextChallenge?: ChallengeDocument | null) => {
    if (!nextChallenge) {
      return;
    }

    setChallenge(nextChallenge);
    setParticipantIds(Object.keys(nextChallenge.participants || {}));
    setProblemIds(nextChallenge.processedProblemIds || []);
  }, [setParticipantIds, setProblemIds]);

  const sendEvent = useCallback((type: string, payload: Record<string, any>, cb?: () => void) => {
    const socket = wsRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return;
    }

    socket.send(JSON.stringify({ type, payload }));
    cb?.();
  }, []);

  const requestLeaderboard = useCallback(() => {
    if (!userProfile?.userId || !challengeid || !challengeTokenRef.current) {
      return;
    }

    sendEvent(CURRENT_LEADERBOARD, {
      userId: userProfile.userId,
      challengeId: challengeid,
      challengeToken: challengeTokenRef.current,
      limit: 50,
    });
  }, [challengeid, sendEvent, userProfile?.userId]);

  const sendRefetchChallenge = useCallback(() => {
    if (!userProfile?.userId || !challengeid || !challengeTokenRef.current) {
      return;
    }

    sendEvent(RETRIEVE_CHALLENGE, {
      userId: userProfile.userId,
      challengeId: challengeid,
      challengeToken: challengeTokenRef.current,
    });
  }, [challengeid, sendEvent, userProfile?.userId]);

  const queueFollowUpSync = useCallback(() => {
    if (followUpRefreshTimeoutRef.current) {
      window.clearTimeout(followUpRefreshTimeoutRef.current);
    }

    followUpRefreshTimeoutRef.current = window.setTimeout(() => {
      sendRefetchChallenge();
      requestLeaderboard();
      followUpRefreshTimeoutRef.current = null;
    }, 150);
  }, [requestLeaderboard, sendRefetchChallenge]);

  useEffect(() => {
    if (!userProfile?.userId || !accessToken || !challengeid) {
      setWsStatus("Connecting");
      return;
    }

    const socket = getWS(wsUrl);
    wsRef.current = socket;

    const handleOpen = () => {
      setWsStatus("Open");
      setError(undefined);

      sendEvent(JOIN_CHALLENGE, {
        userId: userProfile.userId,
        challengeId: challengeid,
        password: password || "",
        token: `Bearer ${accessToken}`,
      });
    };

    const handleMessage = (event: MessageEvent) => {
      try {
        const response: WsResponse = JSON.parse(event.data);
        if (!response?.type) {
          return;
        }

        if (response.type === PING_SERVER) {
          setLatency(Date.now() - pingSentAtRef.current);
          return;
        }

        if (response.type === JOIN_CHALLENGE) {
          if (response.status === "success" && response.payload?.challenge) {
            challengeTokenRef.current = response.payload.challengeToken || "";
            syncChallengeState(response.payload.challenge as ChallengeDocument);
            appendEvent(JOIN_CHALLENGE, response.payload);
            requestLeaderboard();
            return;
          }

          const message = getErrorMessage(response);
          setError(message);
          toast.error(message);
          return;
        }

        if (response.type === RETRIEVE_CHALLENGE) {
          if (response.status === "ok" && response.payload?.challenge) {
            syncChallengeState(response.payload.challenge as ChallengeDocument);
            return;
          }

          const message = getErrorMessage(response);
          setError(message);
          return;
        }

        if (response.type === CURRENT_LEADERBOARD) {
          const entries = response.leaderboard || response.payload?.leaderboard || [];
          setChallenge((prev) => (prev ? { ...prev, leaderboard: entries } : prev));
          return;
        }

        if (response.type === LEADERBOARD_UPDATE) {
          const payload = response.payload || {};
          setChallenge((prev) =>
            prev ? { ...prev, leaderboard: payload.leaderboard || [] } : prev
          );
          appendEvent(response.type, payload);
          return;
        }

        if (response.type === NEW_SUBMISSION) {
          appendEvent(response.type, response.payload);
          queueFollowUpSync();
          return;
        }

        if (
          response.type === USER_JOINED ||
          response.type === USER_LEFT ||
          response.type === OWNER_JOINED ||
          response.type === OWNER_LEFT
        ) {
          appendEvent(response.type, response.payload);
          queueFollowUpSync();
          return;
        }

        if (response.type === CREATOR_ABANDON) {
          appendEvent(response.type, response.payload);
          setAbandonOverlay({ visible: true, countdown: 5 });
        }
      } catch (messageError) {
        const parseMessage =
          messageError instanceof Error ? messageError.message : "Invalid websocket message";
        setError(parseMessage);
      }
    };

    const handleError = () => setWsStatus("Error");
    const handleClose = () => setWsStatus("Closed");

    socket.addEventListener("open", handleOpen);
    socket.addEventListener("message", handleMessage);
    socket.addEventListener("error", handleError);
    socket.addEventListener("close", handleClose);

    const pingInterval = window.setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        pingSentAtRef.current = Date.now();
        sendEvent(PING_SERVER, {});
      }
    }, 3000);

    return () => {
      window.clearInterval(pingInterval);
      if (followUpRefreshTimeoutRef.current) {
        window.clearTimeout(followUpRefreshTimeoutRef.current);
      }
      socket.removeEventListener("open", handleOpen);
      socket.removeEventListener("message", handleMessage);
      socket.removeEventListener("error", handleError);
      socket.removeEventListener("close", handleClose);
      closeWS();
    };
  }, [
    accessToken,
    appendEvent,
    challengeid,
    password,
    queueFollowUpSync,
    requestLeaderboard,
    sendEvent,
    setAbandonOverlay,
    syncChallengeState,
    userProfile?.userId,
    wsUrl,
  ]);

  return {
    wsStatus,
    challenge,
    err,
    latency,
    liveEvents,
    sendRefetchChallenge,
    requestLeaderboard,
  };
};
