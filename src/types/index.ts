import { z } from "zod";

// Database types
export type Tree = {
  id: number;
  name: string;
  description?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type Person = {
  id: number;
  treeId: number;
  firstName: string;
  lastName?: string | null;
  sex?: "male" | "female" | "other" | "unknown" | null;
  birthOrder?: string | null; // 長男、次男、三男、長女、次女、三女等
  birthDate?: string | null;
  deathDate?: string | null;
  isDeceased: boolean;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  prefecture?: string | null;
  country?: string | null;
  lat?: string | null;
  lng?: string | null;
  note?: string | null;
  // 写真（Vercel Blob URL）
  photoUrl?: string | null;
  // 家系図での表示位置（手動配置の保存用）
  positionX?: number | null;
  positionY?: number | null;
  createdAt: Date;
  updatedAt: Date;
};

export type Relationship = {
  id: number;
  treeId: number;
  parentId: number;
  childId: number;
  createdAt: Date;
};

export type Partnership = {
  id: number;
  treeId: number;
  partnerAId: number;
  partnerBId: number;
  isFlipped?: boolean; // 夫婦線の向きを反転（A:左/B:右）
  startDate?: string | null;
  endDate?: string | null;
  type: "marriage" | "partner";
  createdAt: Date;
};

// React Flow types
export type PersonNode = {
  id: string;
  type: "person";
  data: {
    person: Person;
    isSelected?: boolean;
    isSearchHighlighted?: boolean;
  };
  position: { x: number; y: number };
};

export type FamilyEdge = {
  id: string;
  source: string;
  target: string;
  type?: "parent-child" | "partnership";
  // precise handle connections for exact alignment to node handles
  sourceHandle?: string;
  targetHandle?: string;
  data?: {
    relationship?: Relationship;
    partnership?: Partnership;
  };
};

// Form validation schemas
export const PersonSchema = z.object({
  firstName: z.string().min(1, "名前を入力してください").max(80),
  lastName: z.string().max(80).nullable().optional(),
  sex: z.enum(["male", "female", "other", "unknown"]).nullable().optional(),
  birthOrder: z.string().max(20).nullable().optional(), // 長男、次男、三男、長女、次女、三女等
  birthDate: z.string().nullable().optional(),
  deathDate: z.string().nullable().optional(),
  isDeceased: z.boolean().default(false),
  email: z.union([
    z.string().email("有効なメールアドレスを入力してください").max(160),
    z.literal(""),
    z.null()
  ]).optional(),
  phone: z.string().max(40).nullable().optional(),
  address: z.string().max(240).nullable().optional(),
  city: z.string().max(120).nullable().optional(),
  prefecture: z.string().max(120).nullable().optional(),
  country: z.string().max(120).nullable().optional(),
  lat: z.string().max(32).nullable().optional(),
  lng: z.string().max(32).nullable().optional(),
  note: z.string().max(1000).nullable().optional(),
  // 写真URL
  photoUrl: z.string().max(500).nullable().optional(),
  // 家系図での表示位置
  positionX: z.number().nullable().optional(),
  positionY: z.number().nullable().optional(),
});

export const TreeSchema = z.object({
  name: z.string().min(1, "家系図名を入力してください").max(120),
  description: z.string().max(500).optional(),
});

export const RelationshipSchema = z.object({
  parentId: z.number(),
  childId: z.number(),
});

export const PartnershipSchema = z.object({
  partnerAId: z.number(),
  partnerBId: z.number(),
  isFlipped: z.boolean().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  type: z.enum(["marriage", "partner"]).default("marriage"),
});

// Export/Import types
export type ExportData = {
  tree: Tree;
  people: Person[];
  relationships: Relationship[];
  partnerships: Partnership[];
  exportedAt: string;
};

export type CSVData = {
  people: Person[];
  relationships: Relationship[];
  partnerships: Partnership[];
};

// Search/Filter types
export type SearchFilters = {
  name?: string;
  sex?: "male" | "female" | "other" | "unknown" | "all";
  livingStatus?: "living" | "deceased" | "all";
};
