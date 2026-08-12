import type { Metadata } from "next";

import { ConnectFourGame } from "@/components/games/connect-four/connect-four-game";

export const metadata: Metadata = {
  title: "Connect Four vs Brandon",
  description: "Challenge Brandon to a local game of Connect Four.",
};

export default function ConnectFourPage() {
  return <ConnectFourGame />;
}
