'use client';

import Link from "next/link";
import Image from "next/image";
import { User, Mail, Lock, EyeOff, Eye, ArrowRight } from "lucide-react";
import { signupUser } from "@/app/actions";
import { useActionState, useState } from "react";

export default function SignupPage() {
  const [state, formAction, isPending] = useActionState(signupUser, { error: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

      {/* Signup Card */}
      <div className="relative z-10 w-full max-w-[400px] bg-[#F9F7F4]/95 backdrop-blur-md rounded-[20px] shadow-2xl p-5 sm:p-8">
        
        {/* Logo */}
        <div className="flex justify-center mb-3.5 sm:mb-5">
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 opacity-80">
             <Image src="/images/logo.png" alt="Logo" fill className="object-contain" />
          </div>
        </div>

        <h1 className="text-[22px] min-[380px]:text-[26px] font-serif text-center tracking-tight text-[#1A1918] mb-1 sm:mb-1.5">
          Create Your <span className="text-[#701A23]">Account</span>
        </h1>
        
        <p className="text-center text-[#68645E] text-[12.5px] sm:text-[13px] mb-4 sm:mb-5">
          Start tracing events. Connect them to your ambitions.
        </p>

        {state.error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-[13px]">
            {state.error}
          </div>
        )}

        <form action={formAction} className="space-y-3">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <User className="h-4 w-4 text-[#8A847C] stroke-[1.5]" />
            </div>
            <input
              type="text"
              name="fullName"
              required
              placeholder="Full name"
              className="w-full pl-10 pr-4 py-2.5 text-[13px] bg-[#FAF8F5]/80 border border-[#E4D9CC] rounded-xl text-[#1A1918] placeholder:text-[#8A847C] focus:outline-none focus:border-[#701A23] focus:ring-1 focus:ring-[#701A23] transition-all"
            />
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Mail className="h-4 w-4 text-[#8A847C] stroke-[1.5]" />
            </div>
            <input
              type="email"
              name="email"
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

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Lock className="h-4 w-4 text-[#8A847C] stroke-[1.5]" />
            </div>
            <input
              type={showConfirmPassword ? "text" : "password"}
              name="confirmPassword"
              required
              placeholder="Confirm password"
              className="w-full pl-10 pr-10 py-2.5 text-[13px] bg-[#FAF8F5]/80 border border-[#E4D9CC] rounded-xl text-[#1A1918] placeholder:text-[#8A847C] focus:outline-none focus:border-[#701A23] focus:ring-1 focus:ring-[#701A23] transition-all"
            />
            <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center">
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="focus:outline-none"
              >
                {showConfirmPassword ? (
                  <Eye className="h-4 w-4 text-[#8A847C] stroke-[1.5] cursor-pointer hover:text-[#1A1918]" />
                ) : (
                  <EyeOff className="h-4 w-4 text-[#8A847C] stroke-[1.5] cursor-pointer hover:text-[#1A1918]" />
                )}
              </button>
            </div>
          </div>

          <div className="pt-2">
            <label className="flex items-start gap-2 cursor-pointer">
              <div className="relative flex items-center mt-[1px]">
                <input
                  type="checkbox"
                  name="terms"
                  required
                  className="peer appearance-none w-3.5 h-3.5 border border-[#8A847C] rounded bg-transparent checked:bg-[#701A23] checked:border-[#701A23] transition-colors cursor-pointer"
                />
                <svg className="absolute inset-0 w-3.5 h-3.5 pointer-events-none hidden peer-checked:block text-white p-[1px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </div>
              <span className="text-[12px] text-[#4A4641] font-medium leading-tight">
                I agree to the <Link href="#" className="text-[#701A23] hover:underline">Terms of Service</Link> and <Link href="#" className="text-[#701A23] hover:underline">Privacy Policy</Link>
              </span>
            </label>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={isPending}
              className="w-full bg-[#701A23] hover:bg-[#58141B] disabled:opacity-70 text-white py-2.5 rounded-full font-medium text-[13px] transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
            >
              {isPending ? "Creating Account..." : "Create Account"}
              {!isPending && <ArrowRight className="h-3.5 w-3.5" />}
            </button>
          </div>
        </form>

        <p className="text-center text-[12px] text-[#68645E] mt-5">
          Already have an account? <Link href="/login" className="text-[#701A23] font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
