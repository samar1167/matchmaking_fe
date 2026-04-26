import { FooterLinkPage } from "@/components/site-info/footer-link-page";
import { footerInfoPages } from "@/components/site-info/footer-link-content";

export default function HowItWorksPage() {
  return <FooterLinkPage content={footerInfoPages["how-it-works"]} />;
}
