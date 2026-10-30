import {
  LegalDocumentPage,
  legalDocumentMetadata,
} from "@/components/legal/LegalPages";

export function generateMetadata() {
  return legalDocumentMetadata("disclaimer");
}

export default function DisclaimerPage() {
  return <LegalDocumentPage id="disclaimer" />;
}
