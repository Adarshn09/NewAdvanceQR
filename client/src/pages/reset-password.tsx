import { useState } from "react";
import { useLocation, Link } from "wouter";
import { QrCode, Eye, EyeOff, KeyRound, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Parse ?token= from the URL */
function useQueryParam(name: string): string | null {
  const search = typeof window !== "undefined" ? window.location.search : "";
  return new URLSearchParams(search).get(name);
}

const strongPassword = z
  .string()
  .min(8, "At least 8 characters")
  .refine((v) => /[A-Z]/.test(v), { message: "One uppercase letter" })
  .refine((v) => /[a-z]/.test(v), { message: "One lowercase letter" })
  .refine((v) => /[0-9]/.test(v), { message: "One number" })
  .refine((v) => /[^A-Za-z0-9]/.test(v), { message: "One special character" });

const schema = z
  .object({
    password: strongPassword,
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type FormData = z.infer<typeof schema>;

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
          className={`flex items-center gap-1.5 text-xs ${r.valid ? "text-green-600" : "text-red-500"}`}
        >
          {r.valid ? (
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <XCircle className="h-3.5 w-3.5 shrink-0" />
          )}
          {r.label}
        </li>
      ))}
    </ul>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ResetPasswordPage() {
  const token = useQueryParam("token");
  const [, navigate] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  // No token in URL
  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-3 text-center py-4">
              <AlertCircle className="h-10 w-10 text-amber-500" />
              <h2 className="text-lg font-semibold text-gray-900">Invalid Reset Link</h2>
              <p className="text-sm text-gray-600">
                This password reset link is missing or malformed. Please request a new one.
              </p>
              <Link
                href="/forgot-password"
                className="mt-2 text-sm font-medium text-primary hover:text-primary/80 underline underline-offset-2"
              >
                Request new reset link
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const onSubmit = async (data: FormData) => {
    setStatus("loading");
    setErrorMessage("");
    try {
      const res = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: data.password }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErrorMessage(json.message || "Something went wrong");
        setStatus("error");
        return;
      }
      setStatus("success");
      // Redirect to login after 2.5 s
      setTimeout(() => navigate("/auth"), 2500);
    } catch {
      setErrorMessage("Network error. Please try again.");
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <QrCode className="text-primary text-3xl mr-3" />
            <h1 className="text-2xl font-bold text-gray-900">QR Manager</h1>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              Reset Password
            </CardTitle>
            <CardDescription>Choose a new password for your account.</CardDescription>
          </CardHeader>

          <CardContent>
            {status === "success" ? (
              <div className="flex flex-col items-center gap-3 text-center py-4">
                <CheckCircle2 className="h-12 w-12 text-green-500" />
                <h3 className="text-lg font-semibold text-gray-900">Password Reset!</h3>
                <p className="text-sm text-gray-600">
                  Your password has been updated. Redirecting you to the login page…
                </p>
              </div>
            ) : (
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {/* New password */}
                <div className="space-y-2">
                  <Label htmlFor="rp-password">New Password</Label>
                  <div className="relative">
                    <Input
                      id="rp-password"
                      data-testid="input-reset-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter new password"
                      {...form.register("password")}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      onClick={() => setShowPassword(!showPassword)}
                      data-testid="button-toggle-reset-password"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {form.formState.errors.password && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.password.message}
                    </p>
                  )}
                  <PasswordRequirements password={form.watch("password")} />
                </div>

                {/* Confirm password */}
                <div className="space-y-2">
                  <Label htmlFor="rp-confirm">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id="rp-confirm"
                      data-testid="input-reset-confirm-password"
                      type={showConfirm ? "text" : "password"}
                      placeholder="Confirm new password"
                      {...form.register("confirmPassword")}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      onClick={() => setShowConfirm(!showConfirm)}
                      data-testid="button-toggle-reset-confirm"
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {form.formState.errors.confirmPassword && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                {/* Error banner */}
                {status === "error" && (
                  <div className="flex items-start gap-2 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    {errorMessage}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={status === "loading"}
                  data-testid="button-submit-reset"
                >
                  {status === "loading" ? "Resetting…" : "Reset Password"}
                </Button>

                <div className="text-center">
                  <Link
                    href="/auth"
                    className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    Back to Sign In
                  </Link>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
