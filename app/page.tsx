import type { Metadata } from "next";
import ScriptStudio from "./script-studio";

// No `title` here on purpose: the layout template would render it as
// a doubled "CreatorStudio · CreatorStudio". The layout default already names the app.
export const metadata: Metadata = {
  description: "Du sujet au script et au packaging YouTube, sans rien inventer.",
};

export default function Home() {
  return <ScriptStudio />;
}
