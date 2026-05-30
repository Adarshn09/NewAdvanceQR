import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Redirect, Link } from "wouter";
import { QrCode, Eye, EyeOff, CheckCircle2, XCircle, AlertCircle, Sparkles, LogIn } from "lucide-react";
import { FaGoogle, FaGithub } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema } from "@shared/schema";
import { z } from "zod";

const loginSchema = insertUserSchema.pick({ username: true, password: true });

// ── Password requirements ─────────────────────────────────────────────────

function PasswordRequirements({ password }: { password: string }) {
  const rules = [
    { label: "At least 8 characters", valid: password.length >= 8 },
    { label: "One uppercase letter (A-Z)", valid: /[A-Z]/.test(password) },
    { label: "One lowercase letter (a-z)", valid: /[a-z]/.test(password) },
    { label: "One number (0-9)", valid: /[0-9]/.test(password) },
    { label: "One special character (!@#$…)", valid: /[^A-Za-z0-9]/.test(password) },
  ];
  if (!password) return null;
  return (
    <ul className="mt-2 space-y-1">
      {rules.map((r) => (
        <li
          key={r.label}
          className={`flex items-center gap-1.5 text-xs ${r.valid ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"}`}
        >
          {r.valid
            ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            : <XCircle className="h-3.5 w-3.5 shrink-0" />}
          {r.label}
        </li>
      ))}
    </ul>
  );
}

// ── Inline alert banner ───────────────────────────────────────────────────

type AlertType = "error" | "success" | "warning";

interface InlineAlertProps {
  type: AlertType;
  title: string;
  message: string;
  onDismiss: () => void;
}

