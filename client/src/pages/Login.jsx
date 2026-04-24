import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  Phone,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  X,
} from "lucide-react";
import logo from "../assets/logo-ih.png";

function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotPhone, setForgotPhone] = useState("");
  const [forgotMessage, setForgotMessage] = useState(
    "Hello Admin, please reset my password."
  );
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState("");
  const [forgotError, setForgotError] = useState("");

  useEffect(() => {
    if (user?.role === "ADMIN") {
      navigate("/admin");
    } else if (user?.role === "ADVISOR") {
      navigate("/advisor");
    }
  }, [user, navigate]);

  const handleLogin = async () => {
    try {
      setLoading(true);
      setErrorMsg("");

      const data = await login(phone.trim(), password);

      if (data?.user?.role === "ADMIN") {
        navigate("/admin");
      } else {
        navigate("/advisor");
      }
    } catch (error) {
      console.error("Login error:", error);

      const backendMessage =
        error?.response?.data?.message || error?.message || "Login failed";

      setErrorMsg(backendMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    try {
      setForgotLoading(true);
      setForgotError("");
      setForgotSuccess("");

      const res = await fetch(
        "/auth/forgot-password-request",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            phone: forgotPhone.trim(),
            message: forgotMessage.trim(),
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Failed to send request");
      }

      setForgotSuccess(
        data?.message || "Password reset request sent to admin successfully."
      );
      setForgotPhone("");
      setForgotMessage("Hello Admin, please reset my password.");
    } catch (error) {
      console.error("Forgot password error:", error);
      setForgotError(error.message || "Something went wrong");
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="relative h-[100svh] overflow-hidden bg-[#031b61] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_left_top,_rgba(37,99,235,0.34),_transparent_28%),radial-gradient(circle_at_right_center,_rgba(6,182,212,0.14),_transparent_25%),linear-gradient(135deg,_#031b61_0%,_#08245f_30%,_#03113d_72%,_#020617_100%)]" />

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute bottom-[-140px] right-[-100px] h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute left-[45%] top-[20%] h-56 w-56 rounded-full bg-blue-400/10 blur-3xl" />
      </div>

      <div className="pointer-events-none absolute right-6 top-5 z-20 hidden items-center gap-2 text-xs text-white/72 lg:flex">
        <ShieldCheck size={15} />
        <span>Powered by insurehubballi</span>
      </div>

      <div className="relative z-10 mx-auto grid h-[100svh] max-w-[1450px] grid-cols-1 lg:grid-cols-[0.9fr_1fr]">
        <div className="hidden items-center justify-center px-8 lg:flex xl:px-12">
          <div className="w-full max-w-[470px]">
            <div className="mb-5 inline-flex rounded-[2.1rem] border border-blue-200/25 bg-white/95 p-3 shadow-[0_0_40px_rgba(96,165,250,0.28)]">
              <img
                src={logo}
                alt="insurehubballi"
                className="h-[150px] w-[150px] rounded-[1.55rem] object-contain xl:h-[170px] xl:w-[170px]"
              />
            </div>

            <h1 className="text-[44px] font-extrabold leading-[1.04] tracking-[-0.04em] text-white xl:text-[52px]">
              Secure leads.
              <br />
              Build trust.
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-sky-300 to-cyan-300 bg-clip-text text-transparent">
                Grow smarter.
              </span>
            </h1>

            <div className="mt-4 h-[3px] w-14 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500" />

            <p className="mt-6 max-w-[430px] text-sm leading-7 text-blue-100/76 xl:text-[15px]">
              A premium CRM experience built for insurance advisors and admins.
              Manage clients, follow-ups, templates, and communication — all in
              one powerful platform.
            </p>
          </div>
        </div>

        <div className="flex h-[100svh] items-center justify-center px-4 py-3 sm:px-8 lg:justify-start lg:px-8 xl:px-10">
          <div className="flex h-full w-full max-w-[520px] flex-col justify-center lg:block lg:h-auto">
            <div className="mb-3 flex flex-col items-center justify-center lg:hidden">
              <div className="flex h-[86px] w-[86px] items-center justify-center rounded-[22px] border border-blue-200/20 bg-white/95 p-3 shadow-[0_0_30px_rgba(96,165,250,0.30)]">
                <img
                  src={logo}
                  alt="insurehubballi"
                  className="h-full w-full object-contain"
                />
              </div>

              <h1 className="mt-2.5 text-[27px] font-black leading-none tracking-tight">
                insurehubballi
              </h1>
              <p className="mt-1 text-xs font-medium text-blue-100/70">
                Your cover Our Care
              </p>
            </div>

            <div className="rounded-[1.55rem] border border-white/14 bg-[linear-gradient(180deg,rgba(18,41,112,0.92),rgba(12,31,88,0.90))] px-5 py-4 shadow-[0_18px_65px_rgba(0,0,0,0.34)] backdrop-blur-2xl sm:px-7 sm:py-7 lg:px-8 lg:py-8">
              <div className="mb-3.5 lg:mb-6">
                <div className="mb-2.5 inline-flex rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-1.5 text-xs font-bold text-white shadow-lg sm:text-sm">
                  Welcome back
                </div>

                <p className="mb-2.5 text-[11px] font-black uppercase tracking-[0.18em] text-cyan-300 lg:hidden">
                  Secure leads · Build trust · Grow smarter
                </p>

                <h2 className="text-[30px] font-black tracking-tight text-white sm:text-4xl lg:text-[42px]">
                  Login
                </h2>

                <p className="mt-1.5 text-[13px] leading-5 text-blue-100/72 sm:text-[15px] sm:leading-6">
                  Enter your mobile number and password to continue
                </p>
              </div>

              <div className="space-y-3 sm:space-y-5">
                <div>
                  <label className="mb-1.5 block text-[13px] font-bold text-white/95 sm:text-sm">
                    Mobile Number
                  </label>

                  <div className="flex h-11 items-center rounded-2xl border border-white/12 bg-[#071b54]/90 px-4 shadow-inner sm:h-14">
                    <Phone className="mr-3 text-white/42" size={18} />
                    <input
                      type="text"
                      placeholder="Enter mobile number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="h-full w-full bg-transparent text-sm text-white outline-none placeholder:text-white/38 sm:text-base"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-[13px] font-bold text-white/95 sm:text-sm">
                    Password
                  </label>

                  <div className="flex h-11 items-center rounded-2xl border border-white/12 bg-[#071b54]/90 px-4 shadow-inner sm:h-14">
                    <Lock className="mr-3 text-white/42" size={18} />
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-full w-full bg-transparent text-sm text-white outline-none placeholder:text-white/38 sm:text-base"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="ml-3 text-white/45 transition hover:text-white/70"
                    >
                      {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotModal(true);
                      setForgotError("");
                      setForgotSuccess("");
                      setForgotPhone(phone);
                    }}
                    className="text-sm font-semibold text-sky-400 transition hover:text-cyan-300"
                  >
                    Forgot password?
                  </button>
                </div>

                {errorMsg ? (
                  <div className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-2 text-xs text-red-300 sm:text-sm">
                    {errorMsg}
                  </div>
                ) : null}

                <button
                  onClick={handleLogin}
                  disabled={loading}
                  className="group flex h-11 w-full items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-sm font-bold shadow-lg transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_10px_35px_rgba(37,99,235,0.45)] disabled:opacity-70 sm:h-14 sm:text-base"
                >
                  <span>{loading ? "Logging in..." : "Login to Dashboard"}</span>
                  <ArrowRight
                    className="ml-3 transition-transform duration-300 group-hover:translate-x-1"
                    size={21}
                  />
                </button>
              </div>

              <div className="mt-3.5 border-t border-white/10 pt-3 text-center text-[11px] text-white/52 sm:mt-6 sm:pt-5 sm:text-xs">
                insurehubballi • Your cover Our Care
              </div>
            </div>

            <p className="mt-3 hidden text-center text-[11px] font-medium leading-4 text-blue-100/60 lg:hidden min-[390px]:block">
              Smart CRM for advisors — simple, fast, and built for daily follow-ups.
            </p>
          </div>
        </div>
      </div>

      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[1.7rem] border border-white/10 bg-slate-950/95 p-5 shadow-2xl sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold">Forgot Password</h3>
                <p className="mt-1 text-sm text-blue-100/70">
                  Send password reset request to admin
                </p>
              </div>

              <button
                onClick={() => setShowForgotModal(false)}
                className="rounded-full p-1 text-slate-300 transition hover:bg-white/10 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Mobile Number
                </label>
                <input
                  type="text"
                  placeholder="Enter your mobile number"
                  value={forgotPhone}
                  onChange={(e) => setForgotPhone(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3 text-white outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Message to Admin
                </label>
                <textarea
                  rows="4"
                  value={forgotMessage}
                  onChange={(e) => setForgotMessage(e.target.value)}
                  className="w-full resize-none rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3 text-white outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30"
                />
              </div>

              {forgotError ? (
                <div className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {forgotError}
                </div>
              ) : null}

              {forgotSuccess ? (
                <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                  {forgotSuccess}
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => setShowForgotModal(false)}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-medium transition hover:bg-white/10"
                >
                  Cancel
                </button>

                <button
                  onClick={handleForgotPassword}
                  disabled={forgotLoading}
                  className="rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-3 font-semibold transition hover:brightness-110 disabled:opacity-60"
                >
                  {forgotLoading ? "Sending..." : "Send Request"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Login;
