export type Point = { x: number; y: number };
export type Stroke = { points: Point[]; color: string; size: number; erase: boolean };
export type Artwork = { id: string; ownerId: string; catName: string; artistName: string; imageUrl: string; catConfidence: number | null; createdAt: number; motionPreset: number; sample?: boolean };
export type Draft = { strokes: Stroke[]; updatedAt: number };
export type Profile = { id: string; artistName: string; hasPublished: boolean; muted: boolean };