function InlineAlert({ type, title, message, onDismiss }: InlineAlertProps) {
  const styles: Record<AlertType, { wrapper: string; icon: string; dot: string }> = {
    error: {
      wrapper:
        "border-red-200 bg-red-50 dark:border-red-800/50 dark:bg-red-950/40",
      icon: "text-red-500",
      dot: "bg-red-500",
    },
    success: {
      wrapper:
        "border-emerald-200 bg-emerald-50 dark:border-emerald-800/50 dark:bg-emerald-950/40",
      icon: "text-emerald-500",
      dot: "bg-emerald-500",
    },
    warning: {
      wrapper:
        "border-amber-200 bg-amber-50 dark:border-amber-800/50 dark:bg-amber-950/40",
      icon: "text-amber-500",
      dot: "bg-amber-500",
    },
  };

  const s = styles[type];

  return (
    <div
      className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm animate-in slide-in-from-top-2 fade-in duration-300 ${s.wrapper}`}
      role="alert"
    >
      <AlertCircle className={`h-4 w-4 mt-0.5 shrink-0 ${s.icon}`} />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-foreground">{title}</p>
        <p className="text-muted-foreground text-xs mt-0.5 leading-relaxed">{message}</p>
      </div>
      <button
        onClick={onDismiss}
        className="shrink-0 text-muted-foreground hover:text-foreground transition-colors mt-0.5"
        aria-label="Dismiss"
      >
        <XCircle className="h-4 w-4" />
      </button>
    </div>
  );
}

// ── OAuth buttons ─────────────────────────────────────────────────────────

function OAuthButtons() {
  return (
    <div className="mt-4 space-y-3">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground font-medium">or continue with</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => (window.location.href = "/auth/google")}
          className="flex items-center justify-center gap-2 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground shadow-sm hover:bg-muted hover:border-border/80 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
        >
          <FaGoogle className="h-4 w-4 text-[#4285F4]" />
          Google
        </button>
        <button
          type="button"
          onClick={() => (window.location.href = "/auth/github")}
          className="flex items-center justify-center gap-2 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground shadow-sm hover:bg-muted hover:border-border/80 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
        >
          <FaGithub className="h-4 w-4" />
          GitHub
        </button>
      </div>
    </div>
  );
}

// ── Schema ────────────────────────────────────────────────────────────────

type LoginData = z.infer<typeof loginSchema>;

const registerSchema = insertUserSchema.extend({
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});
type RegisterData = z.infer<typeof registerSchema>;

// ── Auth map helpers ──────────────────────────────────────────────────────

function getLoginAlert(msg: string): { title: string; message: string } {
  const m = msg.toLowerCase();
  if (m.includes("incorrect") || m.includes("invalid") || m.includes("password")) {
    return { title: "Incorrect password", message: "Double-check your password and try again." };
  }
  if (m.includes("not found") || m.includes("no user") || m.includes("username")) {
    return { title: "Account not found", message: "No account exists with that username. Did you mean to sign up?" };
  }
  if (m.includes("too many") || m.includes("rate limit")) {
    return { title: "Too many attempts", message: "Please wait a moment before trying again." };
  }
  return { title: "Sign in failed", message: msg || "Something went wrong. Please try again." };
}

function getRegisterAlert(msg: string): { title: string; message: string } {
  const m = msg.toLowerCase();
  if (
    m.includes("already exists") ||
    m.includes("duplicate") ||
    m.includes("taken") ||
    m.includes("unique") ||
    m.includes("already registered")
  ) {
    return {
      title: "Username already taken",
      message: "That username is already in use. Please choose a different one.",
    };
  }
  if (m.includes("email") && (m.includes("exists") || m.includes("taken") || m.includes("duplicate"))) {
    return {
      title: "Email already registered",
      message: "An account with this email exists. Try signing in instead.",
    };
  }
  if (m.includes("password")) {
    return { title: "Weak password", message: "Your password doesn't meet all the requirements listed below." };
  }
  return { title: "Registration failed", message: msg || "We couldn't create your account. Please try again." };
}

// ── Main page ─────────────────────────────────────────────────────────────

export default function AuthPage() {
  const { user, isLoading, loginMutation, registerMutation } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Inline alert state
  const [loginAlert, setLoginAlert] = useState<{ title: string; message: string } | null>(null);
  const [registerAlert, setRegisterAlert] = useState<{ title: string; message: string } | null>(null);

  // Sync inline alerts with mutation errors
  useEffect(() => {
    if (loginMutation.isError && loginMutation.error) {
      setLoginAlert(getLoginAlert(loginMutation.error.message));
    } else {
      setLoginAlert(null);
    }
  }, [loginMutation.isError, loginMutation.error]);

  useEffect(() => {
    if (registerMutation.isError && registerMutation.error) {
      setRegisterAlert(getRegisterAlert(registerMutation.error.message));
    } else {
      setRegisterAlert(null);
    }
  }, [registerMutation.isError, registerMutation.error]);

  const loginForm = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  const registerForm = useForm<RegisterData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { username: "", email: "", password: "", confirmPassword: "" },
  });

  if (user) return <Redirect to="/dashboard" />;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const onLogin = (data: LoginData) => {
    setLoginAlert(null);
    loginMutation.mutate(data);
  };

  const onRegister = (data: RegisterData) => {
    setRegisterAlert(null);
    const { confirmPassword, ...registerData } = data;
    registerMutation.mutate(registerData);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-950 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">

        {/* ── Left Column – Auth Forms ──────────────────────────────────── */}
        <div className="w-full max-w-md mx-auto">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <QrCode className="text-primary text-3xl mr-3" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">QR Generator Pro</h1>
            </div>
            <p className="text-gray-600 dark:text-gray-400">
              Sign in to your account or create a new one to start managing your QR codes.
            </p>
          </div>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login" data-testid="tab-login">Sign In</TabsTrigger>
              <TabsTrigger value="register" data-testid="tab-register">Sign Up</TabsTrigger>
            </TabsList>

            {/* ── Sign In Tab ────────────────────────────────────────── */}
            <TabsContent value="login">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <LogIn className="w-5 h-5 text-primary" />
                    Welcome Back
                  </CardTitle>
                  <CardDescription>
                    Enter your credentials to access your QR code dashboard.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">

                    {/* Inline error banner */}
                    {loginAlert && (
                      <InlineAlert
                        type="error"
                        title={loginAlert.title}
                        message={loginAlert.message}
                        onDismiss={() => setLoginAlert(null)}
                      />
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="login-username">Username</Label>
                      <Input
                        id="login-username"
                        data-testid="input-login-username"
                        placeholder="Enter your username"
                        {...loginForm.register("username")}
                        className={loginForm.formState.errors.username ? "border-destructive" : ""}
                      />
                      {loginForm.formState.errors.username && (
                        <p className="text-xs text-destructive flex items-center gap-1" data-testid="error-login-username">
                          <XCircle className="h-3 w-3 shrink-0" />
                          {loginForm.formState.errors.username.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="login-password">Password</Label>
                      <div className="relative">
                        <Input
                          id="login-password"
                          data-testid="input-login-password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your password"
                          {...loginForm.register("password")}
                          className={loginForm.formState.errors.password ? "border-destructive pr-10" : "pr-10"}
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          onClick={() => setShowPassword(!showPassword)}
                          data-testid="button-toggle-login-password"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {loginForm.formState.errors.password && (
                        <p className="text-xs text-destructive flex items-center gap-1" data-testid="error-login-password">
                          <XCircle className="h-3 w-3 shrink-0" />
                          {loginForm.formState.errors.password.message}
                        </p>
                      )}
                      <PasswordRequirements password={loginForm.watch("password")} />
                      <div className="flex justify-end">
                        <Link
                          href="/forgot-password"
                          className="text-xs text-primary hover:text-primary/80 underline underline-offset-2 transition-colors"
                          data-testid="link-forgot-password"
                        >
                          Forgot password?
                        </Link>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={loginMutation.isPending}
                      data-testid="button-submit-login"
                    >
                      {loginMutation.isPending ? (
                        <span className="flex items-center gap-2">
                          <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground" />
                          Signing in…
                        </span>
                      ) : (
                        "Sign In"
                      )}
                    </Button>
                    <OAuthButtons />
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Sign Up Tab ────────────────────────────────────────── */}
            <TabsContent value="register">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    Create Account
                  </CardTitle>
                  <CardDescription>
                    Join QR Manager and start creating professional QR codes today.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">

                    {/* Inline error banner */}
                    {registerAlert && (
                      <InlineAlert
                        type="error"
                        title={registerAlert.title}
                        message={registerAlert.message}
                        onDismiss={() => setRegisterAlert(null)}
                      />
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="register-username">Username</Label>
                      <Input
                        id="register-username"
                        data-testid="input-register-username"
                        placeholder="Choose a username"
                        {...registerForm.register("username")}
                        className={registerForm.formState.errors.username ? "border-destructive" : ""}
                      />
                      {registerForm.formState.errors.username && (
                        <p className="text-xs text-destructive flex items-center gap-1" data-testid="error-register-username">
                          <XCircle className="h-3 w-3 shrink-0" />
                          {registerForm.formState.errors.username.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="register-email">
                        Email <span className="text-muted-foreground font-normal text-xs">(required for password reset)</span>
                      </Label>
                      <Input
                        id="register-email"
                        data-testid="input-register-email"
                        type="email"
                        placeholder="you@example.com"
                        {...registerForm.register("email")}
                        className={registerForm.formState.errors.email ? "border-destructive" : ""}
                      />
                      {registerForm.formState.errors.email && (
                        <p className="text-xs text-destructive flex items-center gap-1" data-testid="error-register-email">
                          <XCircle className="h-3 w-3 shrink-0" />
                          {registerForm.formState.errors.email.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="register-password">Password</Label>
                      <div className="relative">
                        <Input
                          id="register-password"
                          data-testid="input-register-password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Create a password"
                          {...registerForm.register("password")}
                          className={registerForm.formState.errors.password ? "border-destructive pr-10" : "pr-10"}
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          onClick={() => setShowPassword(!showPassword)}
                          data-testid="button-toggle-register-password"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {registerForm.formState.errors.password && (
                        <p className="text-xs text-destructive flex items-center gap-1" data-testid="error-register-password">
                          <XCircle className="h-3 w-3 shrink-0" />
                          {registerForm.formState.errors.password.message}
                        </p>
                      )}
                      <PasswordRequirements password={registerForm.watch("password")} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="register-confirm-password">Confirm Password</Label>
                      <div className="relative">
                        <Input
                          id="register-confirm-password"
                          data-testid="input-register-confirm-password"
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Confirm your password"
                          {...registerForm.register("confirmPassword")}
                          className={registerForm.formState.errors.confirmPassword ? "border-destructive pr-10" : "pr-10"}
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          data-testid="button-toggle-confirm-password"
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {registerForm.formState.errors.confirmPassword && (
                        <p className="text-xs text-destructive flex items-center gap-1" data-testid="error-register-confirm-password">
                          <XCircle className="h-3 w-3 shrink-0" />
                          {registerForm.formState.errors.confirmPassword.message}
                        </p>
                      )}
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={registerMutation.isPending}
                      data-testid="button-submit-register"
                    >
                      {registerMutation.isPending ? (
                        <span className="flex items-center gap-2">
                          <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground" />
                          Creating Account…
                        </span>
                      ) : (
                        "Create Account"
                      )}
                    </Button>
                    <OAuthButtons />
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* ── Right Column – Hero ───────────────────────────────────────── */}
        <div className="hidden lg:block">
          <div className="text-center">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 mb-8 border border-border">
              <QrCode className="w-24 h-24 text-primary mx-auto mb-6" />
              <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                Professional QR Code Management
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Create, customize, and track QR codes with advanced analytics and professional features.
              </p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {[
                  "Multiple QR Types",
                  "Custom Styling",
                  "Analytics Tracking",
                  "Secure & Reliable",
                ].map((feature) => (
                  <div key={feature} className="flex items-center text-gray-600 dark:text-gray-400">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full mr-2 shrink-0" />
                    {feature}
                  </div>
                ))}
              </div>
            </div>
            <div className="text-gray-600 dark:text-gray-400">
              <p className="font-medium">Trusted by thousands of users worldwide</p>
              <p className="text-sm mt-1">No credit card required • Start free today</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}