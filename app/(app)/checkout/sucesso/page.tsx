import type { Metadata } from "next";
import { SucessoClient } from "./client";

export const metadata: Metadata = {
  title: "Pagamento confirmado · EnsaioPro",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function CheckoutSucessoPage() {
  return <SucessoClient />;
}
