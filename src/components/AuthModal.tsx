import { useState } from "react";

// type guard for catching errors safely
function isErrorWithMessage(e: unknown): e is { message: string } {
  return typeof e === "object" && e !== null && "message" in e;
}
import { useAuth } from "@/hooks/useAuth";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import "@/styles/animated-auth.css";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const AuthModal = ({ open, onOpenChange, onSuccess }: AuthModalProps) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showTip, setShowTip] = useState(false);

  const { signIn, signUp } = useAuth();

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { setShowTip(true); setTimeout(() => setShowTip(false), 2800); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success("Password reset link sent! Check your email.");
      setIsForgotPassword(false);
      setIsLogin(true);
    } catch (error: unknown) {
      if (isErrorWithMessage(error)) {
        toast.error(error.message || "Failed to send reset email");
      } else {
        toast.error("Failed to send reset email");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setShowTip(true);
      setTimeout(() => setShowTip(false), 2800);
      return;
    }
    setLoading(true);
    try {
      await signIn(email, password);
      toast.success("Welcome back!");
      onSuccess();
    } catch (error: unknown) {
      if (isErrorWithMessage(error)) {
        toast.error(error.message || "Authentication failed");
      } else {
        toast.error("Authentication failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setShowTip(true);
      setTimeout(() => setShowTip(false), 2800);
      return;
    }
    setLoading(true);
    try {
      await signUp(email, password, displayName);
      toast.success("Account created! Please check your email to verify, then log in.");
      setEmail("");
      setPassword("");
      setDisplayName("");
      setIsLogin(true);
      setIsForgotPassword(false);
    } catch (error: unknown) {
      if (isErrorWithMessage(error)) {
        toast.error(error.message || "Sign up failed");
      } else {
        toast.error("Sign up failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    const { error } = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/create",
    });
    if (error) toast.error("Google sign-in failed");
  };

  const formTitle = isForgotPassword ? "Reset Password" : isLogin ? "Login to Generate" : "Sign Up to Generate";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-border/50 bg-card">
        <div className="p-6 space-y-5">
          {/* Header */}
          <div className="text-center space-y-1">
            <h2 className="text-xl font-bold text-foreground">{formTitle}</h2>
            <p className="text-sm text-muted-foreground">
              {isForgotPassword
                ? "Enter your email to receive a reset link"
                : isLogin
                  ? "Sign in to generate your logo"
                  : "Create an account to get started"}
            </p>
          </div>

          {/* LOGIN FORM */}
          {isLogin && !isForgotPassword && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Email</label>
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-11 rounded-lg border border-border/50 bg-secondary/50 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Password</label>
                <input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-11 rounded-lg border border-border/50 bg-secondary/50 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  required
                />
              </div>
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => setIsForgotPassword(true)}
                  className="text-xs text-primary hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {loading ? "Signing in..." : "Login & Generate"}
              </button>
            </form>
          )}

          {/* SIGNUP FORM */}
          {!isLogin && !isForgotPassword && (
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Display Name</label>
                <input
                  type="text"
                  placeholder="Choose a display name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full h-11 rounded-lg border border-border/50 bg-secondary/50 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Email</label>
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-11 rounded-lg border border-border/50 bg-secondary/50 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Password</label>
                <input
                  type="password"
                  placeholder="Create a password (min 6 chars)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-11 rounded-lg border border-border/50 bg-secondary/50 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  required
                  minLength={6}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {loading ? "Creating account..." : "Sign Up"}
              </button>
            </form>
          )}

          {/* FORGOT PASSWORD FORM */}
          {isForgotPassword && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Email</label>
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-11 rounded-lg border border-border/50 bg-secondary/50 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {loading ? "Sending..." : "Send Reset Link"}
              </button>
              <button
                type="button"
                onClick={() => { setIsForgotPassword(false); setIsLogin(true); }}
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Back to Login
              </button>
            </form>
          )}

          {/* Divider + Google */}
          {!isForgotPassword && (
            <>
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-border/50" />
                <span className="text-xs text-muted-foreground">or</span>
                <div className="h-px flex-1 bg-border/50" />
              </div>
              <button
                onClick={handleGoogleSignIn}
                type="button"
                className="w-full h-11 rounded-lg border border-border/50 bg-secondary/30 text-sm font-medium text-foreground hover:bg-secondary/50 transition-colors flex items-center justify-center gap-2"
              >
                <svg width="16" height="16" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Continue with Google
              </button>
              <div className="text-center text-sm text-muted-foreground">
                {isLogin ? (
                  <>Don't have an account?{" "}<button onClick={() => setIsLogin(false)} className="text-primary hover:underline">Sign Up</button></>
                ) : (
                  <>Already have an account?{" "}<button onClick={() => setIsLogin(true)} className="text-primary hover:underline">Login</button></>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AuthModal;
