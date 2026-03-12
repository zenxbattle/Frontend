import { useEffect, useMemo, useState } from "react";
import Cookies from "js-cookie";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Clock3, Copy, Loader2, RefreshCw, Shield, Signal, Swords, Users } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import MainNavbar from "@/components/common/MainNavbar";
import EventFeed from "@/components/challenges/EventFeed";
import LeaderboardCard from "@/components/challenges/LeaderboardCard";
import ProblemListing from "./BulkMetaDataProblemListing";
import { useAuth } from "@/hooks/useAuth";
import { useGetUserProfile } from "@/services/useGetUserProfile";
import { useGetUserProfileMetadataBulk } from "@/services/useGetUserProfileMetadataBulk";
import { useChallengeWebSocket } from "@/services/useChallengeWebsocket";
import { useGetBulkProblemMetadata } from "@/services/useGetBulkProblemMetadata";
import bgGradient from "@/assets/challengegradient.png";
import avatarIcon from "@/assets/avatar.png";

const formatCountdown = (seconds: number) => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (days > 0) {
    return `${days}d ${hours.toString().padStart(2, "0")}h ${minutes.toString().padStart(2, "0")}m`;
  }

  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

const formatChallengeStatus = (status?: string) => {
  switch (status) {
    case "CHALLENGEOPEN":
      return "Open";
    case "CHALLENGESTARTED":
      return "Started";
    case "CHALLENGEENDED":
      return "Ended";
    case "CHALLENGEABANDON":
      return "Abandoned";
    case "CHALLENGEFORFIETED":
      return "Forfeited";
    default:
      return status || "Unknown";
  }
};

const statusClassName = (status?: string) => {
  switch (status) {
    case "CHALLENGEOPEN":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
    case "CHALLENGESTARTED":
      return "border-sky-500/30 bg-sky-500/10 text-sky-300";
    case "CHALLENGEENDED":
      return "border-zinc-500/30 bg-zinc-500/10 text-zinc-300";
    case "CHALLENGEABANDON":
      return "border-rose-500/30 bg-rose-500/10 text-rose-300";
    default:
      return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  }
};

