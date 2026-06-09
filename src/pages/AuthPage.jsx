import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import {
  BookOpenText,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Mail,
  Torus,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

function getAuthMessage(error) {
  if (!error) return "";

  if (error.message === "Invalid login credentials") {
    return "Email hoặc mật khẩu không đúng. Vui lòng kiểm tra lại.";
  }

  if (error.message.includes("Email not confirmed")) {
    return "Vui lòng xác nhận địa chỉ email trước khi đăng nhập.";
  }

  if (error.message.includes("User already registered")) {
    return "Tài khoản với email này đã tồn tại. Vui lòng đăng nhập thay vào đó.";
  }

  if (error.message.includes("Password should be at least")) {
    return "Mật khẩu quá ngắn. Vui lòng dùng ít nhất 6 ký tự.";
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
  const [showPassword, setShowPassword] = useState(false);
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
        "Tài khoản đã được tạo. Vui lòng kiểm tra email và xác nhận địa chỉ trước khi đăng nhập.",
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
            <motion.p 
              className="relative mb-5 font-mincho text-5xl leading-tight sm:text-6xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              Không gian học tiếng Nhật của bạn
            </motion.p>
            <motion.p 
              className="relative max-w-xl text-base leading-8 text-ink/80 sm:text-lg"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            >
              Nơi yên tĩnh để tổ chức bài học, theo dõi tiến độ và
              luyện tập tập trung từ tài liệu của chính bạn.
            </motion.p>
          </div>

          <div className="zen-glass p-7 sm:p-9">
            <div className="mb-8 flex items-center justify-between gap-4">
              <div>
                <h1 className="font-mincho text-3xl text-indigo">
                  {isRegistering ? "Bắt đầu hành trình" : "Chào mừng trở lại"}
                </h1>
                <p className="mt-2 text-sm text-ink/70">
                  {isRegistering
                    ? "Tạo không gian học tiếng Nhật của riêng bạn."
                    : "Đăng nhập để tiếp tục nhịp học của bạn."}
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
                    placeholder="ban@example.com"
                    autoComplete="email"
                    required
                  />
                </span>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-ink">
                  Mật khẩu
                </span>
                <span className="flex items-center gap-3 rounded border border-indigo/10 bg-washi px-4 py-3 transition focus-within:border-sakura">
                  <LockKeyhole className="h-5 w-5 shrink-0 text-vermilion" />
                  <input
                    className="w-full bg-transparent text-indigo placeholder:text-ink/40 focus:outline-none"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Ít nhất 6 ký tự"
                    autoComplete={
                      isRegistering ? "new-password" : "current-password"
                    }
                    minLength={6}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="shrink-0 text-ink/40 transition hover:text-indigo"
                    aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </span>
              </label>

              {message ? (
                <p className="rounded bg-sakura/20 px-4 py-3 text-sm text-indigo">
                  {message}
                </p>
              ) : null}

              {supabaseConfigError ? (
                <p className="rounded border border-vermilion/20 bg-vermilion/10 px-4 py-3 text-sm leading-6 text-indigo">
                  Tạo file .env từ .env.example và thêm Supabase Project URL
                  cùng anon public key, sau đó khởi động lại dev server.
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
                {isRegistering ? "Tạo tài khoản" : "Đăng nhập"}
              </button>
            </form>

            <div className="mt-7 border-t border-indigo/10 pt-5 text-center text-sm text-ink/70">
              {isRegistering ? "Đã có tài khoản?" : "Chưa có tài khoản?"}{" "}
              <button
                type="button"
                onClick={() => {
                  setMode(isRegistering ? "login" : "register");
                  setMessage("");
                }}
                className="font-semibold text-vermilion underline decoration-sakura/80 underline-offset-4 transition hover:text-indigo"
              >
                {isRegistering ? "Đăng nhập thay vào đó" : "Tạo tài khoản mới"}
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
