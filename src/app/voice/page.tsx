import type { Metadata } from "next";
import { VoiceAssistant } from "./VoiceAssistant";

export const metadata: Metadata = { title: "Voice Assistant" };

export default function Page() {
  return <VoiceAssistant />;
}
