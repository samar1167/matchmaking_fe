import Link from "next/link";
import type { FooterInfoPageContent } from "@/components/site-info/footer-link-content";
import { SiteFooter } from "@/components/layout/site-footer";

function InfoSectionCard({
  description,
  eyebrow,
  points,
  title,
}: FooterInfoPageContent["sections"][number]) {
  return (
    <section className="rounded-2xl border border-[#EABFB9] bg-[#fafafa] p-6 shadow-[0_14px_34px_rgba(144,18,20,0.06)]">
      <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#A22E34]">
        {eyebrow}
      </p>
      <h2 className="mt-2 font-display text-3xl font-bold leading-tight text-[#2d1718]">
        {title}
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[#2d1718]/70">
        {description}
      </p>
      <ul className="mt-6 grid gap-3">
        {points.map((point) => (
          <li
            key={point}
            className="rounded-xl border border-[#EABFB9] bg-[#fffafa] px-4 py-4 text-sm leading-6 text-[#2d1718]/75"
          >
            {point}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function FooterLinkPage({
  content,
}: {
  content: FooterInfoPageContent;
}) {
  return (
    <>
      <main className="min-h-screen bg-[#fffafa] text-[#2d1718]">
        <section className="bg-[linear-gradient(180deg,#fffafa_0%,#fdf1f0_100%)] px-6 py-10">
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div>
              <p className="inline-flex rounded-full bg-[#EABFB9] px-4 py-2 text-sm font-bold text-[#901214]">
                {content.eyebrow}
              </p>
              <h1 className="mt-5 max-w-3xl font-display text-5xl font-bold leading-[1.05] tracking-tight text-[#2d1718] sm:text-6xl">
                {content.title}
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-[#2d1718]/72">
                {content.description}
              </p>
            </div>
            <div className="rounded-2xl border border-[#EABFB9] bg-[#fafafa] p-6 shadow-[0_18px_42px_rgba(144,18,20,0.1)]">
              <p className="text-sm font-bold text-[#901214]">{content.badgeLabel}</p>
              <div className="mt-5 grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-[#EABFB9] bg-[#fffafa] p-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#7F533E]">
                    Highlight
                  </p>
                  <p className="mt-2 font-display text-2xl font-bold leading-tight text-[#901214]">
                    {content.badgeValue}
                  </p>
                </div>
                <div className="rounded-xl border border-dashed border-[#C07771] bg-[#fdf1f0] p-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#7F533E]">
                    {content.statLabel}
                  </p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-[#2d1718]">
                    {content.statValue}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-8">
          {content.sections.map((section) => (
            <InfoSectionCard key={section.title} {...section} />
          ))}

          <section className="overflow-hidden rounded-xl bg-[#A22E34] px-8 py-6 text-white">
            <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#EABFB9]">
                  Sample destination
                </p>
                <h2 className="mt-3 font-display text-3xl font-bold">
                  Footer pages now have styled placeholders
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/85">
                  These routes can now be replaced with final product, legal, or support copy
                  without changing the page structure again.
                </p>
              </div>
              <Link
                href="/?view=public"
                className="inline-flex min-h-12 items-center justify-center rounded-md bg-[#fafafa] px-6 text-sm font-bold text-[#0c0d0a] transition hover:bg-[#eabfb9]"
              >
                Return Home
              </Link>
            </div>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
