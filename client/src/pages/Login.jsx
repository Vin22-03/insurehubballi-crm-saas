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
        error?.response?.data?.message ||
        error?.message ||
        "Login failed";

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
        "http://localhost:5000/auth/forgot-password-request",
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
    <div className="relative min-h-screen overflow-hidden bg-[#031b61] text-white">
      {/* Main background gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_left_top,_rgba(37,99,235,0.38),_transparent_28%),radial-gradient(circle_at_right_center,_rgba(6,182,212,0.15),_transparent_24%),linear-gradient(135deg,_#031b61_0%,_#08245f_28%,_#03113d_70%,_#020617_100%)]" />

      {/* Soft glowing orbs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-16 -top-16 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute bottom-[-120px] right-[-80px] h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute left-[44%] top-[22%] h-56 w-56 rounded-full bg-blue-400/10 blur-3xl" />
      </div>

      {/* Subtle line-wave effect */}
      <div className="pointer-events-none absolute inset-0 opacity-20">
        <svg
          className="h-full w-full"
          viewBox="0 0 1600 900"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
        >
          <path
            d="M0 720C170 690 280 650 400 620C560 580 670 585 770 640C910 715 1000 700 1110 640C1240 570 1350 560 1600 640"
            stroke="url(#paint0)"
            strokeWidth="1.4"
          />
          <path
            d="M0 760C180 725 320 700 430 675C575 640 690 642 790 690C925 755 1035 742 1140 690C1260 628 1370 620 1600 700"
            stroke="url(#paint1)"
            strokeWidth="1"
          />
          <defs>
            <linearGradient id="paint0" x1="0" y1="600" x2="1600" y2="600">
              <stop stopColor="transparent" />
              <stop offset="0.5" stopColor="#3B82F6" />
              <stop offset="1" stopColor="transparent" />
            </linearGradient>
            <linearGradient id="paint1" x1="0" y1="700" x2="1600" y2="700">
              <stop stopColor="transparent" />
              <stop offset="0.5" stopColor="#22D3EE" />
              <stop offset="1" stopColor="transparent" />
            </linearGradient>
          </defs>
        </svg>
      </div>


      {/* Top badges */}
      <div className="pointer-events-none absolute left-8 top-8 z-20 hidden lg:block">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-medium text-blue-50 shadow-lg backdrop-blur-xl">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          Insurance CRM Platform
        </div>
      </div>

      <div className="pointer-events-none absolute right-8 top-8 z-20 hidden lg:flex items-center gap-2 text-sm text-white/75">
        <ShieldCheck size={18} />
        <span>Trusted • Secure • Reliable</span>
      </div>

      {/* Layout */}
      <div className="relative z-10 mx-auto grid min-h-screen max-w-[1600px] lg:grid-cols-[1fr_1fr]">
        {/* Left side */}
        <div className="hidden lg:flex items-center justify-end px-10 xl:px-16">
          <div className="w-full max-w-[560px] pr-4">
            <div className="mb-8">
              <div className="inline-flex rounded-[2.7rem] border border-blue-200/30 bg-white/95 p-4 shadow-[0_0_55px_rgba(96,165,250,0.35)]">
                <img
                  src={logo}
                  alt="insurehubballi"
                  className="h-[190px] w-[190px] rounded-[2rem] object-contain"
                />
              </div>
            </div>

            <h1 className="text-[64px] font-extrabold leading-[1.03] tracking-[-0.04em] text-white">
              Secure leads.
              <br />
              Build trust.
              <br />
              <span className="bg-gradient-to-r from-blue-500 via-sky-400 to-cyan-300 bg-clip-text text-transparent">
                Grow smarter.
              </span>
            </h1>

            <div className="mt-6 h-1 w-20 rounded-full bg-gradient-to-r from-sky-400 to-cyan-300" />

            <p className="mt-8 max-w-[500px] text-[17px] leading-9 text-blue-100/78">
              A premium CRM experience built for insurance advisors and admins.
              Manage clients, follow-ups, templates, and communication — all in
              one powerful platform.
            </p>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center justify-center px-5 py-8 sm:px-8 lg:justify-start lg:px-10 xl:px-14">
          <div className="w-full max-w-[610px]">
            {/* Mobile branding */}
            <div className="mb-8 flex flex-col items-center text-center lg:hidden">
              <div className="inline-flex rounded-[2rem] border border-blue-200/20 bg-white/95 p-3 shadow-[0_0_35px_rgba(96,165,250,0.28)]">
                <img
                  src={logo}
                  alt="insurehubballi"
                  className="h-28 w-28 rounded-[1.4rem] object-contain"
                />
              </div>

              <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-blue-50 backdrop-blur-xl">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                Insurance CRM Platform
              </div>

              <h1 className="mt-6 text-4xl font-extrabold tracking-tight">
                Welcome back
              </h1>
              <p className="mt-2 text-sm text-blue-100/70">
                Login to your insurance CRM dashboard
              </p>
            </div>

            {/* Login card */}
            <div className="rounded-[2.2rem] border border-white/14 bg-[linear-gradient(180deg,rgba(18,41,112,0.94),rgba(12,31,88,0.92))] px-8 py-10 shadow-[0_20px_80px_rgba(0,0,0,0.38)] backdrop-blur-2xl sm:px-10 sm:py-11">
              <div className="mb-8">
                <div className="mb-5 inline-flex rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-2 text-base font-semibold text-white shadow-lg">
                  Welcome back
                </div>

                <h2 className="text-5xl font-extrabold tracking-tight text-white">
                  Login
                </h2>

                <p className="mt-4 text-[17px] leading-8 text-blue-100/75">
                  Enter your mobile number and password to continue
                </p>
              </div>

              <div className="space-y-7">
                {/* Mobile Number */}
                <div>
                  <label className="mb-3 block text-[18px] font-semibold text-white/95">
                    Mobile Number
                  </label>

                  <div className="flex h-16 items-center rounded-2xl border border-white/12 bg-[#071b54]/90 px-5 shadow-inner">
                    <Phone className="mr-4 text-white/45" size={22} />
                    <input
                      type="text"
                      placeholder="Enter mobile number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="h-full w-full bg-transparent text-lg text-white outline-none placeholder:text-white/40"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="mb-3 block text-[18px] font-semibold text-white/95">
                    Password
                  </label>

                  <div className="flex h-16 items-center rounded-2xl border border-white/12 bg-[#071b54]/90 px-5 shadow-inner">
                    <Lock className="mr-4 text-white/45" size={22} />
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-full w-full bg-transparent text-lg text-white outline-none placeholder:text-white/40"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="ml-3 text-white/45 transition hover:text-white/70"
                    >
                      {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
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
                    className="text-[16px] font-medium text-sky-400 transition hover:text-cyan-300"
                  >
                    Forgot password?
                  </button>
                </div>

                {errorMsg ? (
                  <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                    {errorMsg}
                  </div>
                ) : null}

                <button
                  onClick={handleLogin}
                  disabled={loading}
                  className="group flex h-[86px] w-full items-center justify-center rounded-[1.3rem] bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 px-6 text-[20px] font-semibold text-white shadow-[0_14px_45px_rgba(37,99,235,0.35)] transition hover:brightness-110 disabled:opacity-60"
                >
                  <span>{loading ? "Logging in..." : "Login to Dashboard"}</span>
                  <ArrowRight
                    className="ml-4 transition-transform duration-300 group-hover:translate-x-1"
                    size={26}
                  />
                </button>
              </div>

              <div className="mt-10 border-t border-white/10 pt-8 text-center text-sm text-white/55">
                insurehubballi • Your cover Our Care
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-slate-950/95 p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold">Forgot Password</h3>
                <p className="mt-1 text-sm text-blue-100/70">
                  Send password reset request to admin
                </p>
              </div>

              <button
                onClick={() => setShowForgotModal(false)}
                className="text-xl leading-none text-slate-300 hover:text-white"
              >
                ×
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