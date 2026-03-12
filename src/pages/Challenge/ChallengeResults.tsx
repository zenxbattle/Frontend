import { useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, Lock, Trophy, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import MainNavbar from "@/components/common/MainNavbar";
import LeaderboardCard from "@/components/challenges/LeaderboardCard";
import ProblemListing from "./BulkMetaDataProblemListing";
import { ChallengeDocument } from "@/api/challengeTypes";
import { useChallengeById } from "@/services/useChallenges";
import { useGetBulkProblemMetadata } from "@/services/useGetBulkProblemMetadata";
import { useGetUserProfileMetadataBulk } from "@/services/useGetUserProfileMetadataBulk";
import bgGradient from "@/assets/challengegradient.png";
import avatarIcon from "@/assets/avatar.png";

type LocationState = {
  challenge?: ChallengeDocument;
};

const statusLabel = (status?: string) => {
  switch (status) {
    case "CHALLENGEENDED":
      return "Completed";
    case "CHALLENGEABANDON":
      return "Abandoned";
    case "CHALLENGESTARTED":
      return "Started";
    case "CHALLENGEOPEN":
      return "Open";
    default:
      return status || "Unknown";
  }
};

const ChallengeResults = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { challengeId } = useParams<{ challengeId: string }>();
  const state = location.state as LocationState | null;
  const { data: fetchedChallenge, isLoading } = useChallengeById(challengeId);

  const challenge = useMemo(() => {
    if (state?.challenge?.challengeId === challengeId) {
      return state.challenge;
    }
    return fetchedChallenge || null;
  }, [challengeId, fetchedChallenge, state?.challenge]);

  const participantIds = useMemo(
    () => Object.keys(challenge?.participants || {}),
    [challenge?.participants]
  );
  const problemIds = useMemo(
    () => challenge?.processedProblemIds || [],
    [challenge?.processedProblemIds]
  );

  const { data: participantProfiles = [] } = useGetUserProfileMetadataBulk(participantIds);
  const { data: problemsMetadata = [] } = useGetBulkProblemMetadata(problemIds);

  const participantMap = useMemo(
    () => Object.fromEntries(participantProfiles.map((profile) => [profile.userId, profile])),
    [participantProfiles]
  );

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
        <Button
          variant="ghost"
          className="px-0 text-zinc-300 hover:text-white hover:bg-transparent"
          onClick={() => navigate("/challenges")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to challenges
        </Button>

        {!challenge ? (
          <Card className="border-zinc-800/70 bg-black/40 backdrop-blur">
            <CardHeader>
              <CardTitle>Challenge results unavailable</CardTitle>
              <CardDescription className="text-zinc-400">
                {isLoading
                  ? "Loading challenge results..."
                  : "This challenge could not be loaded or you do not have access to it."}
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold tracking-tight">{challenge.title}</h1>
                  <Badge className="border-zinc-700 bg-zinc-900/70 text-zinc-200">
                    {statusLabel(challenge.status)}
                  </Badge>
                  {challenge.isPrivate ? (
                    <Badge variant="outline" className="border-yellow-500/30 bg-yellow-500/10 text-yellow-200">
                      <Lock className="mr-1 h-3 w-3" />
                      Private
                    </Badge>
                  ) : null}
                </div>
                <p className="text-sm text-zinc-400">
                  Challenge ID: <span className="font-mono text-zinc-200">{challenge.challengeId}</span>
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Card className="border-zinc-800/70 bg-black/40 backdrop-blur">
                <CardHeader className="pb-2">
                  <CardDescription className="text-zinc-400">Started</CardDescription>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <CalendarDays className="h-5 w-5 text-sky-300" />
                    {challenge.startTime ? new Date(challenge.startTime * 1000).toLocaleString() : "N/A"}
                  </CardTitle>
                </CardHeader>
              </Card>

              <Card className="border-zinc-800/70 bg-black/40 backdrop-blur">
                <CardHeader className="pb-2">
                  <CardDescription className="text-zinc-400">Problems</CardDescription>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Trophy className="h-5 w-5 text-amber-300" />
                    {challenge.processedProblemIds?.length || challenge.problemCount || 0}
                  </CardTitle>
                </CardHeader>
              </Card>

              <Card className="border-zinc-800/70 bg-black/40 backdrop-blur">
                <CardHeader className="pb-2">
                  <CardDescription className="text-zinc-400">Participants</CardDescription>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Users className="h-5 w-5 text-emerald-300" />
                    {participantIds.length}
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
              <Card className="border-zinc-800/70 bg-black/40 backdrop-blur">
                <CardHeader>
                  <CardTitle>Problems</CardTitle>
                  <CardDescription className="text-zinc-400">
                    Problems that were part of this challenge.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ProblemListing problemsMetadata={problemsMetadata} />
                </CardContent>
              </Card>

              <div className="space-y-6">
                <LeaderboardCard
                  entries={challenge.leaderboard || []}
                  className="border-zinc-800/70 bg-black/40 backdrop-blur"
                />

                <Card className="border-zinc-800/70 bg-black/40 backdrop-blur">
                  <CardHeader>
                    <CardTitle>Participants</CardTitle>
                    <CardDescription className="text-zinc-400">
                      Final room roster for this challenge.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {participantIds.map((userId) => {
                      const profile = participantMap[userId];
                      const metadata = challenge.participants?.[userId];
                      return (
                        <div
                          key={userId}
                          className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <img
                              src={profile?.avatarURL || avatarIcon}
                              alt={profile?.userName || userId}
                              className="h-10 w-10 rounded-full object-cover"
                            />
                            <div className="min-w-0">
                              <p className="truncate font-medium text-zinc-100">
                                {profile?.userName || userId}
                              </p>
                              <p className="truncate text-xs text-zinc-400">
                                Joined {metadata?.joinTime ? new Date(metadata.joinTime * 1000).toLocaleString() : "N/A"}
                              </p>
                            </div>
                          </div>
                          <div className="text-right text-xs text-zinc-400">
                            <p>{metadata?.totalScore ?? 0} pts</p>
                            <p>{metadata?.problemsAttempted ?? 0} solved</p>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default ChallengeResults;
