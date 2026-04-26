import { FooterLinkPage } from "@/components/site-info/footer-link-page";
import { footerInfoPages } from "@/components/site-info/footer-link-content";

export default function PrivacyPolicyPage() {
  return <FooterLinkPage content={footerInfoPages["privacy-policy"]} />;
}
