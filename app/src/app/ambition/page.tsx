'use client';

import { useState, useEffect } from 'react';
import { saveOnboarding } from "@/app/actions";
import Image from "next/image";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { api } from "@/lib/api";
import { VOICE_LANGUAGES } from '@/lib/languages';
import { 
  GraduationCap, Briefcase, Search, ArrowRightLeft, 
  Rocket, Laptop, FlaskConical, MoreHorizontal, 
  Landmark, Target, MapPin, Lightbulb, ArrowRight, ArrowLeft,
  Compass, X, AlertCircle
} from "lucide-react";

// Data
const ROLES = [
  { id: "Student", label: "Student", icon: GraduationCap },
  { id: "Working Professional", label: "Working Professional", icon: Briefcase },
  { id: "Job Seeker", label: "Job Seeker", icon: Search },
  { id: "Career Changer", label: "Career Changer", icon: ArrowRightLeft },
  { id: "Entrepreneur / Founder", label: "Entrepreneur / Founder", icon: Rocket },
  { id: "Freelancer", label: "Freelancer", icon: Laptop },
  { id: "Researcher", label: "Researcher", icon: FlaskConical },
  { id: "Other", label: "Other", icon: MoreHorizontal },
];

const TIMELINES = [
  "Next few months", 
  "6–12 months", 
  "1-3 years", 
  "3+ years", 
  "I'm still figuring it out"
];

const CATEGORIES = [
  "Career & Jobs", "Skills & Learning", "Technology & AI", 
  "Industry Trends", "Companies & Opportunities", "Education", 
  "Research & Innovation", "Business & Startups", "Money & Economy", 
  "Government & Policy", "Local / Regional Developments"
];

const GEOGRAPHY_OPTIONS = [
  "Near me",
  "My country",
  "Specific countries / regions",
  "Global",
  "No specific location"
];

const SUGGESTED_REGIONS = [
  "United States", "United Kingdom", "Germany", "India", "Canada",
  "European Union", "Singapore", "Australia", "Japan", "France",
  "United Arab Emirates", "Switzerland", "Netherlands", "South Korea"
];

const DEPTHS = ["Essential", "Balanced", "Deep"];
const LANGUAGES = VOICE_LANGUAGES;

