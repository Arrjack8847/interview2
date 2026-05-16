import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { LogOut, Menu, Sparkles, UserRound } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/context/AuthContext";

const PUBLIC_LINKS = [{ to: "/", label: "Home" }] as const;

const AUTH_LINKS = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/resume", label: "Resume" },
  { to: "/start", label: "Start Practice" },
  { to: "/history", label: "History" },
] as const;

export function Navbar() {
  const navigate = useNavigate();
  const { user, loading, logout } = useAuth();

  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const displayName = user?.displayName || user?.email?.split("@")[0] || "Student";

  const navLinks = user ? AUTH_LINKS : PUBLIC_LINKS;

  const isActive = (to: string) => {
    if (to === "/") {
      return pathname === "/";
    }

    return pathname === to || pathname.startsWith(`${to}/`);
  };

  const handleLogout = async () => {
    await logout();
    setOpen(false);
    navigate({ to: "/" });
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary-gradient shadow-elegant">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </span>

          <span className="font-display text-lg font-semibold tracking-tight">
            InterviewReady<span className="text-primary-gradient"> AI</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => {
            const active = isActive(link.to);

            return (
              <Link
                key={link.to}
                to={link.to}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {!loading && user ? (
            <>
              <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm">
                <UserRound className="h-4 w-4 text-primary" />
                <span className="max-w-32 truncate">{displayName}</span>
              </div>

              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="outline">
                <Link to="/login">Login</Link>
              </Button>

              <Button
                asChild
                className="bg-primary-gradient text-primary-foreground shadow-elegant hover:opacity-90"
              >
                <Link to="/register">Register</Link>
              </Button>
            </>
          )}
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>

          <SheetContent side="right" className="w-72">
            <div className="mt-8 flex flex-col gap-2">
              {user && (
                <div className="mb-3 rounded-2xl border border-border bg-card p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Signed in as
                  </p>
                  <p className="mt-1 truncate font-medium">{displayName}</p>
                  {user.email && (
                    <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                  )}
                </div>
              )}

              {navLinks.map((link) => {
                const active = isActive(link.to);

                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setOpen(false)}
                    className={`rounded-lg px-3 py-3 text-sm font-medium transition-colors ${
                      active ? "bg-accent text-accent-foreground" : "text-foreground hover:bg-muted"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}

              {!loading && user ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="mt-2 inline-flex items-center justify-center rounded-lg border border-border px-3 py-3 text-sm font-semibold text-foreground hover:bg-muted"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </button>
              ) : (
                <div className="mt-2 grid gap-2">
                  <Link
                    to="/login"
                    onClick={() => setOpen(false)}
                    className="rounded-lg border border-border px-3 py-3 text-center text-sm font-semibold hover:bg-muted"
                  >
                    Login
                  </Link>

                  <Link
                    to="/register"
                    onClick={() => setOpen(false)}
                    className="rounded-lg bg-primary-gradient px-3 py-3 text-center text-sm font-semibold text-primary-foreground"
                  >
                    Register
                  </Link>
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
