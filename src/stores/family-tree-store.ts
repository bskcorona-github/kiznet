import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { PersonNode, FamilyEdge, Person, Relationship, Partnership, Tree, SearchFilters } from "@/types";
import { autoLayout } from "@/lib/layout";

interface FamilyTreeState {
  // Current tree and data
  currentTree: Tree | null;
  nodes: PersonNode[];
  edges: FamilyEdge[];
  
  // Selected items
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  
  // UI state
  isLoading: boolean;
  error: string | null;
  
  // Search and filters
  searchFilters: SearchFilters;
  
  // History for undo/redo
  history: Array<{
    nodes: PersonNode[];
    edges: FamilyEdge[];
    timestamp: number;
  }>;
  historyIndex: number;
  maxHistorySize: number;
}

interface FamilyTreeActions {
  // Tree management
  setCurrentTree: (tree: Tree | null) => void;
  loadTreeData: (treeId: number) => Promise<void>;
  
  // Node management
  setNodes: (nodes: PersonNode[]) => void;
  addNode: (person: Person) => void;
  updateNode: (id: string, person: Partial<Person>) => void;
  removeNode: (id: string) => void;
  
  // Edge management
  setEdges: (edges: FamilyEdge[]) => void;
  addEdge: (edge: FamilyEdge) => void;
  removeEdge: (id: string) => void;
  
  // Selection
  selectNode: (id: string | null) => void;
  selectEdge: (id: string | null) => void;
  
  // Layout
  applyAutoLayout: () => Promise<void>;
  
  // Search and filter
  setSearchFilters: (filters: Partial<SearchFilters>) => void;
  getFilteredNodes: () => PersonNode[];
  
  // History (undo/redo)
  saveToHistory: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  
  // UI state
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Utilities
  getPersonById: (id: string) => Person | null;
  getNodeById: (id: string) => PersonNode | null;
  reset: () => void;
}

type FamilyTreeStore = FamilyTreeState & FamilyTreeActions;

// 初期状態
const initialState: FamilyTreeState = {
  currentTree: null,
  nodes: [],
  edges: [],
  selectedNodeId: null,
  selectedEdgeId: null,
  isLoading: false,
  error: null,
  searchFilters: {},
  history: [],
  historyIndex: -1,
  maxHistorySize: 50,
};

