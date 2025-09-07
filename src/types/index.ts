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
  data?: {
    relationship?: Relationship;
    partnership?: Partnership;
  };
};

// Form validation schemas
export const PersonSchema = z.object({
  firstName: z.string().min(1, "名前を入力してください").max(80),
  lastName: z.string().max(80).optional(),
  sex: z.enum(["male", "female", "other", "unknown"]).optional(),
  birthDate: z.string().optional(),
  deathDate: z.string().optional(),
  isDeceased: z.boolean().default(false),
  email: z.string().email("有効なメールアドレスを入力してください").max(160).optional().or(z.literal("")),
  phone: z.string().max(40).optional(),
  address: z.string().max(240).optional(),
  city: z.string().max(120).optional(),
  prefecture: z.string().max(120).optional(),
  country: z.string().max(120).optional(),
  lat: z.string().max(32).optional(),
  lng: z.string().max(32).optional(),
  note: z.string().max(1000).optional(),
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
