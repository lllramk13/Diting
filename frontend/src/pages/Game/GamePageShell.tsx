import type { ReactNode } from "react"
import TopNav from "../Home/TopNav"
import type { GameConfig } from "../../games/types"
import GameNav from "./GameNav"

type GamePageShellProps = {
  game: GameConfig
  children: ReactNode
}

export default function GamePageShell({ game, children }: GamePageShellProps) {
  return (
    <>
      <TopNav />
      <GameNav game={game} />
      {children}
    </>
  )
}