export default function OnboardingPage() {
  useAuthGuard();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    // Users who already have an ambition skip onboarding.
    api.getAmbitions()
      .then((res) => {
        if (res.ambitions.length > 0) window.location.replace("/today");
      })
      .catch((err: unknown) => {
        console.error("Could not check existing ambitions:", err);
      });
  }, []);

  // Step 1 State
  const [role, setRole] = useState('');
  const [activity, setActivity] = useState('');
  const [ambition, setAmbition] = useState('');
  const [direction, setDirection] = useState('');
  const [timeline, setTimeline] = useState('');

  // Step 2 State
  const [categories, setCategories] = useState<string[]>([]);
  const [geographies, setGeographies] = useState<string[]>([]);
  const [customCountries, setCustomCountries] = useState<string[]>([]);
  const [countrySearch, setCountrySearch] = useState('');
  const [depth, setDepth] = useState('');
  const [bidiLang, setBidiLang] = useState('English');
  const [reportLang, setReportLang] = useState('English');

  const handleCategoryToggle = (cat: string) => {
    if (categories.includes(cat)) {
      setCategories(categories.filter(c => c !== cat));
    } else {
      setCategories([...categories, cat]);
    }
  };

  const handleGeographyToggle = (opt: string) => {
    if (opt === "No specific location") {
      if (geographies.includes("No specific location")) {
        setGeographies([]);
      } else {
        setGeographies(["No specific location"]);
        setCustomCountries([]);
        setCountrySearch('');
      }
      return;
    }

    let next = geographies.filter(g => g !== "No specific location");
    if (next.includes(opt)) {
      next = next.filter(g => g !== opt);
      if (opt === "Specific countries / regions") {
        setCustomCountries([]);
        setCountrySearch('');
      }
    } else {
      next.push(opt);
    }
    setGeographies(next);
  };

  const handleAddCountry = (country: string) => {
    const trimmed = country.trim();
    if (!trimmed) return;
    if (!customCountries.includes(trimmed)) {
      setCustomCountries([...customCountries, trimmed]);
    }
    setCountrySearch('');
  };

  const handleRemoveCountry = (country: string) => {
    setCustomCountries(customCountries.filter(c => c !== country));
  };

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!role || !activity || !ambition || !timeline) {
      setValidationError("Please select your current path, activity, primary ambition, and timeline before proceeding.");
      return;
    }
    setValidationError(null);
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (categories.length === 0) {
      setValidationError("Please select at least one intelligence topic to monitor.");
      return;
    }
    
    setValidationError(null);
    setLoading(true);
    const formData = new FormData();
    formData.append('role', role);
    formData.append('activity', activity);
    formData.append('ambition', ambition);
    formData.append('direction', direction);
    formData.append('timeline', timeline);
    formData.append('categories', JSON.stringify(categories));

    // Build geography relevance signal
    let geographySignal = "";
    if (geographies.includes("No specific location")) {
      geographySignal = "No specific location";
    } else if (geographies.length > 0) {
      const parts = geographies.map(g => {
        if (g === "Specific countries / regions" && customCountries.length > 0) {
          return `Specific: ${customCountries.join(', ')}`;
        }
        return g;
      });
      geographySignal = parts.join(', ');
    }
    formData.append('geography', geographySignal);

    formData.append('depth', depth);
    formData.append('bidiLang', bidiLang);
    formData.append('reportLang', reportLang);

    try {
      const result = await saveOnboarding(formData);
      if (result?.error) {
        setValidationError(result.error);
        setLoading(false);
      }
    } catch (err: unknown) {
      console.error(err);
      setValidationError("Failed to save ambition profile. Please check your connection and retry.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen lg:h-screen w-full relative bg-[#FAF8F5] overflow-y-auto lg:overflow-hidden selection:bg-[#701A23]/15 selection:text-[#701A23]">
      {/* Background image stretched to full screen */}
      <div className="absolute inset-0 z-0 pointer-events-none select-none">
        <Image 
          src="/images/onboarding_visual.png" 
          fill 
          priority
          className="w-full h-full object-cover object-center opacity-50" 
          alt="Ambition Gazette Onboarding Visual" 
        />
      </div>

      {/* Main Layout Container */}
      <div className="relative z-10 w-full min-h-screen lg:h-screen lg:max-h-screen flex flex-col lg:flex-row items-start justify-between px-3.5 sm:px-8 lg:px-12 py-3 sm:py-4 lg:py-[20px] max-w-[1600px] mx-auto gap-4 lg:gap-0">
        
        {/* Left Side: Title & Description on top left */}
        <div className="w-full lg:w-[36%] xl:w-[35%] shrink-0 flex flex-col justify-start pt-1 sm:pt-2 lg:pt-4 pr-0 lg:pr-4 z-10">
          <div>
            {/* Step Eyebrow & Progress Dash Indicator */}
            <div className="mb-2 sm:mb-3.5 lg:mb-4">
              <p className="text-[10.5px] sm:text-[11px] font-bold tracking-[0.18em] text-[#701A23] uppercase mb-1 sm:mb-1.5">
                STEP {step} OF 2
              </p>
              <div className="flex items-center gap-1.5">
                <div className={`h-[2.5px] rounded-full transition-all duration-300 ${step === 1 ? 'w-8 bg-[#701A23]' : 'w-5 bg-[#701A23]'}`} />
                <div className={`h-[2.5px] rounded-full transition-all duration-300 ${step === 2 ? 'w-8 bg-[#701A23]' : 'w-5 bg-[#1A1918]/15'}`} />
              </div>
            </div>
            
            {/* Main Headline */}
            <h1 className="font-serif text-[22px] min-[380px]:text-[25px] sm:text-[28px] lg:text-[31px] font-normal leading-[1.15] tracking-tight text-[#1A1918] mb-1.5 sm:mb-2.5">
              What describes<br className="hidden sm:inline" /> your <span className="text-[#701A23]">current path?</span>
            </h1>
            
            {/* Subtext */}
            <p className="text-[12px] sm:text-[13px] text-[#4A4641] leading-relaxed max-w-[340px]">
              Tell us a bit about your current situation so we can surface the right world events, trends, and opportunities for you.
            </p>
          </div>
        </div>

        {/* Right Side: Card height 95vh with inner scroll */}
        <div className="w-full lg:w-[64%] xl:w-[65%] flex items-center justify-center lg:justify-end pb-6 lg:pb-0">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl sm:rounded-[28px] shadow-xl lg:shadow-2xl shadow-black/10 border border-[#EBE5DC]/80 w-full max-w-[790px] h-[95vh] max-h-[95vh] flex flex-col relative overflow-hidden">
            
            {/* Form Card Top Header Bar */}
            <div className="px-3.5 sm:px-7 lg:px-8 py-2.5 sm:py-3.5 lg:py-4 border-b border-[#EBE4D8] bg-[#FAF8F5]/80 flex items-center justify-between gap-2.5 shrink-0">
              <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#FAF2E5] border border-[#ECDDC6] flex items-center justify-center text-[#701A23] shrink-0">
                  <Compass className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#701A23]" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className="text-[12px] sm:text-[13px] font-bold text-[#701A23] uppercase truncate font-ubuntu">
                      {step === 1 ? 'Gazette Intelligence Profile' : 'Signal Calibration'}
                    </span>
                    <span className="text-[9.5px] sm:text-[10px] px-1.5 py-0.5 rounded-md bg-[#FAF4ED] text-[#7A5B3E] font-medium border border-[#EBDCCF] shrink-0 font-dm-sans">
                      {step === 1 ? '1 of 2' : '2 of 2'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Helper Tip Badge */}
              <div className="hidden sm:flex bg-[#FAF2E5] text-[#7A5F26] text-[10.5px] sm:text-[11px] px-2.5 py-1.5 rounded-xl items-center gap-1.5 border border-[#F2E5CE] shrink-0 max-w-[240px] font-dm-sans">
                <Lightbulb className="w-3.5 h-3.5 shrink-0 text-[#D4981C]" />
                <span className="leading-snug">
                  {step === 1 ? 'Personalizes intelligence for your goals.' : 'Customizes reporting depth & reach.'}
                </span>
              </div>
            </div>

            {/* Inner Scrollable Form Container with elegant scrollbar */}
            <div className="flex-1 min-h-0 overflow-y-auto px-3.5 sm:px-7 lg:px-8 py-3.5 sm:py-6 lg:py-7 overscroll-contain touch-pan-y [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-[#D8D2C7] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
              {validationError && (
                <div
                  role="alert"
                  className="mb-5 p-3 rounded-xl bg-[#FCF4F4] border border-[#F0D5D3] text-[#701A23] text-xs font-dm-sans flex items-center justify-between gap-2 animate-in fade-in duration-200"
                >
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-[#701A23]" />
                    <span className="font-medium">{validationError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setValidationError(null)}
                    className="p-1 text-[#701A23] hover:text-[#58141B] cursor-pointer shrink-0"
                    aria-label="Dismiss error"
                  >
                    <X size={12} strokeWidth={2.5} />
                  </button>
                </div>
              )}

              {step === 1 ? (
                <form onSubmit={handleNext} className="w-full flex flex-col space-y-6 sm:space-y-7 lg:space-y-8">
                  
                  {/* 1. What best describes you? */}
                  <div className="flex items-start gap-2.5 sm:gap-3">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 rounded-full bg-[#F5ECE3] text-[#7A5B3E] flex items-center justify-center font-ubuntu font-semibold text-[12px] sm:text-[12.5px] mt-0.5 select-none">
                      1
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="font-ubuntu font-semibold text-[14px] sm:text-[14.5px] text-[#1A1918] tracking-tight mb-0.5">
                        What best describes you?
                      </h2>
                      <p className="font-ubuntu text-[11.5px] text-[#78726A] mb-2.5">
                        This helps us tailor insights to your stage and needs.
                      </p>
                      
                      <div className="grid grid-cols-1 min-[360px]:grid-cols-2 sm:grid-cols-4 gap-2">
                        {ROLES.map(r => {
                          const Icon = r.icon;
                          const isActive = role === r.id;
                          return (
                            <button 
                              key={r.id} 
                              type="button" 
                              onClick={() => setRole(r.id)} 
                              className={`px-2.5 py-2 rounded-[8px] flex items-center gap-1.5 text-[11.5px] sm:text-[12px] font-medium transition-all text-left cursor-pointer font-dm-sans ${
                                isActive 
                                  ? 'bg-[#FCF4F4] border border-[#701A23] text-[#701A23]' 
                                  : 'bg-white border border-[#E5DFD7] text-[#2C2825] hover:border-[#CCC4B8] hover:bg-[#FAF8F5]'
                              }`}
                            >
                              <Icon size={14} strokeWidth={isActive ? 2 : 1.5} className="shrink-0" />
                              <span className="truncate">{r.label}</span>
                              {isActive && (
                                <div className="ml-auto flex items-center justify-center shrink-0 w-3 h-3 bg-[#701A23] rounded-full">
                                  <svg width="6" height="4.5" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Separator line with extra gap */}
                  <hr className="border-0 border-t border-[#E5DDD0] w-full" />

                  {/* 2. What are you currently doing? (Input Field) */}
                  <div className="flex items-start gap-2.5 sm:gap-3">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 rounded-full bg-[#F5ECE3] text-[#7A5B3E] flex items-center justify-center font-ubuntu font-semibold text-[12px] sm:text-[12.5px] mt-0.5 select-none">
                      2
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="font-ubuntu font-semibold text-[14px] sm:text-[14.5px] text-[#1A1918] tracking-tight mb-0.5">
                        What are you currently doing?
                      </h2>
                      <p className="font-ubuntu text-[11.5px] text-[#78726A] mb-2">
                        Your current role, domain, or area of study.
                      </p>
                      
                      <div className="relative flex items-center">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666059] pointer-events-none">
                          <Landmark size={14} strokeWidth={1.5} />
                        </div>
                        <input 
                          type="text" 
                          required 
                          value={activity} 
                          onChange={e => setActivity(e.target.value)} 
                          placeholder="Computer Science Department" 
                          className="w-full pl-9 pr-3.5 py-2 sm:py-2.5 bg-white border border-[#E5DFD7] rounded-[8px] text-[12.5px] sm:text-[13px] text-[#1A1918] placeholder:text-[#8A847C] focus:border-[#701A23] focus:ring-1 focus:ring-[#701A23] outline-none transition-all font-ubuntu" 
                        />
                      </div>
                    </div>
                  </div>

                  {/* Separator line with extra gap */}
                  <hr className="border-0 border-t border-[#E5DDD0] w-full" />

                  {/* 3. What are you trying to achieve? (Input Field) */}
                  <div className="flex items-start gap-2.5 sm:gap-3">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 rounded-full bg-[#F5ECE3] text-[#7A5B3E] flex items-center justify-center font-ubuntu font-semibold text-[12px] sm:text-[12.5px] mt-0.5 select-none">
                      3
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="font-ubuntu font-semibold text-[14px] sm:text-[14.5px] text-[#1A1918] tracking-tight mb-0.5">
                        What are you trying to achieve? <span className="font-normal text-[#8A847C]">(Primary Ambition)</span>
                      </h2>
                      <p className="font-ubuntu text-[11.5px] text-[#78726A] mb-2">
                        Be specific about your main goal.
                      </p>
                      
                      <div className="relative flex items-center">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666059] pointer-events-none">
                          <Target size={14} strokeWidth={1.5} />
                        </div>
                        <input 
                          type="text" 
                          required 
                          value={ambition} 
                          onChange={e => setAmbition(e.target.value)} 
                          placeholder="Become AI Engineer" 
                          className="w-full pl-9 pr-3.5 py-2 sm:py-2.5 bg-white border border-[#E5DFD7] rounded-[8px] text-[12.5px] sm:text-[13px] text-[#1A1918] placeholder:text-[#8A847C] focus:border-[#701A23] focus:ring-1 focus:ring-[#701A23] outline-none transition-all font-ubuntu" 
                        />
                      </div>
                    </div>
                  </div>

                  {/* Separator line with extra gap */}
                  <hr className="border-0 border-t border-[#E5DDD0] w-full" />

                  {/* 4. Where are you trying to go? (Input Field) */}
                  <div className="flex items-start gap-2.5 sm:gap-3">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 rounded-full bg-[#F5ECE3] text-[#7A5B3E] flex items-center justify-center font-ubuntu font-semibold text-[12px] sm:text-[12.5px] mt-0.5 select-none">
                      4
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="font-ubuntu font-semibold text-[14px] sm:text-[14.5px] text-[#1A1918] tracking-tight mb-0.5">
                        Where are you trying to go? <span className="font-normal text-[#8A847C]">(Optional)</span>
                      </h2>
                      <p className="font-ubuntu text-[11.5px] text-[#78726A] mb-2">
                        This helps us surface location-specific opportunities.
                      </p>
                      
                      <div className="relative flex items-center">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666059] pointer-events-none">
                          <MapPin size={14} strokeWidth={1.5} />
                        </div>
                        <input 
                          type="text" 
                          value={direction} 
                          onChange={e => setDirection(e.target.value)} 
                          placeholder="Google Placement" 
                          className="w-full pl-9 pr-3.5 py-2 sm:py-2.5 bg-white border border-[#E5DFD7] rounded-[8px] text-[12.5px] sm:text-[13px] text-[#1A1918] placeholder:text-[#8A847C] focus:border-[#701A23] focus:ring-1 focus:ring-[#701A23] outline-none transition-all font-ubuntu" 
                        />
                      </div>
                    </div>
                  </div>

                  {/* Separator line with extra gap */}
                  <hr className="border-0 border-t border-[#E5DDD0] w-full" />

                  {/* 5. Timeline */}
                  <div className="flex items-start gap-2.5 sm:gap-3">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 rounded-full bg-[#F5ECE3] text-[#7A5B3E] flex items-center justify-center font-ubuntu font-semibold text-[12px] sm:text-[12.5px] mt-0.5 select-none">
                      5
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="font-ubuntu font-semibold text-[14px] sm:text-[14.5px] text-[#1A1918] tracking-tight mb-0.5">
                        Timeline
                      </h2>
                      <p className="font-ubuntu text-[11.5px] text-[#78726A] mb-2">
                        When do you hope to achieve this?
                      </p>
                      
                      <div className="flex flex-wrap gap-2">
                        {TIMELINES.map(t => {
                          const isActive = timeline === t;
                          return (
                            <button 
                              key={t} 
                              type="button" 
                              onClick={() => setTimeline(t)} 
                              className={`px-3 py-1.5 rounded-full text-[11.5px] sm:text-[12px] font-medium transition-all flex items-center gap-1.5 cursor-pointer font-dm-sans ${
                                isActive 
                                  ? 'bg-[#701A23] border border-[#701A23] text-white shadow-xs' 
                                  : 'bg-white border border-[#E5DFD7] text-[#2C2825] hover:border-[#CCC4B8] hover:bg-[#FAF8F5]'
                              }`}
                            >
                              <span>{t}</span>
                              {isActive && (
                                <div className="flex items-center justify-center shrink-0 w-2.5 h-2.5 bg-white rounded-full ml-0.5">
                                  <svg width="6" height="4.5" viewBox="0 0 8 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M1 3L3 5L7 1" stroke="#701A23" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Separator line before footer */}
                  <hr className="border-0 border-t border-[#E5DDD0] w-full" />

                  {/* Bottom Row: Next background note & Action Button */}
                  <div className="pt-1 pb-4 sm:pb-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <div className="bg-[#FAF0F0] border border-[#F3E2E2] rounded-[12px] p-2 sm:p-2.5 flex items-center gap-2.5 flex-1">
                      <div className="w-6 h-6 rounded-full bg-[#F5E1E3] flex items-center justify-center text-[#701A23] shrink-0">
                        <Target size={15} strokeWidth={1.8} />
                      </div>
                      <div>
                        <h4 className="text-[12px] sm:text-[12.5px] font-bold text-[#701A23] leading-snug font-ubuntu">
                          Next: Add your background
                        </h4>
                        <p className="text-[11px] sm:text-[11.5px] text-[#6E6760] leading-tight mt-0.5 font-ubuntu">
                          We&apos;ll understand your interests, focus areas, and preferences.
                        </p>
                      </div>
                    </div>
                    
                    <button 
                      type="submit" 
                      className="bg-[#701A23] hover:bg-[#58141B] text-white px-5 py-2.5 rounded-full font-medium text-[13px] sm:text-[13.5px] flex items-center justify-center gap-1.5 transition-all shadow-md shrink-0 cursor-pointer font-dm-sans"
                    >
                      <span>Next Step</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>
                </form>
              ) : (
                /* Step 2 Form */
                <form onSubmit={handleSubmit} className="w-full flex flex-col space-y-6 sm:space-y-7 lg:space-y-8">
                  
                  {/* 1. Intelligence Topics */}
                  <div className="flex items-start gap-2.5 sm:gap-3">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 rounded-full bg-[#F5ECE3] text-[#7A5B3E] flex items-center justify-center font-ubuntu font-semibold text-[12px] sm:text-[12.5px] mt-0.5 select-none">
                      1
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="font-ubuntu font-semibold text-[14px] sm:text-[14.5px] text-[#1A1918] tracking-tight mb-0.5">
                        Intelligence Topics
                      </h2>
                      <p className="font-ubuntu text-[11.5px] text-[#78726A] mb-2.5">
                        Select topics you want to actively monitor for significant changes.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {CATEGORIES.map(c => {
                          const isActive = categories.includes(c);
                          return (
                            <button 
                              key={c} 
                              type="button" 
                              onClick={() => handleCategoryToggle(c)} 
                              className={`px-3 py-1.5 rounded-full text-[11.5px] sm:text-[12px] font-medium transition-all cursor-pointer font-dm-sans ${
                                isActive 
                                  ? 'bg-[#701A23] text-white border border-[#701A23]' 
                                  : 'bg-white border border-[#E5DFD7] text-[#2C2825] hover:border-[#CCC4B8] hover:bg-[#FAF8F5]'
                              }`}
                            >
                              {c}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Separator line with extra gap */}
                  <hr className="border-0 border-t border-[#E5DDD0] w-full" />

                  {/* 2. Geographic Relevance */}
                  <div className="flex items-start gap-2.5 sm:gap-3">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 rounded-full bg-[#F5ECE3] text-[#7A5B3E] flex items-center justify-center font-ubuntu font-semibold text-[12px] sm:text-[12.5px] mt-0.5 select-none">
                      2
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="font-ubuntu font-semibold text-[14px] sm:text-[14.5px] text-[#1A1918] tracking-tight mb-0.5">
                        Where does your goal matter?
                      </h2>
                      <p className="font-ubuntu text-[11.5px] text-[#78726A] mb-2">
                        Choose all locations that are relevant to your journey.
                      </p>
                      
                      <div className="flex flex-wrap gap-2">
                        {GEOGRAPHY_OPTIONS.map(opt => {
                          const isActive = geographies.includes(opt);
                          const isDisabled = opt === "No specific location"
                            ? geographies.some(g => g !== "No specific location")
                            : geographies.includes("No specific location");

                          return (
                            <button 
                              key={opt} 
                              type="button" 
                              disabled={isDisabled}
                              onClick={() => handleGeographyToggle(opt)} 
                              className={`px-3 py-1.5 rounded-full text-[11.5px] sm:text-[12px] font-medium transition-all flex items-center gap-1.5 font-dm-sans ${
                                isActive 
                                  ? 'bg-[#701A23] text-white border border-[#701A23] shadow-xs cursor-pointer' 
                                  : isDisabled
                                    ? 'bg-[#F7F4EE] border border-[#E7E1D8]/60 text-[#ABA59D] cursor-not-allowed opacity-60'
                                    : 'bg-white border border-[#E5DFD7] text-[#2C2825] hover:border-[#CCC4B8] hover:bg-[#FAF8F5] cursor-pointer'
                              }`}
                            >
                              <span>{opt}</span>
                              {isActive && (
                                <div className="flex items-center justify-center shrink-0 w-2.5 h-2.5 bg-white rounded-full ml-0.5">
                                  <svg width="6" height="4.5" viewBox="0 0 8 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M1 3L3 5L7 1" stroke="#701A23" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* Searchable country/region selector revealed when "Specific countries / regions" is selected */}
                      {geographies.includes("Specific countries / regions") && (
                        <div className="mt-2.5 p-2.5 bg-[#FAF8F5] border border-[#E5DFD7] rounded-xl flex flex-col gap-2 transition-all">
                          {/* Search Input */}
                          <div className="relative flex items-center font-dm-sans">
                            <Search size={13} className="absolute left-2.5 text-[#78726A] pointer-events-none" />
                            <input 
                              type="text"
                              value={countrySearch}
                              onChange={e => setCountrySearch(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleAddCountry(countrySearch);
                                }
                              }}
                              placeholder="Search countries or regions..."
                              className="w-full pl-8 pr-16 py-1.5 bg-white border border-[#E5DFD7] rounded-lg text-[12px] sm:text-[12.5px] text-[#1A1918] placeholder:text-[#8A847C] focus:border-[#701A23] focus:ring-1 focus:ring-[#701A23] outline-none font-dm-sans"
                            />
                            {countrySearch.trim() && (
                              <button
                                type="button"
                                onClick={() => handleAddCountry(countrySearch)}
                                className="absolute right-1.5 px-2 py-0.5 rounded-md bg-[#701A23] text-white text-[11px] font-medium hover:bg-[#58141B] cursor-pointer font-dm-sans"
                              >
                                Add
                              </button>
                            )}
                          </div>

                          {/* Selected Countries / Regions Badges */}
                          {customCountries.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5 pt-0.5 font-dm-sans">
                              <span className="text-[11px] text-[#78726A] mr-0.5">Selected:</span>
                              {customCountries.map(c => (
                                <span 
                                  key={c}
                                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11.5px] font-medium bg-[#FCF4F4] text-[#701A23] border border-[#701A23]/30 font-dm-sans"
                                >
                                  <span>{c}</span>
                                  <button 
                                    type="button" 
                                    onClick={() => handleRemoveCountry(c)}
                                    className="hover:text-[#58141B] p-0.5 rounded-full cursor-pointer"
                                  >
                                    <X size={10} strokeWidth={2.5} />
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Suggestions */}
                          <div className="flex flex-wrap items-center gap-1 pt-0.5 font-dm-sans">
                            <span className="text-[10.5px] text-[#8A847C] mr-1">Suggestions:</span>
                            {SUGGESTED_REGIONS.filter(r => 
                              !customCountries.includes(r) && 
                              (countrySearch.trim() ? r.toLowerCase().includes(countrySearch.toLowerCase()) : true)
                            ).slice(0, 6).map(r => (
                              <button
                                key={r}
                                type="button"
                                onClick={() => handleAddCountry(r)}
                                className="px-2 py-0.5 rounded-md bg-white border border-[#E5DFD7] text-[#4A4641] hover:border-[#701A23] hover:text-[#701A23] hover:bg-[#FAF8F5] text-[11px] transition-all cursor-pointer font-dm-sans"
                              >
                                + {r}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Separator line with extra gap */}
                  <hr className="border-0 border-t border-[#E5DDD0] w-full" />

                  {/* 3. Information Depth */}
                  <div className="flex items-start gap-2.5 sm:gap-3">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 rounded-full bg-[#F5ECE3] text-[#7A5B3E] flex items-center justify-center font-ubuntu font-semibold text-[12px] sm:text-[12.5px] mt-0.5 select-none">
                      3
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="font-ubuntu font-semibold text-[14px] sm:text-[14.5px] text-[#1A1918] tracking-tight mb-0.5">
                        Information Depth
                      </h2>
                      <p className="font-ubuntu text-[11.5px] text-[#78726A] mb-2">
                        How detailed should your daily briefings and investigation cards be?
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {DEPTHS.map(d => {
                          const isActive = depth === d;
                          return (
                            <button 
                              key={d} 
                              type="button" 
                              onClick={() => setDepth(d)} 
                              className={`px-3 py-1.5 rounded-full text-[11.5px] sm:text-[12px] font-medium transition-all cursor-pointer font-dm-sans ${
                                isActive 
                                  ? 'bg-[#701A23] text-white border border-[#701A23]' 
                                  : 'bg-white border border-[#E5DFD7] text-[#2C2825] hover:border-[#CCC4B8] hover:bg-[#FAF8F5]'
                              }`}
                            >
                              {d}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Separator line with extra gap */}
                  <hr className="border-0 border-t border-[#E5DDD0] w-full" />

                  {/* 4. Languages */}
                  <div className="flex items-start gap-2.5 sm:gap-3">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 rounded-full bg-[#F5ECE3] text-[#7A5B3E] flex items-center justify-center font-ubuntu font-semibold text-[12px] sm:text-[12.5px] mt-0.5 select-none">
                      4
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="font-ubuntu font-semibold text-[14px] sm:text-[14.5px] text-[#1A1918] tracking-tight mb-0.5">
                        Language Preferences
                      </h2>
                      <p className="font-ubuntu text-[11.5px] text-[#78726A] mb-2">
                        Set your conversational AI and report presentation languages.
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="text-[10.5px] font-semibold text-[#78726A] uppercase tracking-wider block mb-1 font-dm-sans">
                            Conversational Voice / Bidi
                          </label>
                          <select 
                            value={bidiLang} 
                            onChange={e => setBidiLang(e.target.value)} 
                            className="w-full p-2 bg-white border border-[#E5DFD7] rounded-lg text-[12.5px] text-[#1A1918] outline-none focus:border-[#701A23] font-dm-sans"
                          >
                            {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10.5px] font-semibold text-[#78726A] uppercase tracking-wider block mb-1 font-dm-sans">
                            Written Briefing Language
                          </label>
                          <select 
                            value={reportLang} 
                            onChange={e => setReportLang(e.target.value)} 
                            className="w-full p-2 bg-white border border-[#E5DFD7] rounded-lg text-[12.5px] text-[#1A1918] outline-none focus:border-[#701A23] font-dm-sans"
                          >
                            {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Separator line before footer */}
                  <hr className="border-0 border-t border-[#E5DDD0] w-full" />

                  {/* Bottom Row Step 2 */}
                  <div className="pt-1 pb-4 sm:pb-2 flex items-center justify-between gap-3">
                    <button 
                      type="button" 
                      onClick={() => setStep(1)} 
                      className="px-4 py-2 rounded-full font-medium text-[12.5px] sm:text-[13px] border border-[#E5DFD7] text-[#4A4641] hover:bg-[#FAF8F5] transition-all flex items-center gap-1 cursor-pointer font-dm-sans"
                    >
                      <ArrowLeft size={13} />
                      <span>Back</span>
                    </button>
                    <button 
                      type="submit" 
                      disabled={loading} 
                      className="bg-[#701A23] hover:bg-[#58141B] text-white px-5 py-2.5 rounded-full font-medium text-[13px] sm:text-[13.5px] transition-all shadow-md disabled:opacity-70 flex items-center gap-1 cursor-pointer font-dm-sans"
                    >
                      <span>{loading ? 'Building Engine...' : 'Complete Profile'}</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>
                </form>
              )}
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
