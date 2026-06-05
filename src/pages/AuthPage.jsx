import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import {
  BookOpenText,
  LoaderCircle,
  LockKeyhole,
  Mail,
  Torus,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

function getAuthMessage(error) {
  if (!error) return "";

  if (error.message === "Invalid login credentials") {
    return "The email or password you entered is incorrect.";
  }

  if (error.message.includes("Email not confirmed")) {
    return "Please confirm your email address before signing in.";
  }

  if (error.message.includes("User already registered")) {
    return "An account with this email already exists. Please sign in instead.";
  }

  if (error.message.includes("Password should be at least")) {
    return "Your password is too short. Please use at least 6 characters.";
  }

  return error.message;
}

export default function AuthPage() {
  const { signIn, signUp, user, supabaseConfigError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const destination = location.state?.from?.pathname || "/dashboard";
  const isRegistering = mode === "register";

  if (user) {
    return <Navigate to={destination} replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (supabaseConfigError) {
      setMessage(supabaseConfigError);
      return;
    }

    setMessage("");
    setSubmitting(true);

    const authAction = isRegistering ? signUp : signIn;
    const { data, error } = await authAction(email, password);

    setSubmitting(false);

    if (error) {
      setMessage(getAuthMessage(error));
      return;
    }

    if (isRegistering && !data.session) {
      setMessage(
        "Account created. Please check your email and confirm your address before signing in.",
      );
      setMode("login");
      setPassword("");
      return;
    }

    navigate(destination, { replace: true });
  }

  return (
    <main className="min-h-screen px-5 py-8 text-indigo sm:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center">
        <section className="grid w-full gap-10 lg:grid-cols-[1fr_440px] lg:items-center">
          <div className="relative max-w-2xl">
            <div className="zen-float absolute -left-20 -top-20 h-56 w-56 rounded-full bg-sakura/30 blur-3xl" />
            <div className="zen-float absolute right-0 top-28 h-48 w-48 rounded-full bg-vermilion/15 blur-3xl [animation-delay:1.2s]" />
            <div className="relative mb-9 inline-flex items-center gap-3 border-b border-sakura/70 pb-3">
              <Torus className="h-7 w-7 text-vermilion" />
              <span className="font-mincho text-xl">Mochi</span>
            </div>
            <p className="relative mb-5 font-mincho text-5xl leading-tight sm:text-6xl">
              Build your Japanese study space
            </p>
            <p className="relative max-w-xl text-base leading-8 text-ink/80 sm:text-lg">
              A calm place to collect lessons, track Japanese study progress,
              and prepare focused practice from your own material.
            </p>
          </div>

          <div className="zen-glass p-7 sm:p-9">
            <div className="mb-8 flex items-center justify-between gap-4">
              <div>
                <h1 className="font-mincho text-3xl text-indigo">
                  {isRegistering ? "Begin your journey" : "Welcome back"}
                </h1>
                <p className="mt-2 text-sm text-ink/70">
                  {isRegistering
                    ? "Create a quiet space for your Japanese practice."
                    : "Sign in to continue your study rhythm."}
                </p>
              </div>
              <BookOpenText className="h-9 w-9 text-vermilion" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-ink">
                  Email
                </span>
                <span className="flex items-center gap-3 rounded border border-indigo/10 bg-washi px-4 py-3 transition focus-within:border-sakura">
                  <Mail className="h-5 w-5 text-vermilion" />
                  <input
                    className="w-full bg-transparent text-indigo placeholder:text-ink/40 focus:outline-none"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                  />
                </span>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-ink">
                  Password
                </span>
                <span className="flex items-center gap-3 rounded border border-indigo/10 bg-washi px-4 py-3 transition focus-within:border-sakura">
                  <LockKeyhole className="h-5 w-5 text-vermilion" />
                  <input
                    className="w-full bg-transparent text-indigo placeholder:text-ink/40 focus:outline-none"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="At least 6 characters"
                    autoComplete={
                      isRegistering ? "new-password" : "current-password"
                    }
                    minLength={6}
                    required
                  />
                </span>
              </label>

              {message ? (
                <p className="rounded bg-sakura/20 px-4 py-3 text-sm text-indigo">
                  {message}
                </p>
              ) : null}

              {supabaseConfigError ? (
                <p className="rounded border border-vermilion/20 bg-vermilion/10 px-4 py-3 text-sm leading-6 text-indigo">
                  Create a local .env file from .env.example and add your
                  Supabase Project URL plus anon public key, then restart the
                  dev server.
                </p>
              ) : null}

              <button
                type="submit"
                disabled={submitting}
                className="zen-shimmer flex w-full items-center justify-center gap-2 rounded bg-indigo px-5 py-3 font-semibold text-washi shadow-soft transition hover:bg-indigo/95 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? (
                  <LoaderCircle className="h-5 w-5 animate-spin" />
                ) : null}
                {isRegistering ? "Create account" : "Sign in"}
              </button>
            </form>

            <div className="mt-7 border-t border-indigo/10 pt-5 text-center text-sm text-ink/70">
              {isRegistering ? "Already have an account?" : "New to Mochi?"}{" "}
              <button
                type="button"
                onClick={() => {
                  setMode(isRegistering ? "login" : "register");
                  setMessage("");
                }}
                className="font-semibold text-vermilion underline decoration-sakura/80 underline-offset-4 transition hover:text-indigo"
              >
                {isRegistering ? "Sign in instead" : "Create an account"}
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
