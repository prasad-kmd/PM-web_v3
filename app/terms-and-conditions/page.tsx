import {
  LegalDocumentPage,
  legalDocumentMetadata,
} from "@/components/legal/LegalPages";

export function generateMetadata() {
  return legalDocumentMetadata("terms");
}

export default function TermsAndConditionsPage() {
  return <LegalDocumentPage id="terms" />;
}
