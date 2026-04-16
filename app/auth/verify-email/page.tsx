import { Suspense } from "react";
import { VerifyEmailHandler } from "@/components/auth/verify-email-handler";

export default function AuthVerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailHandler />
    </Suspense>
  );
}