export const useFamilyTreeStore = create<FamilyTreeStore>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    // Tree management
    setCurrentTree: (tree) => {
      set({ currentTree: tree });
    },

    loadTreeData: async (treeId: number) => {
      console.log("🚀 Loading tree data for treeId:", treeId);
      set({ isLoading: true, error: null });
      
      try {
        // Parallel fetch of all data
        const [peopleRes, relationshipsRes, partnershipsRes] = await Promise.all([
          fetch(`/api/people?treeId=${treeId}`),
          fetch(`/api/relationships?treeId=${treeId}`),
          fetch(`/api/partnerships?treeId=${treeId}`),
        ]);

        if (!peopleRes.ok || !relationshipsRes.ok || !partnershipsRes.ok) {
          const errorDetails = {
            people: !peopleRes.ok ? `${peopleRes.status}: ${peopleRes.statusText}` : "OK",
            relationships: !relationshipsRes.ok ? `${relationshipsRes.status}: ${relationshipsRes.statusText}` : "OK",
            partnerships: !partnershipsRes.ok ? `${partnershipsRes.status}: ${partnershipsRes.statusText}` : "OK"
          };
          throw new Error(`Failed to fetch tree data: ${JSON.stringify(errorDetails)}`);
        }

        const [people, relationships, partnerships]: [Person[], Relationship[], Partnership[]] = 
          await Promise.all([
            peopleRes.json(),
            relationshipsRes.json(),
            partnershipsRes.json(),
          ]);

        console.log("📊 Data loaded:", {
          people: people.length,
          relationships: relationships.length,
          partnerships: partnerships.length
        });
        
        // Convert to React Flow format
        const nodes: PersonNode[] = people.map((person) => ({
          id: person.id.toString(),
          type: "person" as const,
          data: { person },
          position: { x: Math.random() * 400, y: Math.random() * 400 },
        }));

        const edges: FamilyEdge[] = [
          ...relationships.map((rel): FamilyEdge => ({
            id: `rel-${rel.id}`,
            source: rel.parentId.toString(),
            target: rel.childId.toString(),
            type: "parent-child",
            data: { relationship: rel },
          })),
          ...partnerships.map((part): FamilyEdge => ({
            id: `part-${part.id}`,
            source: part.partnerAId.toString(),
            target: part.partnerBId.toString(),
            type: "partnership",
            data: { partnership: part },
          })),
        ];

        console.log("✅ Tree data converted - Nodes:", nodes.length, "Edges:", edges.length);
        set({ nodes, edges, isLoading: false });
        get().saveToHistory();
      } catch (error) {
        console.error("❌ Failed to load tree data:", error);
        set({ 
          error: error instanceof Error ? error.message : "Unknown error",
          isLoading: false 
        });
      }
    },

    // Node management
    setNodes: (nodes) => {
      set({ nodes });
    },

    addNode: (person) => {
      const nodes = get().nodes;
      const newNode: PersonNode = {
        id: person.id.toString(),
        type: "person",
        data: { person },
        position: { x: Math.random() * 400, y: Math.random() * 400 },
      };
      
      set({ nodes: [...nodes, newNode] });
      get().saveToHistory();
    },

    updateNode: (id, personUpdate) => {
      const nodes = get().nodes;
      const updatedNodes = nodes.map((node) =>
        node.id === id
          ? {
              ...node,
              data: {
                ...node.data,
                person: { ...node.data.person, ...personUpdate },
              },
            }
          : node
      );
      
      set({ nodes: updatedNodes });
      get().saveToHistory();
    },

    removeNode: (id) => {
      const { nodes, edges } = get();
      const filteredNodes = nodes.filter((node) => node.id !== id);
      const filteredEdges = edges.filter(
        (edge) => edge.source !== id && edge.target !== id
      );
      
      set({ 
        nodes: filteredNodes, 
        edges: filteredEdges,
        selectedNodeId: get().selectedNodeId === id ? null : get().selectedNodeId,
      });
      get().saveToHistory();
    },

    // Edge management
    setEdges: (edges) => {
      set({ edges });
    },

    addEdge: (edge) => {
      const edges = get().edges;
      set({ edges: [...edges, edge] });
      get().saveToHistory();
    },

    removeEdge: (id) => {
      const edges = get().edges;
      const filteredEdges = edges.filter((edge) => edge.id !== id);
      set({ 
        edges: filteredEdges,
        selectedEdgeId: get().selectedEdgeId === id ? null : get().selectedEdgeId,
      });
      get().saveToHistory();
    },

    // Selection
    selectNode: (id) => {
      set({ selectedNodeId: id, selectedEdgeId: null });
    },

    selectEdge: (id) => {
      set({ selectedEdgeId: id, selectedNodeId: null });
    },

    // Layout
    applyAutoLayout: async () => {
      const { nodes, edges } = get();
      set({ isLoading: true });
      
      try {
        const layoutResult = await autoLayout(nodes, edges);
        set({ 
          nodes: layoutResult.nodes, 
          edges: layoutResult.edges,
          isLoading: false 
        });
        get().saveToHistory();
      } catch (error) {
        console.error("Auto layout failed:", error);
        set({ isLoading: false });
      }
    },

    // Search and filter
    setSearchFilters: (filters) => {
      set({ 
        searchFilters: { 
          ...get().searchFilters, 
          ...filters 
        }
      });
    },

    getFilteredNodes: () => {
      const { nodes, searchFilters } = get();
      
      return nodes.filter((node) => {
        const person = node.data.person;
        
        // Name filter
        if (searchFilters.name) {
          const fullName = `${person.firstName} ${person.lastName || ""}`.toLowerCase();
          const searchTerm = searchFilters.name.toLowerCase();
          if (!fullName.includes(searchTerm)) {
            return false;
          }
        }
        
        // Sex filter
        if (searchFilters.sex && searchFilters.sex !== "all" && person.sex !== searchFilters.sex) {
          return false;
        }
        
        // Living status filter
        if (searchFilters.livingStatus && searchFilters.livingStatus !== "all") {
          if (searchFilters.livingStatus === "deceased" && !person.isDeceased) {
            return false;
          }
          if (searchFilters.livingStatus === "living" && person.isDeceased) {
            return false;
          }
        }
        
        return true;
      });
    },

    // History (undo/redo)
    saveToHistory: () => {
      const { nodes, edges, history, historyIndex, maxHistorySize } = get();
      
      const newHistoryItem = {
        nodes: JSON.parse(JSON.stringify(nodes)),
        edges: JSON.parse(JSON.stringify(edges)),
        timestamp: Date.now(),
      };
      
      const newHistory = [...history.slice(0, historyIndex + 1), newHistoryItem];
      
      // Limit history size
      const limitedHistory = newHistory.slice(-maxHistorySize);
      
      set({
        history: limitedHistory,
        historyIndex: limitedHistory.length - 1,
      });
    },

    undo: () => {
      const { history, historyIndex } = get();
      
      if (historyIndex > 0) {
        const previousState = history[historyIndex - 1];
        set({
          nodes: JSON.parse(JSON.stringify(previousState.nodes)),
          edges: JSON.parse(JSON.stringify(previousState.edges)),
          historyIndex: historyIndex - 1,
        });
      }
    },

    redo: () => {
      const { history, historyIndex } = get();
      
      if (historyIndex < history.length - 1) {
        const nextState = history[historyIndex + 1];
        set({
          nodes: JSON.parse(JSON.stringify(nextState.nodes)),
          edges: JSON.parse(JSON.stringify(nextState.edges)),
          historyIndex: historyIndex + 1,
        });
      }
    },

    canUndo: () => {
      const { historyIndex } = get();
      return historyIndex > 0;
    },

    canRedo: () => {
      const { history, historyIndex } = get();
      return historyIndex < history.length - 1;
    },

    // UI state
    setLoading: (loading) => {
      set({ isLoading: loading });
    },

    setError: (error) => {
      set({ error });
    },

    // Utilities
    getPersonById: (id) => {
      const node = get().nodes.find((node) => node.id === id);
      return node ? node.data.person : null;
    },

    getNodeById: (id) => {
      return get().nodes.find((node) => node.id === id) || null;
    },

    reset: () => {
      set(initialState);
    },
  }))
);
