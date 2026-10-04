import Image from "next/image";
import Link from "next/link";

const PRODUCT_LINKS = [
  { label: "Home", href: "#home" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Features", href: "#features" },
  { label: "About", href: "#about" },
];

export default function Footer() {
  return (
    <footer className="relative bg-[#FAF8F5] pt-12 pb-8 overflow-hidden border-t border-[#E8E2D8]">
      {/* Full Background Mountain Visual */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-10 mix-blend-multiply">
        <Image
          src="/images/snow_mountain_visuals.png"
          alt="Mountains Background"
          fill
          className="object-cover object-bottom"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#FAF8F5] via-[#FAF8F5]/50 to-transparent" />
      </div>

      {/* Top gentle wave curve */}
      <div className="absolute top-0 left-0 right-0 h-10 pointer-events-none opacity-40">
        <svg viewBox="0 0 1536 40" preserveAspectRatio="none" className="w-full h-full">
          <path d="M 0 28 Q 380 8 768 22 T 1536 16" fill="none" stroke="#D8CFBE" strokeWidth="1.2" />
        </svg>
      </div>

      <div className="relative max-w-[1536px] mx-auto px-4 sm:px-8 lg:px-12 pt-4 sm:pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-12 lg:gap-8 items-start">
          {/* Brand & Bio */}
          <div className="lg:col-span-7 space-y-4 sm:space-y-5 lg:pr-4">
            <Link href="#home" className="inline-block">
              <Image
                src="/images/logo.png"
                alt="Ambition Gazette"
                width={200}
                height={100}
                className="h-[52px] sm:h-[68px] w-auto object-contain object-left mix-blend-multiply"
              />
            </Link>
            <p className="text-[10.5px] sm:text-[11px] font-semibold tracking-[0.18em] text-[#8A847C] uppercase leading-relaxed">
              Trace events across time. <br />
              Connect them to your ambitions.
            </p>
            <p className="text-[13px] sm:text-sm text-[#615C55] leading-relaxed max-w-md">
              A briefing that remembers the stories you follow and tells you only when something changes your plan.
            </p>
          </div>

          {/* Navigation */}
          <nav aria-label="Footer" className="lg:col-span-5 space-y-4">
            <div>
              <span className="text-[11px] font-semibold tracking-[0.16em] text-[#1A1918] uppercase">Product</span>
              <span className="block w-8 h-[2px] bg-[#701A23] mt-1" />
            </div>
            <ul className="space-y-3 text-[14px] text-[#615C55]">
              {PRODUCT_LINKS.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="hover:text-[#701A23] transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Bottom Sub-bar */}
        <div className="relative mt-8 pt-5 border-t border-[#E8E2D8] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <p className="text-sm text-[#8A847C] z-10">© 2026 Ambition Gazette. All rights reserved.</p>

          <div className="absolute right-0 bottom-6 w-[45%] max-w-[500px] h-20 pointer-events-none hidden sm:block">
            <svg viewBox="0 0 500 80" className="w-full h-full" fill="none" aria-hidden>
              <path d="M 0 60 C 120 10, 200 80, 320 40 S 450 15, 500 30" stroke="#701A23" strokeWidth="1.4" className="opacity-60" />
              <circle cx="320" cy="40" r="3" fill="#701A23" />
            </svg>
          </div>

          <div className="flex items-center gap-3 z-10 sm:ml-auto">
            <span className="w-10 h-[2px] bg-[#701A23]" />
            <span className="text-sm text-[#615C55]">A more informed you.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
