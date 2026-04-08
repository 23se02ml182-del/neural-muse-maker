// ═══ Type guard — must be at top before any usage ═══
function isErrorWithMessage(e: unknown): e is { message: string } {
  return typeof e === "object" && e !== null && "message" in e;
}

import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import "@/styles/animated-auth.css";

// ═══ Floating Particles Component ═══
const Particles = () => (
  <div className="auth-particles">
    {Array.from({ length: 12 }).map((_, i) => (
      <div key={i} className="auth-particle" />
    ))}
  </div>
);

// ═══ SVG Icon Components ═══
const LogoIcon = () => (
  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2L2 7l10 5 10-5-10-5z" />
    <path d="M2 17l10 5 10-5" />
    <path d="M2 12l10 5 10-5" />
  </svg>
);

const MailIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
);

const LockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const UserIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const EyeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const ArrowLeftIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="m15 18-6-6 6-6" />
  </svg>
);

const SparkleIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M12 3v18M5.5 7.5l13 9M5.5 16.5l13-9" />
  </svg>
);

const ShieldIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const ZapIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

const AlertIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

// ═══ Panel type for clarity ═══
type AuthPanel = "login" | "signup" | "forgot";

const Auth = () => {
  // FIX: Use a single panel state instead of two booleans to avoid conflicting state combinations
  const [panel, setPanel] = useState<AuthPanel>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showTip, setShowTip] = useState(false);
  const [authError, setAuthError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // FIX: Removed `authError` from deps — having it in the array caused a setState loop
  // (setting authError → effect fires → clears authError → no-op, but still a bad pattern)
  useEffect(() => {
    setAuthError("");
  }, [email, password, panel]);

  const { user, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const wipeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      const params = new URLSearchParams(window.location.search);
      const redirect = params.get("redirect");
      navigate(redirect ?? "/my-logos", { replace: true });
    }
  }, [user, navigate]);

  // ═══ Wipe transition ═══
  const wipeBusy = useRef(false);
  const runWipe = useCallback((cb: () => void) => {
    const wipe = wipeRef.current;
    // FIX: Added null guard — wipeRef.current can be null before mount
    if (!wipe || wipeBusy.current) return;
    wipeBusy.current = true;
    wipe.className = "auth-wipe";
    void wipe.offsetWidth; // force reflow
    wipe.classList.add("covering");
    setTimeout(() => {
      cb();
      setTimeout(() => {
        wipe.classList.remove("covering");
        wipe.classList.add("uncovering");
        setTimeout(() => {
          wipe.className = "auth-wipe";
          wipeBusy.current = false;
        }, 550);
      }, 80);
    }, 600);
  }, []);

  const switchTo = useCallback(
    (target: AuthPanel) => {
      if (panel === target) return;
      runWipe(() => setPanel(target));
    },
    [panel, runWipe]
  );

  // ═══ Forgot Password ═══
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setShowTip(true);
      setTimeout(() => setShowTip(false), 2800);
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success("Password reset link sent! Check your email.");
      switchTo("login");
    } catch (error: unknown) {
      const msg = isErrorWithMessage(error) ? error.message : "Failed to send reset email";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // ═══ Login ═══
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setShowTip(true);
      setTimeout(() => setShowTip(false), 2800);
      return;
    }
    setLoading(true);
    setAuthError("");
    try {
      await signIn(email, password);
      toast.success("Welcome back!");
    } catch (error: unknown) {
      // FIX: Set inline error AND show toast — previously both could show conflicting messages
      setAuthError("Invalid email or password. Please try again.");
      const msg = isErrorWithMessage(error) ? error.message : "Authentication failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // ═══ Sign Up ═══
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setAuthError("");
    try {
      await signUp(email, password, displayName);
      toast.success("Account created! Please check your email to verify your account.");
      setEmail("");
      setPassword("");
      setDisplayName("");
      switchTo("login");
    } catch (error: unknown) {
      const msg = isErrorWithMessage(error) ? error.message : "Sign up failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // FIX: Using direct Supabase OAuth instead of Lovable cloud wrapper because 
  // the Lovable wrapper often fails with a 404 route in local development.
  const handleGoogleSignIn = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth`, // Change to /auth or dashboard depending on setup
        }
      });
      if (error) throw error;
    } catch (error: unknown) {
      const msg = isErrorWithMessage(error) ? error.message : "Google sign-in failed";
      toast.error(msg);
    }
  };

  // ═══ Dynamic header text derived from single `panel` state ═══
  const formTitle =
    panel === "forgot" ? "Reset Password" : panel === "login" ? "Welcome Back" : "Create Account";
  const formSubtitle =
    panel === "forgot"
      ? "Enter your email to receive a reset link"
      : panel === "login"
      ? "Sign in to continue your creative journey"
      : "Start creating stunning logos today";

  // FIX: Panel class helper — clean, deterministic, no overlapping class conflicts
  const panelClass = (target: AuthPanel) => {
    if (panel === target) return "auth-form-panel active-panel";
    // Login slides left when forgot-password is active; signup always slides right
    if (target === "login") return "auth-form-panel hidden-left";
    if (target === "forgot") return "auth-form-panel hidden-left";
    return "auth-form-panel hidden-panel";
  };

  return (
    <div className="auth-page">
      {/* ═══ LEFT PANEL ═══ */}
      <div className="auth-left-panel">
        <div className="auth-gradient-mesh" />
        <div className="auth-noise-overlay" />
        <Particles />

        <Link to="/" className="auth-back-link">
          <ArrowLeftIcon /> Back to Home
        </Link>

        <div className="auth-brand">
          <div className="auth-brand-icon">
            <LogoIcon />
          </div>
          <h1>LogoAI</h1>
          <p>Create stunning, professional logos in seconds with the power of artificial intelligence.</p>
        </div>

        <div className="auth-features">
          <div className="auth-feature-pill">
            <ZapIcon /> AI-Powered
          </div>
          <div className="auth-feature-pill">
            <SparkleIcon /> Unlimited Designs
          </div>
          <div className="auth-feature-pill">
            <ShieldIcon /> Secure &amp; Private
          </div>
        </div>
      </div>

      {/* ═══ RIGHT PANEL ═══ */}
      <div className="auth-right-panel">
        <div className="auth-form-card">
          <div className="auth-form-header">
            <h2>{formTitle}</h2>
            <p>{formSubtitle}</p>
          </div>

          <div className="auth-form-wrap">
            {/* ═══ LOGIN PANEL ═══ */}
            <div className={panelClass("login")}>
              {authError && (
                <div className="auth-error-msg">
                  <AlertIcon />
                  {authError}
                </div>
              )}
              <form onSubmit={handleLogin}>
                <div className={`auth-field ${showTip && !email.trim() ? "show-tip" : ""}`}>
                  <div className="auth-tooltip">
                    <AlertIcon />
                    Please fill in this field.
                  </div>
                  <label htmlFor="login-email">Email Address</label>
                  <div className="auth-field-row">
                    <input
                      id="login-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="username"
                    />
                    <span className="auth-field-icon"><MailIcon /></span>
                  </div>
                </div>

                <div className="auth-field">
                  <label htmlFor="login-password">Password</label>
                  <div className="auth-field-row">
                    <input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      className="auth-password-toggle"
                      onClick={() => setShowPassword((v) => !v)}
                      tabIndex={-1}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                    <span className="auth-field-icon"><LockIcon /></span>
                  </div>
                </div>

                <div className="auth-forgot-link">
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      runWipe(() => setPanel("forgot"));
                    }}
                  >
                    Forgot password?
                  </a>
                </div>

                <button type="submit" className="auth-submit-btn" disabled={loading}>
                  {loading ? (
                    <><div className="auth-btn-spinner" /> Signing in...</>
                  ) : (
                    "Sign In"
                  )}
                </button>
              </form>

              <div className="auth-divider">
                <div className="auth-divider-line" />
                <span className="auth-divider-text">or</span>
                <div className="auth-divider-line" />
              </div>

              <button className="auth-google-btn" onClick={handleGoogleSignIn} type="button">
                <GoogleIcon />
                Continue with Google
              </button>

              <div className="auth-switch-link">
                Don&apos;t have an account?{" "}
                <a href="#" onClick={(e) => { e.preventDefault(); switchTo("signup"); }}>
                  Sign Up
                </a>
              </div>
            </div>

            {/* ═══ SIGNUP PANEL ═══ */}
            <div className={panelClass("signup")}>
              <form onSubmit={handleSignup}>
                <div className="auth-field">
                  <label htmlFor="signup-name">Display Name</label>
                  <div className="auth-field-row">
                    <input
                      id="signup-name"
                      type="text"
                      placeholder="Choose a display name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      autoComplete="name"
                    />
                    <span className="auth-field-icon"><UserIcon /></span>
                  </div>
                </div>

                <div className="auth-field">
                  <label htmlFor="signup-email">Email Address</label>
                  <div className="auth-field-row">
                    <input
                      id="signup-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="username"
                    />
                    <span className="auth-field-icon"><MailIcon /></span>
                  </div>
                </div>

                <div className="auth-field">
                  <label htmlFor="signup-password">Password</label>
                  <div className="auth-field-row">
                    <input
                      id="signup-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a strong password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="auth-password-toggle"
                      onClick={() => setShowPassword((v) => !v)}
                      tabIndex={-1}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                    <span className="auth-field-icon"><LockIcon /></span>
                  </div>
                </div>

                <button type="submit" className="auth-submit-btn" disabled={loading}>
                  {loading ? (
                    <><div className="auth-btn-spinner" /> Creating Account...</>
                  ) : (
                    "Create Account"
                  )}
                </button>
              </form>

              <div className="auth-divider">
                <div className="auth-divider-line" />
                <span className="auth-divider-text">or</span>
                <div className="auth-divider-line" />
              </div>

              <button className="auth-google-btn" onClick={handleGoogleSignIn} type="button">
                <GoogleIcon />
                Continue with Google
              </button>

              <div className="auth-switch-link">
                Already have an account?{" "}
                <a href="#" onClick={(e) => { e.preventDefault(); switchTo("login"); }}>
                  Sign In
                </a>
              </div>
            </div>

            {/* ═══ FORGOT PASSWORD PANEL ═══ */}
            <div className={panelClass("forgot")}>
              <form onSubmit={handleForgotPassword}>
                <div className={`auth-field ${showTip && !email.trim() ? "show-tip" : ""}`}>
                  <div className="auth-tooltip">
                    <AlertIcon />
                    Please enter your email.
                  </div>
                  <label htmlFor="reset-email">Email Address</label>
                  <div className="auth-field-row">
                    <input
                      id="reset-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="username"
                    />
                    <span className="auth-field-icon"><MailIcon /></span>
                  </div>
                </div>

                <button
                  type="submit"
                  className="auth-submit-btn"
                  disabled={loading}
                  style={{ marginTop: "8px" }}
                >
                  {loading ? (
                    <><div className="auth-btn-spinner" /> Sending...</>
                  ) : (
                    "Send Reset Link"
                  )}
                </button>
              </form>

              <div className="auth-switch-link" style={{ marginTop: "20px" }}>
                <a href="#" onClick={(e) => { e.preventDefault(); switchTo("login"); }}>
                  ← Back to Sign In
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Wipe transition overlay */}
      <div className="auth-wipe" ref={wipeRef} />
    </div>
  );
};

export default Auth;
