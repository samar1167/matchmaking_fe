import { FooterLinkPage } from "@/components/site-info/footer-link-page";
import { footerInfoPages } from "@/components/site-info/footer-link-content";

export default function TermsOfServicePage() {
  return <FooterLinkPage content={footerInfoPages["terms-of-service"]} />;
}
