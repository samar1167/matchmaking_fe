import { FooterLinkPage } from "@/components/site-info/footer-link-page";
import { footerInfoPages } from "@/components/site-info/footer-link-content";

export default function ContactUsPage() {
  return <FooterLinkPage content={footerInfoPages["contact-us"]} />;
}
