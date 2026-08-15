import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import "./shorts.css";
import { product } from "./config/product";

export async function generateMetadata(): Promise<Metadata> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const protocol = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const socialImage = `${protocol}://${host}/og.png`;
  return {
    title: { default: product.name, template: `%s · ${product.name}` },
    description: "Le studio qui transforme une idée en vidéo YouTube prête à publier, et une vidéo longue en série de shorts.",
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
    openGraph: { title: `${product.name} — de l’idée à la publication`, description: "Deux pipelines assistés par IA, Script Studio et Shorts Studio, avec des garde-fous qui ne laissent rien au hasard.", images: [socialImage] },
    twitter: { card: "summary_large_image", images: [socialImage] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
