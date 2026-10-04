"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Menu, X, LayoutDashboard } from "lucide-react";
import { hasClientSession } from "@/lib/auth";
import { useClientValue } from "@/hooks/useClientValue";

export default function Header() {
  const [activeSection, setActiveSection] = useState<string>("home");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isAuthenticated = useClientValue(() => (hasClientSession() ? 1 : 0)) === 1;

  useEffect(() => {
    const handleScroll = () => {
      const sections = ["home", "how-it-works", "features", "about"];
      const scrollPosition = window.scrollY + 160;

      for (const section of sections) {
        const el = document.getElementById(section);
        if (!el) continue;
        const top = el.offsetTop;
        const height = el.offsetHeight;
        if (scrollPosition >= top && scrollPosition < top + height) {
          setActiveSection(section);
          break;
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: "Home", href: "#home", id: "home" },
    { name: "How it works", href: "#how-it-works", id: "how-it-works" },
    { name: "Features", href: "#features", id: "features" },
    { name: "Vision", href: "#vision", id: "vision" },
    { name: "About", href: "#about", id: "about" },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#FAF8F5]/95 backdrop-blur-sm border-b border-[#E8E2D8]/60">
      <div className="max-w-[1536px] mx-auto px-4 sm:px-8 lg:px-12 h-[64px] sm:h-[76px] md:h-[88px] flex items-center justify-between">
        <Link href="#home" className="flex items-center shrink-0">
          <Image
            src="/images/logo.png"
            alt="Ambition Gazette"
            width={240}
            height={100}
            className="h-[42px] sm:h-[54px] md:h-[64px] w-auto object-contain object-left mix-blend-multiply"
            priority
          />
        </Link>

        <nav className="hidden md:flex items-center gap-8 lg:gap-10 text-[12px] font-bold uppercase tracking-wider text-[#a7a5a3] font-dm-sans">
          {navLinks.map((link) => {
            const isActive = activeSection === link.id;
            return (
              <a
                key={link.id}
                href={link.href}
                className={`relative pb-1.5 transition-colors duration-200 ${
                  isActive ? "text-[#1A1918]" : "hover:text-[#1A1918]"
                }`}
              >
                {link.name}
                {isActive && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-[2px] bg-[#701A23]" />
                )}
              </a>
            );
          })}
        </nav>

        <div className="hidden md:flex items-center">
          <Link
            href={isAuthenticated ? "/today" : "/login"}
            className="inline-flex items-center gap-2 bg-[#701A23] hover:bg-[#58141B] text-white px-5 py-2.5 rounded-full text-sm font-medium transition-colors font-dm-sans"
          >
            {isAuthenticated ? (
              <>
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard</span>
              </>
            ) : (
              <>
                <span>Get Started</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Link>
        </div>

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 rounded-lg text-[#1A1918] hover:bg-[#EAE4DC]/50 transition-colors"
          aria-label="Toggle Navigation Menu"
        >
          {mobileMenuOpen ? <X className="w-5 h-5 sm:w-6 sm:h-6" /> : <Menu className="w-5 h-5 sm:w-6 sm:h-6" />}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden bg-[#FAF8F5] border-t border-[#E8E2D8] px-4 sm:px-8 py-4 flex flex-col gap-2.5 font-dm-sans shadow-lg">
          {navLinks.map((link) => (
            <a
              key={link.id}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className={`py-2 text-[15px] font-dm-sans transition-colors ${
                activeSection === link.id ? "text-[#701A23] font-semibold" : "text-[#524E48] hover:text-[#1A1918] font-medium"
              }`}
            >
              {link.name}
            </a>
          ))}
          <Link
            href={isAuthenticated ? "/today" : "/login"}
            onClick={() => setMobileMenuOpen(false)}
            className="w-full inline-flex items-center justify-center gap-2 bg-[#701A23] text-white py-2.5 mt-1 rounded-full text-sm font-medium hover:bg-[#58141B] transition-colors font-dm-sans"
          >
            {isAuthenticated ? (
              <>
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard</span>
              </>
            ) : (
              <>
                <span>Get Started</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Link>
        </div>
      )}
    </header>
  );
}
