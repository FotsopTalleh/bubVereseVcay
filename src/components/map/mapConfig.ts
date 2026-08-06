/** Buea, Cameroon — fallback center when geolocation is denied/unavailable. */
export const DEFAULT_CENTER: [number, number] = [4.156, 9.2632];

export const DEFAULT_ZOOM = 11.5;

/**
 * Tile source, isolated here so it can be swapped later (e.g. for
 * MapTiler/Stadia Maps) without touching any map component's logic.
 */
export const TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
export const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export type Town = { name: string; center: [number, number] };

/** Planner-facing town shortlist — picking one jumps the venue-location map
 * there before the planner drops the exact pin. */
export const TOWNS: Town[] = [
  { name: "Buea", center: [4.156, 9.2632] },
  { name: "Limbe", center: [4.0225, 9.21] },
  { name: "Tiko", center: [4.0764, 9.3606] },
  { name: "Douala", center: [4.0511, 9.7679] },
  { name: "Yaoundé", center: [3.848, 11.5021] },
  { name: "Bamenda", center: [5.9631, 10.1591] },
  { name: "Kumba", center: [4.6363, 9.4469] },
  { name: "Bafoussam", center: [5.4737, 10.4176] },
  { name: "Kribi", center: [2.95, 9.9167] },
  { name: "Ebolowa", center: [2.9167, 11.15] },
  { name: "Dschang", center: [5.45, 10.05] },
  { name: "Garoua", center: [9.3265, 13.3958] },
  { name: "Maroua", center: [10.5913, 14.3153] },
  { name: "Ngaoundéré", center: [7.3167, 13.5833] },
];
