'use client';

import Link from "next/link";
import Image from "next/image";
import { Mail, Lock, EyeOff, Eye, ArrowRight } from "lucide-react";
import { loginUser } from "@/app/actions";
import { useActionState, useState } from "react";
import { DEMO_ACCOUNTS, DEMO_MODE } from "@/lib/demo-accounts";

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginUser, { error: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [demoKey, setDemoKey] = useState<string | null>(null);

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center p-4 bg-[#F9F7F4]">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/login-signup-visuals.png"
          alt="Beautiful landscape"
          fill
          className="object-cover opacity-50"
          priority
        />
      </div>

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-[400px] bg-[#F9F7F4]/95 backdrop-blur-md rounded-[20px] shadow-2xl p-5 sm:p-8">
        
        {/* Logo */}
        <div className="flex justify-center mb-3.5 sm:mb-5">
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 opacity-80">
             <Image src="/images/logo.png" alt="Logo" fill className="object-contain" />
          </div>
        </div>

        <h1 className="text-[22px] min-[380px]:text-[26px] font-serif text-center tracking-tight text-[#1A1918] mb-1 sm:mb-1.5">
          Welcome <span className="text-[#701A23]">Back</span>
        </h1>
        
        <p className="text-center text-[#68645E] text-[12.5px] sm:text-[13px] mb-4 sm:mb-5">
          Sign in to continue your journey with<br/>Ambition Gazette.
        </p>

        {DEMO_MODE && (
          <div className="mb-4 rounded-full bg-[#EFE8DE] p-1 flex items-center justify-between" role="group" aria-label="Demo accounts">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.key}
                type="button"
                aria-pressed={demoKey === account.key}
                onClick={() => {
                  setDemoKey(account.key);
                  setEmail(account.email);
                  setPassword(account.password);
                }}
                className={`flex-1 rounded-full py-2 text-[12.5px] font-medium transition-all ${
                  demoKey === account.key ? "bg-[#701A23] text-white shadow-sm" : "text-[#4A4641] hover:bg-[#E4D9CC]/60"
                }`}
              >
                {account.label}
              </button>
            ))}
          </div>
        )}

        {state.error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-[13px]">
            {state.error}
          </div>
        )}

        <form action={formAction} className="space-y-3">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Mail className="h-4 w-4 text-[#8A847C] stroke-[1.5]" />
            </div>
            <input
              type="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Email address"
              className="w-full pl-10 pr-4 py-2.5 text-[13px] bg-[#FAF8F5]/80 border border-[#E4D9CC] rounded-xl text-[#1A1918] placeholder:text-[#8A847C] focus:outline-none focus:border-[#701A23] focus:ring-1 focus:ring-[#701A23] transition-all"
            />
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Lock className="h-4 w-4 text-[#8A847C] stroke-[1.5]" />
            </div>
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Password"
              className="w-full pl-10 pr-10 py-2.5 text-[13px] bg-[#FAF8F5]/80 border border-[#E4D9CC] rounded-xl text-[#1A1918] placeholder:text-[#8A847C] focus:outline-none focus:border-[#701A23] focus:ring-1 focus:ring-[#701A23] transition-all"
            />
            <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center">
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="focus:outline-none"
              >
                {showPassword ? (
                  <Eye className="h-4 w-4 text-[#8A847C] stroke-[1.5] cursor-pointer hover:text-[#1A1918]" />
                ) : (
                  <EyeOff className="h-4 w-4 text-[#8A847C] stroke-[1.5] cursor-pointer hover:text-[#1A1918]" />
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <div className="relative flex items-center">
                <input
                  type="checkbox"
                  name="remember"
                  className="peer appearance-none w-4 h-4 border border-[#8A847C] rounded bg-transparent checked:bg-[#701A23] checked:border-[#701A23] transition-colors cursor-pointer"
                />
                <svg className="absolute inset-0 w-4 h-4 pointer-events-none hidden peer-checked:block text-white p-[2px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </div>
              <span className="text-[13px] text-[#4A4641] font-medium">Remember me</span>
            </label>
            <Link href="#" className="text-[12px] font-medium text-[#701A23] hover:underline">
              Forgot password?
            </Link>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={isPending}
              className="w-full bg-[#701A23] hover:bg-[#58141B] disabled:opacity-70 text-white py-2.5 rounded-full font-medium text-[13px] transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
            >
              {isPending ? "Signing in..." : "Sign In"}
              {!isPending && <ArrowRight className="h-3.5 w-3.5" />}
            </button>
          </div>
        </form>

        <p className="text-center text-[12px] text-[#68645E] mt-5">
          Don&apos;t have an account? <Link href="/signup" className="text-[#701A23] font-medium hover:underline">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
