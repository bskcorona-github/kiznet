import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { PersonNode, FamilyEdge, Person, Relationship, Partnership, Tree, SearchFilters } from "@/types";
import { autoLayout, generationLayout, elkLayeredLayout } from "@/lib/layout";

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
  setNodes: (nodes: PersonNode[] | ((prev: PersonNode[]) => PersonNode[])) => void;
  addNode: (person: Person) => void;
  updateNode: (id: string, person: Partial<Person>) => void;
  removeNode: (id: string) => void;
  
  // Edge management
  setEdges: (edges: FamilyEdge[] | ((prev: FamilyEdge[]) => FamilyEdge[])) => void;
  addEdge: (edge: FamilyEdge) => void;
  removeEdge: (id: string) => void;
  
  // Selection
  selectNode: (id: string | null) => void;
  selectEdge: (id: string | null) => void;
  
  // Layout
  applyAutoLayout: () => Promise<void>;
  applyLayeredLayout: () => Promise<void>;
  updateNodePosition: (id: string, position: { x: number; y: number }) => Promise<void>;
  resetAllPositions: () => Promise<void>;
  saveAllPositions: () => Promise<void>;
  
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
        
        // Convert to React Flow format（既存ノードの座標を保持して画面リセット感を抑制）
        const prevNodes = get().nodes || [];
        const prevPosMap = new Map(prevNodes.map(n => [n.id, n.position] as const));
        const nodes: PersonNode[] = people.map((person) => {
          // データベースに保存された位置があればそれを使用、なければ前の位置、最後にランダム位置
          let position: { x: number; y: number };
          if (person.positionX !== null && person.positionY !== null && person.positionX !== undefined && person.positionY !== undefined) {
            position = { x: person.positionX, y: person.positionY };
          } else {
            position = prevPosMap.get(person.id.toString()) || { x: Math.random() * 400, y: Math.random() * 400 };
          }
          
          return {
            id: person.id.toString(),
            type: "person" as const,
            data: { person },
            position,
          };
        });

        const edges: FamilyEdge[] = [
          ...relationships.map((rel): FamilyEdge => ({
            id: `rel-${rel.id}`,
            source: rel.parentId.toString(),
            target: rel.childId.toString(),
            type: "parent-child",
            // connect from parent's bottom center to child's top center
            sourceHandle: "child-connection",
            targetHandle: "parent-connection",
            data: { relationship: rel },
          })),
          ...partnerships.map((part): FamilyEdge => ({
            id: `part-${part.id}`,
            source: part.partnerAId.toString(),
            target: part.partnerBId.toString(),
            type: "partnership",
            // isFlipped=true のとき左右のハンドルを入れ替える
            sourceHandle: part.isFlipped ? "spouse-left-source" : "spouse-right",
            targetHandle: part.isFlipped ? "spouse-right-target" : "spouse-left",
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
      if (typeof nodes === "function") {
        const current = get().nodes;
        const next = nodes(current);
        if (!Array.isArray(next)) {
          console.warn("⚠️ setNodes(updater) returned non-array:", next);
          return;
        }
        set({ nodes: next });
        return;
      }
      if (!Array.isArray(nodes)) {
        console.warn("⚠️ setNodes received non-array:", nodes);
        return;
      }
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
      if (typeof edges === "function") {
        const current = get().edges;
        const next = edges(current);
        if (!Array.isArray(next)) {
          console.warn("⚠️ setEdges(updater) returned non-array:", next);
          return;
        }
        set({ edges: next });
        return;
      }
      if (!Array.isArray(edges)) {
        console.warn("⚠️ setEdges received non-array:", edges);
        return;
      }
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

    applyLayeredLayout: async () => {
      const { nodes, edges } = get();
      set({ isLoading: true });
      try {
        const { nodes: nn, edges: ee } = await elkLayeredLayout(nodes, edges);
        set({ nodes: nn, edges: ee, isLoading: false });
        get().saveToHistory();
      } catch (e) {
        console.error("Layered layout failed:", e);
        set({ isLoading: false });
      }
    },

    updateNodePosition: async (id, position) => {
      const { nodes } = get();
      
      // まずローカルで位置を更新
      const updatedNodes = nodes.map((node) =>
        node.id === id ? { ...node, position } : node
      );
      set({ nodes: updatedNodes });

      try {
        // サーバーに位置を保存
        const response = await fetch(`/api/people/${id}/position`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            positionX: position.x,
            positionY: position.y,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to save position");
        }

        console.log(`📍 Position saved for person ${id}: (${position.x}, ${position.y})`);
      } catch (error) {
        console.error("Failed to save position:", error);
        // エラーが発生してもUI上では位置は更新されたままにする
      }
    },

    resetAllPositions: async () => {
      const { nodes, currentTree } = get();
      if (!currentTree) return;

      set({ isLoading: true });

      try {
        // すべてのノードの位置をnullにリセット
        const resetPromises = nodes.map(async (node) => {
          const response = await fetch(`/api/people/${node.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              firstName: node.data.person.firstName, // 必須フィールド
              positionX: null,
              positionY: null,
            }),
          });

          if (!response.ok) {
            throw new Error(`Failed to reset position for person ${node.id}`);
          }
        });

        await Promise.all(resetPromises);

        // データを再読み込みして自動レイアウトを適用
        await get().loadTreeData(currentTree.id);
        await get().applyAutoLayout();

        console.log("📍 All positions reset and auto layout applied");
      } catch (error) {
        console.error("Failed to reset positions:", error);
        set({ error: "位置のリセットに失敗しました", isLoading: false });
      }
    },

    saveAllPositions: async () => {
      const { nodes } = get();
      if (!Array.isArray(nodes) || nodes.length === 0) return;

      try {
        const promises = nodes.map(async (node) => {
          const res = await fetch(`/api/people/${node.id}/position`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ positionX: node.position.x, positionY: node.position.y })
          });
          if (!res.ok) throw new Error(`Failed to save position for ${node.id}`);
        });
        await Promise.all(promises);
        console.log("💾 All node positions saved.");
      } catch (e) {
        console.error("Failed to save all positions", e);
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
          const fullName = `${person.lastName || ""} ${person.firstName}`.toLowerCase();
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
