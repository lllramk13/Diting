import type { GameConfig } from "./types";
import { p2is } from "./p2is";
import { p2ep } from "./p2ep";
import { p1 } from "./p1";
import { sf2 } from "./sf2"
import { dds1 } from './dds1'

export const games: GameConfig[] = [p2is, p2ep, p1, dds1, sf2]

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