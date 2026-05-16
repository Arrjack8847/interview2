import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Register - InterviewReady AI" },
      {
        name: "description",
        content:
          "Create your InterviewReady AI account to start practicing interviews with AI feedback.",
      },
      { property: "og:title", content: "Register - InterviewReady AI" },
      {
        property: "og:description",
        content: "Create an account to start practicing.",
      },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading, register } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      navigate({ to: "/dashboard" });
    }
  }, [authLoading, user, navigate]);

  const handleRegister = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      await register(name, email, password);
      navigate({ to: "/dashboard" });
    } catch (error) {
      console.error("Register page error:", error);

      const message = error instanceof Error ? error.message : "";
      const normalizedMessage = message.toLowerCase();

      if (normalizedMessage.includes("already registered")) {
        setError("This email is already registered. Try logging in instead.");
      } else if (normalizedMessage.includes("password")) {
        setError("Password is too weak. Use at least 6 characters.");
      } else if (normalizedMessage.includes("invalid email")) {
        setError("Please enter a valid email address.");
      } else if (normalizedMessage.includes("supabase is not configured")) {
        setError("Supabase is not configured. Check your .env.local file.");
      } else if (message) {
        setError(message);
      } else {
        setError("Failed to create account. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-hero-gradient px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-gradient shadow-elegant">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </span>

          <span className="font-display text-xl font-semibold">
            InterviewReady<span className="text-primary-gradient"> AI</span>
          </span>
        </Link>

        <div className="rounded-3xl border border-border bg-card p-8 shadow-elegant">
          <h1 className="font-display text-2xl font-bold">Create your account</h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Start practicing with AI-powered feedback in minutes.
          </p>

          {error && (
            <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>

              <Input
                id="name"
                required
                placeholder="Jane Student"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>

              <Input
                id="email"
                type="email"
                required
                placeholder="you@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>

              <Input
                id="password"
                type="password"
                required
                minLength={6}
                placeholder="********"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <p className="text-xs text-muted-foreground">
                Password must be at least 6 characters.
              </p>
            </div>

            <Button
              type="submit"
              disabled={loading || authLoading}
              className="w-full bg-primary-gradient text-primary-foreground shadow-elegant hover:opacity-90 disabled:opacity-60"
            >
              {loading ? "Creating account..." : "Create account"}
            </Button>
          </form>

          <Button type="button" variant="outline" className="mt-3 w-full opacity-70" disabled>
            Demo user disabled for Phase 4
          </Button>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="font-medium text-primary hover:underline">
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
