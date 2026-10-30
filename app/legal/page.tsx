import { LegalHubPage, legalHubMetadata } from "@/components/legal/LegalPages";

export function generateMetadata() {
  return legalHubMetadata();
}

export default function LegalPage() {
  return <LegalHubPage />;
}
