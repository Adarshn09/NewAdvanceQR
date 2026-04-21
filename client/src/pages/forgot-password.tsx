import { useState } from "react";
import { Link } from "wouter";
import { QrCode, ArrowLeft, Mail, ExternalLink, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const schema = z.object({
  username: z.string().min(1, "Username is required"),
});
type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);
  const [serverMessage, setServerMessage] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { username: "" },
  });

  const onSubmit = async (data: FormData) => {
    setStatus("loading");
    setDevResetUrl(null);
    setErrorMessage("");
    setServerMessage("");
    try {
      const res = await fetch("/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: data.username }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErrorMessage(json.message || "Something went wrong");
        setStatus("error");
        return;
      }
      // In dev mode the server returns the reset URL directly
      if (json.resetUrl) setDevResetUrl(json.resetUrl);
      setServerMessage(json.message || "");
      setStatus("success");
    } catch {
      setErrorMessage("Network error. Please try again.");
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <QrCode className="text-primary text-3xl mr-3" />
            <h1 className="text-2xl font-bold text-gray-900">QR Manager</h1>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Forgot Password
            </CardTitle>
            <CardDescription>
              Enter your username and we'll generate a password reset link for you.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {status !== "success" ? (
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fp-username">Username</Label>
                  <Input
                    id="fp-username"
                    data-testid="input-forgot-username"
                    placeholder="Enter your username"
                    {...form.register("username")}
                  />
                  {form.formState.errors.username && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.username.message}
                    </p>
                  )}
                </div>

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
                  data-testid="button-submit-forgot"
                >
                  {status === "loading" ? "Sending…" : "Send Reset Link"}
                </Button>
              </form>
            ) : (
              /* ── Success state ── */
              <div className="space-y-4">
                <div className="flex items-start gap-3 rounded-md bg-green-50 border border-green-200 p-4 text-sm text-green-800">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-semibold">
                      {devResetUrl ? "Reset link generated!" : "Check your email!"}
                    </p>
                    <p className="mt-1 text-green-700">
                      {serverMessage || "If that account exists and has an email on file, a reset link has been sent."}
                    </p>
                  </div>
                </div>

                {/* Dev-mode link display */}
                {devResetUrl && (
                  <div className="rounded-md bg-amber-50 border border-amber-200 p-4 space-y-2">
                    <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide">
                      🛠️ Development mode — reset link
                    </p>
                    <p className="text-xs text-amber-700">
                      In production this would be emailed. For now, use this link:
                    </p>
                    <a
                      href={devResetUrl}
                      data-testid="link-dev-reset-url"
                      className="flex items-center gap-1.5 text-sm font-medium text-primary underline underline-offset-2 break-all hover:text-primary/80 transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                      {devResetUrl}
                    </a>
                  </div>
                )}

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setStatus("idle");
                    setDevResetUrl(null);
                    form.reset();
                  }}
                >
                  Try another username
                </Button>
              </div>
            )}

            {/* Back to login */}
            <div className="mt-4 text-center">
              <Link
                href="/auth"
                className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Sign In
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
