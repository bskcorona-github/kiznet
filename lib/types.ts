export type Gender = 'male' | 'female' | 'other' | 'unknown';
export type RelationshipType = 'parent_child' | 'spouse' | 'adoption';

export interface TreeSummary {
  id: string;
  title: string;
  createdAt: string;
}

export interface Person {
  id: string;
  treeId: string;
  familyName: string;
  givenName: string;
  kana?: string | null;
  gender: Gender;
  birthDate?: string | null; // YYYY-MM-DD
  deathDate?: string | null; // YYYY-MM-DD
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Relationship {
  id: string;
  treeId: string;
  type: RelationshipType;
  fromId: string;
  toId: string;
  startDate?: string | null;
  endDate?: string | null;
  createdAt: string;
}

export interface TreeDetail {
  tree: TreeSummary;
  persons: Person[];
  relationships: Relationship[];
}


