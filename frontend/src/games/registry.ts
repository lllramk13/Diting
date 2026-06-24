import type { GameConfig } from "./types";
import { p2is } from "./p2is";
import { p2ep } from "./p2ep";

export const games: GameConfig[] = [p2is, p2ep]

export function getGameBySlug(slug: string): GameConfig | undefined {
    return games.find((game) => game.slug === slug)
}

export function getGamesByPlatform(): Record<string, GameConfig[]> {
    return games.reduce<Record<string, GameConfig[]>>((groups, game) => {
        if (!groups[game.platform]) {
            groups[game.platform] = []
        }

        groups[game.platform].push(game)
        return groups
    }, {})
}