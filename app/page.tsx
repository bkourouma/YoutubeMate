import type { Metadata } from "next";
import ScriptStudio from "./script-studio";

export const metadata: Metadata = {
  title: "Script Studio",
  description: "Du sujet au script et au packaging YouTube, sans rien inventer.",
};

export default function Home() {
  return <ScriptStudio />;
}
