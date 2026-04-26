import Link from "next/link";

export const footerLinks = [
  { href: "/about-us", label: "About Us" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/privacy-policy", label: "Privacy Policy" },
  { href: "/terms-of-service", label: "Terms of Service" },
  { href: "/contact-us", label: "Contact Us" },
];

function FooterLogo() {
  return (
    <Link href="/?view=public" className="flex min-w-max items-center gap-3 text-[#901214]">
      <span className="relative flex h-8 w-8 items-center justify-center" aria-hidden="true">
        <span className="absolute left-1 top-1 h-5 w-5 rotate-45 rounded-tl-full rounded-tr-full border-2 border-[#901214]" />
        <span className="absolute right-1 top-1 h-5 w-5 -rotate-45 rounded-tl-full rounded-tr-full border-2 border-[#901214]" />
      </span>
      <span className="font-display text-3xl font-bold leading-none tracking-tight">
        Luster
      </span>
    </Link>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-[#EABFB9] bg-[#fffafa] px-8 py-5">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 md:flex-row">
        <FooterLogo />
        <div className="flex flex-wrap justify-center gap-8 text-sm text-[#2d1718]/70">
          {footerLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition hover:text-[#901214]"
            >
              {link.label}
            </Link>
          ))}
        </div>
        <div className="flex gap-4 text-[#901214]" aria-hidden="true">
          <span>●</span>
          <span>◎</span>
          <span>◒</span>
          <span>in</span>
        </div>
      </div>
    </footer>
  );
}
