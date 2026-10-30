import {
  LegalDocumentPage,
  legalDocumentMetadata,
} from "@/components/legal/LegalPages";

export function generateMetadata() {
  return legalDocumentMetadata("privacy");
}

export default function PrivacyPolicyPage() {
  return <LegalDocumentPage id="privacy" />;
}
