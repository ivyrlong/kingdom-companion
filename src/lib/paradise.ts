/**
 * Shared Paradise Builder types + validation.
 *
 * A ParadisePage stores `placements` as JSON. Each Placement pins one
 * sticker on the scene at a fractional x/y (0..1 of scene width/height)
 * and a scale multiplier. Fractional coords make the layout responsive
 * — the same page looks right on a phone or a laptop without
 * repositioning. Rotation is optional; z-order is derived from array
 * order (last item drawn last = on top).
 *
 * The same sticker slug may appear many times — stackable/overlapping
 * placements are core to the game's play.
 */
import { z } from "zod";

export const placementSchema = z.object({
  id: z.string().min(1), // client-generated, unique within page
  stickerSlug: z.string().min(1),
  x: z.number().min(-0.2).max(1.2), // small overhang allowed
  y: z.number().min(-0.2).max(1.2),
  scale: z.number().min(0.1).max(4),
  rotation: z.number().optional(), // degrees, default 0
});

export const placementsSchema = z.array(placementSchema).max(100);

export type Placement = z.infer<typeof placementSchema>;
