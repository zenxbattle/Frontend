import { useState } from "react";
import { Castle, Loader2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";

interface JoinPrivateChallengeProps {
  isOpen: boolean;
  onClose: () => void;
}

const JoinPrivateChallenge: React.FC<JoinPrivateChallengeProps> = ({
  isOpen,
  onClose,
}) => {
  const [accessCode, setAccessCode] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const resetForm = () => {
    setAccessCode("");
    setChallengeId("");
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessCode.trim() || !challengeId.trim()) {
      return;
    }

    setLoading(true);
    navigate(`/join-challenge/${challengeId.trim()}/${accessCode.trim()}`);
    onClose();
    resetForm();
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          resetForm();
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-md p-6 bg-white dark:bg-zinc-800 rounded-lg">
        <DialogHeader className="mb-6">
          <DialogTitle className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            Join Private Challenge
          </DialogTitle>
          <DialogDescription className="text-sm text-zinc-500 dark:text-zinc-400">
            Enter the challenge ID and access code. Validation happens when the room connects.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-4">
            <div>
              <label
                htmlFor="challenge-id"
                className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Challenge ID
              </label>
              <div className="relative mt-1">
                <Castle className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <Input
                  id="challenge-id"
                  value={challengeId}
                  onChange={(e) => setChallengeId(e.target.value)}
                  placeholder="Enter challenge ID"
                  className="pl-10 h-10 border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  autoComplete="off"
                />
              </div>
            </div>
            <div>
              <label
                htmlFor="access-code"
                className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Access Code
              </label>
              <div className="relative mt-1">
                <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <Input
                  id="access-code"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  placeholder="Enter access code"
                  className="pl-10 h-10 border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  autoComplete="off"
                  maxLength={10}
                />
              </div>
            </div>
          </div>
          <DialogFooter className="flex justify-end gap-2 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetForm();
                onClose();
              }}
              disabled={loading}
              className="h-10 border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !accessCode.trim() || !challengeId.trim()}
              className="h-10 bg-blue-600 hover:bg-blue-700 text-white disabled:bg-blue-300 dark:disabled:bg-blue-900"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Joining...
                </>
              ) : (
                "Join Room"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default JoinPrivateChallenge;
