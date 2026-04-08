import { useState, useEffect } from "react";

function isErrorWithMessage(e: unknown): e is { message: string } {
  return typeof e === "object" && e !== null && "message" in e;
}
import { useNavigate } from "react-router-dom";
import { Sparkles, Lock, ArrowRight, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes("type=recovery")) {
      setIsRecovery(true);
    }
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setIsRecovery(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) { toast.error("Passwords do not match"); return; }
    if (password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
      toast.success("Password updated successfully!");
      setTimeout(() => navigate("/auth"), 2000);
    } catch (error: unknown) {
      if (isErrorWithMessage(error)) toast.error(error.message || "Failed to reset password");
      else toast.error("Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="relative z-10 w-full max-w-md px-6">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary glow-blue">
            <Sparkles className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground">Reset Password</h1>
          <p className="mt-2 text-muted-foreground">
            {isRecovery ? "Enter your new password below" : "This link may have expired. Request a new one."}
          </p>
        </div>

        {success ? (
          <div className="glass p-8 text-center space-y-4">
            <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
            <p className="text-foreground font-semibold">Password updated!</p>
            <p className="text-sm text-muted-foreground">Redirecting to sign in…</p>
          </div>
        ) : isRecovery ? (
          <form onSubmit={handleReset} className="glass p-8 space-y-5">
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input type="password" placeholder="New Password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="h-12 rounded-xl border-border bg-secondary/50 pl-11" />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input type="password" placeholder="Confirm New Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} className="h-12 rounded-xl border-border bg-secondary/50 pl-11" />
            </div>
            <Button type="submit" disabled={loading} className="w-full h-12 gap-2 rounded-xl glow-blue font-semibold">
              {loading ? "Updating..." : "Update Password"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
        ) : (
          <div className="glass p-8 text-center space-y-4">
            <p className="text-muted-foreground">No recovery session found.</p>
            <Button onClick={() => navigate("/auth")} className="gap-2 rounded-xl glow-blue">
              Back to Sign In
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
