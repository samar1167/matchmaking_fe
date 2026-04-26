"use client";

import { isAxiosError } from "axios";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { usePlanAccess } from "@/hooks/usePlanAccess";
import { planService } from "@/services/planService";
import type { PaymentHistoryItem } from "@/types/plan";

function PaymentHistorySection({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
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
      <div className="mt-6">{children}</div>
    </section>
  );
}

function PaymentHistoryEmpty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-[#C07771] bg-[#fffafa] p-6 text-sm leading-6 text-[#2d1718]/65">
      {children}
    </div>
  );
}

function PaymentHistoryAlert({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-[#EABFB9] bg-[#fdf1f0] px-4 py-3 text-sm font-semibold text-[#901214]">
      {children}
    </div>
  );
}

const getPaymentTime = (payment: PaymentHistoryItem) => {
  const rawDate = payment.completed_at ?? payment.created_at;

  if (!rawDate) {
    return 0;
  }

  const timestamp = new Date(rawDate).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

const formatDate = (value?: string) => {
  if (!value) {
    return "Pending";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const formatAmount = (value?: string) => {
  if (!value) {
    return "N/A";
  }

  const parsed = Number(value);

  if (Number.isNaN(parsed)) {
    return value;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(parsed);
};

const formatStatus = (value?: string) => {
  if (!value) {
    return "Unknown";
  }

  return value
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
};

const getStatusClasses = (status?: string) => {
  const normalized = status?.toLowerCase();

  if (normalized === "completed" || normalized === "success" || normalized === "succeeded") {
    return "border-[#bfdcc5] bg-[#f3fbf5] text-[#1f7a3f]";
  }

  if (normalized === "pending" || normalized === "processing") {
    return "border-[#e7d2a7] bg-[#fff9ee] text-[#8a6514]";
  }

  if (normalized === "failed" || normalized === "cancelled") {
    return "border-[#eabfb9] bg-[#fff4f2] text-[#901214]";
  }

  return "border-[rgba(144,18,20,0.1)] bg-[#fafafa] text-[#7f533e]";
};

const getErrorMessage = (error: unknown) => {
  if (isAxiosError(error)) {
    const payload = error.response?.data;

    if (typeof payload === "string") {
      return payload;
    }

    if (payload && typeof payload === "object") {
      const detail =
        "detail" in payload && typeof payload.detail === "string"
          ? payload.detail
          : "message" in payload && typeof payload.message === "string"
            ? payload.message
            : null;

      if (detail) {
        return detail;
      }
    }
  }

  return "Unable to load payment history right now.";
};

export function PaymentHistoryManager() {
  const { credits, isLoading: isPlanLoading } = usePlanAccess();
  const [payments, setPayments] = useState<PaymentHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await planService.getPaymentHistory();

        if (cancelled) {
          return;
        }

        const sortedPayments = [...response.payments].sort(
          (left, right) => getPaymentTime(right) - getPaymentTime(left),
        );

        setPayments(sortedPayments);
      } catch (loadError) {
        if (!cancelled) {
          setError(getErrorMessage(loadError));
          setPayments([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const totalPurchasedCredits = useMemo(
    () =>
      payments.reduce(
        (sum, payment) => sum + (payment.credits_purchased ?? 0),
        0,
      ),
    [payments],
  );

  const completedPayments = useMemo(
    () =>
      payments.filter((payment) =>
        ["completed", "success", "succeeded"].includes(payment.status?.toLowerCase() ?? ""),
      ).length,
    [payments],
  );

  return (
    <main className="min-h-screen bg-[#fffafa] text-[#2d1718]">
      <section className="bg-[linear-gradient(180deg,#fffafa_0%,#fdf1f0_100%)] px-6 py-10">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <p className="inline-flex rounded-full bg-[#EABFB9] px-4 py-2 text-sm font-bold text-[#901214]">
              payment and credits
            </p>
            <h1 className="mt-5 max-w-3xl font-display text-6xl font-bold leading-[1.05] tracking-tight text-[#2d1718]">
              Payment history
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-[#2d1718]/72">
            </p>
          </div>
          <div className="rounded-2xl border border-[#EABFB9] bg-[#fafafa] p-6 shadow-[0_18px_42px_rgba(144,18,20,0.1)]">
            <p className="text-sm font-bold text-[#901214]">Billing Snapshot</p>
            <div className="mt-5 grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-[#EABFB9] bg-[#fffafa] p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#7F533E]">
                  Available Credits
                </p>
                <p className="mt-2 font-display text-5xl font-bold text-[#901214]">
                  {isPlanLoading ? "..." : credits}
                </p>
              </div>
              <Link
                href="/dashboard#credits-access"
                className="group rounded-xl border border-dashed border-[#C07771] bg-[#fdf1f0] p-5 text-left transition hover:border-[#901214] hover:bg-[#fafafa]"
              >
                <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-[#7F533E]">
                  Buy More
                </span>
                <span className="mt-2 block font-display text-5xl font-bold leading-none text-[#901214]">
                  +
                </span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-8">
        {error ? <PaymentHistoryAlert>{error}</PaymentHistoryAlert> : null}

        <PaymentHistorySection
          eyebrow="Overview"
          title="Purchase summary"
          description="A quick look at your credits and completed transactions."
        >
          <div className="grid gap-5 md:grid-cols-3">
            <div className="rounded-xl border border-[#EABFB9] bg-[#fffafa] p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#7F533E]">
                Available Credits
              </p>
              <p className="mt-2 font-display text-5xl font-bold text-[#901214]">
                {isPlanLoading ? "..." : credits}
              </p>
            </div>
            <div className="rounded-xl border border-[#EABFB9] bg-[#fffafa] p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#7F533E]">
                Purchased Credits
              </p>
              <p className="mt-2 font-display text-5xl font-bold text-[#901214]">
                {isLoading ? "..." : totalPurchasedCredits}
              </p>
            </div>
            <div className="rounded-xl border border-[#EABFB9] bg-[#fffafa] p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#7F533E]">
                Completed Payments
              </p>
              <p className="mt-2 font-display text-5xl font-bold text-[#901214]">
                {isLoading ? "..." : completedPayments}
              </p>
            </div>
          </div>
        </PaymentHistorySection>

        <PaymentHistorySection
          eyebrow="Billing"
          title="Transactions"
          description="Your most recent payments appear first."
        >
          {isLoading ? (
            <PaymentHistoryEmpty>Loading payment history...</PaymentHistoryEmpty>
          ) : payments.length === 0 ? (
            <PaymentHistoryEmpty>
              No payment history is available yet. Buy credits from the dashboard when you are
              ready.
            </PaymentHistoryEmpty>
          ) : (
            <div className="overflow-hidden rounded-xl border border-[#EABFB9] bg-[#fffdfc] shadow-[0_10px_24px_rgba(144,18,20,0.05)]">
              <div className="hidden grid-cols-[1.15fr_0.85fr_0.8fr_1.2fr_1fr] gap-4 border-b border-[#EABFB9] bg-[#fdf1f0] px-5 py-4 text-[11px] font-bold uppercase tracking-[0.22em] text-[#7f533e] md:grid">
                <span>Reference</span>
                <span>Amount</span>
                <span>Credits</span>
                <span>Date</span>
                <span>Status</span>
              </div>

              <div className="divide-y divide-[#EABFB9]">
                {payments.map((payment) => (
                  <article
                    key={payment.id}
                    className="grid gap-4 px-5 py-5 md:grid-cols-[1.15fr_0.85fr_0.8fr_1.2fr_1fr] md:items-center"
                  >
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#7F533E]">
                        Reference
                      </p>
                      <p className="mt-2 break-all text-sm font-semibold text-[#2d1718]">
                        {payment.payment_reference ?? String(payment.id)}
                      </p>
                    </div>

                    <div>
                      <p className={cn("text-[11px] font-bold uppercase tracking-[0.18em] text-[#7F533E]", "md:hidden")}>
                        Amount
                      </p>
                      <p className="mt-2 text-sm font-semibold text-[#2d1718] md:mt-0">
                        {formatAmount(payment.amount_usd)}
                      </p>
                    </div>

                    <div>
                      <p className={cn("text-[11px] font-bold uppercase tracking-[0.18em] text-[#7F533E]", "md:hidden")}>
                        Credits
                      </p>
                      <p className="mt-2 text-sm font-semibold text-[#2d1718] md:mt-0">
                        {payment.credits_purchased ?? 0}
                      </p>
                    </div>

                    <div>
                      <p className={cn("text-[11px] font-bold uppercase tracking-[0.18em] text-[#7F533E]", "md:hidden")}>
                        Date
                      </p>
                      <p className="mt-2 text-sm font-semibold text-[#2d1718] md:mt-0">
                        {formatDate(payment.completed_at ?? payment.created_at)}
                      </p>
                    </div>

                    <div>
                      <p className={cn("text-[11px] font-bold uppercase tracking-[0.18em] text-[#7F533E]", "md:hidden")}>
                        Status
                      </p>
                      <span
                        className={cn(
                          "mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] md:mt-0",
                          getStatusClasses(payment.status),
                        )}
                      >
                        {formatStatus(payment.status)}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}
        </PaymentHistorySection>
      </div>
    </main>
  );
}