const JoinChallenge = () => {
  const { challengeid, password } = useParams<{ challengeid: string; password?: string }>();
  const navigate = useNavigate();
  const accessToken = Cookies.get("accessToken");
  const { isAuthenticated } = useAuth();
  const { data: userProfile } = useGetUserProfile();

  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [problemIds, setProblemIds] = useState<string[]>([]);
  const [countdown, setCountdown] = useState(0);
  const [abandonOverlay, setAbandonOverlay] = useState({ visible: false, countdown: 5 });

  const {
    wsStatus,
    challenge,
    err,
    latency,
    liveEvents,
    sendRefetchChallenge,
    requestLeaderboard,
  } = useChallengeWebSocket({
    userProfile,
    challengeid,
    password,
    accessToken,
    setParticipantIds,
    setProblemIds,
    setAbandonOverlay,
  });

  const { data: participantProfiles = [], isLoading: participantsLoading } =
    useGetUserProfileMetadataBulk(participantIds);
  const { data: problemsMetadata = [], isLoading: problemsLoading } =
    useGetBulkProblemMetadata(problemIds);

  useEffect(() => {
    if (!isAuthenticated) {
      toast.error("You must be logged in to join a challenge.");
      navigate("/login");
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (!challenge?.startTime || !challenge?.timeLimit) {
      setCountdown(0);
      return;
    }

    const endTime = challenge.startTime * 1000 + challenge.timeLimit;
    const tick = () => {
      setCountdown(Math.max(0, Math.floor((endTime - Date.now()) / 1000)));
    };

    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [challenge?.startTime, challenge?.timeLimit]);

  useEffect(() => {
    if (!abandonOverlay.visible) {
      return;
    }

    if (abandonOverlay.countdown <= 0) {
      navigate("/challenges");
      return;
    }

    const interval = window.setInterval(() => {
      setAbandonOverlay((prev) => ({ ...prev, countdown: prev.countdown - 1 }));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [abandonOverlay, navigate]);

  const participantMap = useMemo(
    () => Object.fromEntries(participantProfiles.map((profile) => [profile.userId, profile])),
    [participantProfiles]
  );

  const leaderboardMap = useMemo(
    () => Object.fromEntries((challenge?.leaderboard || []).map((entry) => [entry.userId, entry])),
    [challenge?.leaderboard]
  );

  const participants = useMemo(() => {
    const ids = Object.keys(challenge?.participants || {});

    return ids
      .map((userId) => {
        const metadata = challenge?.participants?.[userId];
        const profile = participantMap[userId];
        const leaderboardEntry = leaderboardMap[userId];

        return {
          userId,
          metadata,
          profile,
          rank: leaderboardEntry?.rank || Number.MAX_SAFE_INTEGER,
          score: leaderboardEntry?.totalScore ?? metadata?.totalScore ?? 0,
          solved: leaderboardEntry?.problemsCompleted ?? metadata?.problemsAttempted ?? 0,
        };
      })
      .sort((left, right) => {
        if (left.rank !== right.rank) {
          return left.rank - right.rank;
        }

        return right.score - left.score;
      });
  }, [challenge?.participants, leaderboardMap, participantMap]);

  const copyInviteLink = async () => {
    if (!challenge?.challengeId) {
      return;
    }

    const path = `/join-challenge/${challenge.challengeId}${challenge.password ? `/${challenge.password}` : ""}`;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${path}`);
      toast.success("Invite link copied");
    } catch {
      toast.error("Failed to copy invite link");
    }
  };

  const latencyTone =
    latency === null ? "text-zinc-400" : latency < 150 ? "text-emerald-400" : latency < 400 ? "text-amber-400" : "text-rose-400";

  return (
    <div
      className="min-h-screen text-white pt-16 pb-8"
      style={{
        backgroundImage: `linear-gradient(rgba(0,0,0,0.94), rgba(0,0,0,0.65)), url(${bgGradient})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <MainNavbar />

      <main className="page-container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <Button
              variant="ghost"
              className="px-0 text-zinc-300 hover:text-white hover:bg-transparent"
              onClick={() => navigate("/challenges")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to challenges
            </Button>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">
                {challenge?.title || "Connecting to challenge..."}
              </h1>
              <Badge className={statusClassName(challenge?.status)}>
                {formatChallengeStatus(challenge?.status)}
              </Badge>
              {challenge?.isPrivate && (
                <Badge variant="outline" className="border-yellow-500/30 bg-yellow-500/10 text-yellow-200">
                  Private
                </Badge>
              )}
            </div>
            <p className="text-sm text-zinc-300">
              Room ID: <span className="font-mono text-zinc-100">{challengeid}</span>
              {password ? (
                <>
                  {" "}
                  • Access code: <span className="font-mono text-zinc-100">{password}</span>
                </>
              ) : null}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button variant="outline" className="border-zinc-700 bg-black/30" onClick={sendRefetchChallenge}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh room
            </Button>
            <Button variant="outline" className="border-zinc-700 bg-black/30" onClick={requestLeaderboard}>
              <Swords className="mr-2 h-4 w-4" />
              Refresh leaderboard
            </Button>
            <Button className="bg-emerald-500 hover:bg-emerald-600 text-black" onClick={copyInviteLink}>
              <Copy className="mr-2 h-4 w-4" />
              Copy invite
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="border-zinc-800/70 bg-black/40 backdrop-blur">
            <CardHeader className="pb-2">
              <CardDescription className="text-zinc-400">Connection</CardDescription>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Signal className="h-5 w-5 text-sky-300" />
                {wsStatus}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-zinc-300">
              Latency: <span className={latencyTone}>{latency !== null ? `${latency} ms` : "N/A"}</span>
            </CardContent>
          </Card>

          <Card className="border-zinc-800/70 bg-black/40 backdrop-blur">
            <CardHeader className="pb-2">
              <CardDescription className="text-zinc-400">Participants</CardDescription>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5 text-emerald-300" />
                {participants.length}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-zinc-300">
              Max users: {challenge?.config?.maxUsers || "N/A"}
            </CardContent>
          </Card>

          <Card className="border-zinc-800/70 bg-black/40 backdrop-blur">
            <CardHeader className="pb-2">
              <CardDescription className="text-zinc-400">Problems</CardDescription>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="h-5 w-5 text-amber-300" />
                {challenge?.processedProblemIds?.length || challenge?.problemCount || 0}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-zinc-300">
              Challenge creator: {challenge?.creatorId === userProfile?.userId ? "You" : challenge?.creatorId?.slice(0, 8) || "N/A"}
            </CardContent>
          </Card>

          <Card className="border-zinc-800/70 bg-black/40 backdrop-blur">
            <CardHeader className="pb-2">
              <CardDescription className="text-zinc-400">Time remaining</CardDescription>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock3 className="h-5 w-5 text-rose-300" />
                {challenge ? formatCountdown(countdown) : "--:--:--"}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-zinc-300">
              Starts: {challenge?.startTime ? new Date(challenge.startTime * 1000).toLocaleString() : "Pending"}
            </CardContent>
          </Card>
        </div>

        {err ? (
          <Card className="border-rose-500/30 bg-rose-500/10">
            <CardContent className="py-4 text-sm text-rose-100">{err}</CardContent>
          </Card>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
          <div className="space-y-6">
            <Card className="border-zinc-800/70 bg-black/40 backdrop-blur">
              <CardHeader>
                <CardTitle>Challenge Problems</CardTitle>
                <CardDescription className="text-zinc-400">
                  Open any problem in the playground. This page reflects room state; it does not change problem flows.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {problemsLoading ? (
                  <div className="flex items-center justify-center py-10 text-zinc-400">
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Loading problems...
                  </div>
                ) : (
                  <ProblemListing problemsMetadata={problemsMetadata} />
                )}
              </CardContent>
            </Card>

            <Card className="border-zinc-800/70 bg-black/40 backdrop-blur">
              <CardHeader>
                <CardTitle>Live Activity</CardTitle>
                <CardDescription className="text-zinc-400">
                  Join/leave events and score updates from the challenge websocket.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EventFeed events={liveEvents} onRemoveEvent={() => {}} />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <LeaderboardCard
              entries={challenge?.leaderboard || []}
              currentUserId={userProfile?.userId}
              className="border-zinc-800/70 bg-black/40 backdrop-blur"
            />

            <Card className="border-zinc-800/70 bg-black/40 backdrop-blur">
              <CardHeader>
                <CardTitle>Participants</CardTitle>
                <CardDescription className="text-zinc-400">
                  Ranked by live leaderboard when available.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {participantsLoading ? (
                  <div className="flex items-center justify-center py-8 text-zinc-400">
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Loading participants...
                  </div>
                ) : participants.length ? (
                  participants.map((participant) => (
                    <div
                      key={participant.userId}
                      className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={participant.profile?.avatarURL || avatarIcon}
                          alt={participant.profile?.userName || participant.userId}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-zinc-100">
                            {participant.profile?.userName || participant.userId}
                            {participant.userId === userProfile?.userId ? " (You)" : ""}
                          </p>
                          <p className="truncate text-xs text-zinc-400">
                            Joined {participant.metadata?.joinTime ? new Date(participant.metadata.joinTime * 1000).toLocaleString() : "recently"}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-zinc-100">
                          #{participant.rank === Number.MAX_SAFE_INTEGER ? "-" : participant.rank}
                        </p>
                        <p className="text-xs text-zinc-400">
                          {participant.score} pts • {participant.solved} solved
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-6 text-sm text-zinc-400">No participants connected yet.</div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {abandonOverlay.visible ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <Card className="w-full max-w-md border-rose-500/30 bg-zinc-950 text-center">
            <CardHeader>
              <CardTitle>Challenge Abandoned</CardTitle>
              <CardDescription className="text-zinc-400">
                Redirecting to the challenge list in {abandonOverlay.countdown} seconds.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      ) : null}
    </div>
  );
};

export default JoinChallenge;
