import * as ppsService from './pps.service';
import { GamelistField, GamelistItem } from '../types/pps';

// Get Gamelist jarang berubah - cache di memory biar createTrx gak nembak PPS 2x
// (sekali buat resolve field, sekali lagi buat Direct Top Up beneran) tiap kali order.
const TTL_MS = 10 * 60 * 1000; // 10 menit

let cache: GamelistItem[] | null = null;
let cachedAt = 0;

async function getAll(): Promise<GamelistItem[]> {
  const now = Date.now();
  if (!cache || now - cachedAt > TTL_MS) {
    cache = await ppsService.getGamelist();
    cachedAt = now;
  }
  return cache;
}

export async function getFieldsForProduct(productCode: string): Promise<GamelistField[] | undefined> {
  const list = await getAll();
  return list.find((item) => item.product === productCode)?.fields;
}
