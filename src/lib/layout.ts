import { PersonNode, FamilyEdge } from "@/types";
import { Node, Edge } from "reactflow";

// Dynamic import for elkjs to avoid SSR issues
let elk: any = null;

// React FlowのノードとエッジをELK形式に変換
function convertToElkGraph(nodes: PersonNode[], edges: FamilyEdge[]) {
  const elkNodes = nodes.map((node) => ({
    id: node.id,
    width: 180,
    height: 80,
    // ラベルを追加（人物名）
    labels: [
      {
        id: `${node.id}-label`,
        text: `${node.data.person.firstName} ${node.data.person.lastName || ""}`.trim(),
        width: 160,
        height: 20,
      },
    ],
  }));

  const elkEdges = edges.map((edge) => ({
    id: edge.id,
    sources: [edge.source],
    targets: [edge.target],
  }));

  return {
    id: "root",
    layoutOptions: {
      // layeredアルゴリズムを使用（階層レイアウト）
      "elk.algorithm": "layered",
      // ノード配置戦略
      "elk.layered.nodePlacement.strategy": "BRANDES_KOEPF",
      // レイアウト方向（上から下）
      "elk.direction": "DOWN",
      // ノード間の間隔
      "elk.spacing.nodeNode": "60",
      // レイヤー間の間隔
      "elk.layered.spacing.nodeNodeBetweenLayers": "80",
      // エッジの間隔
      "elk.spacing.edgeEdge": "10",
      // エッジとノードの間隔
      "elk.spacing.edgeNode": "20",
      // パディング
      "elk.padding": "[top=50,left=50,bottom=50,right=50]",
      // サイクル分解を有効にする
      "elk.layered.cycleBreaking.strategy": "GREEDY",
      // クロスミニマイゼーション
      "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
    },
    children: elkNodes,
    edges: elkEdges,
  };
}

// ELKレイアウト結果をReact Flowノードに適用
function applyElkLayout(
  elkGraph: any,
  originalNodes: PersonNode[]
): PersonNode[] {
  if (!elkGraph.children) return originalNodes;

  const nodeMap = new Map(originalNodes.map((node) => [node.id, node]));

  return elkGraph.children.map((elkNode: any) => {
    const originalNode = nodeMap.get(elkNode.id);
    if (!originalNode) {
      throw new Error(`Node ${elkNode.id} not found in original nodes`);
    }

    return {
      ...originalNode,
      position: {
        x: elkNode.x ?? originalNode.position.x,
        y: elkNode.y ?? originalNode.position.y,
      },
    };
  });
}

// 自動レイアウト実行関数
export async function autoLayout(
  nodes: PersonNode[],
  edges: FamilyEdge[]
): Promise<{ nodes: PersonNode[]; edges: FamilyEdge[] }> {
  try {
    if (nodes.length === 0) {
      return { nodes, edges };
    }

    // 家系図専用のレイアウトを使用
    return familyTreeLayout(nodes, edges);
  } catch (error) {
    console.error("Auto layout failed:", error);
    // Fallback to generation layout
    return generationLayout(nodes, edges);
  }
}

// 家系図専用レイアウト関数
export function familyTreeLayout(
  nodes: PersonNode[],
  edges: FamilyEdge[]
): { nodes: PersonNode[]; edges: FamilyEdge[] } {
  if (nodes.length === 0) return { nodes, edges };

  console.log("🏠 Family Tree Layout - Starting with:", {
    nodes: nodes.length,
    edges: edges.length
  });

  // パートナーシップと親子関係を分析
  const partnerships = new Map<string, string>(); // nodeId -> partnerId
  const parentChildMap = new Map<string, string[]>(); // parentId -> childIds[]
  const childParentMap = new Map<string, string[]>(); // childId -> parentIds[]

  // エッジを分析
  edges.forEach((edge) => {
    if (edge.type === "partnership") {
      partnerships.set(edge.source, edge.target);
      partnerships.set(edge.target, edge.source);
    } else if (edge.type === "parent-child") {
      const children = parentChildMap.get(edge.source) || [];
      children.push(edge.target);
      parentChildMap.set(edge.source, children);

      const parents = childParentMap.get(edge.target) || [];
      parents.push(edge.source);
      childParentMap.set(edge.target, parents);
    }
  });

  // 改善された家族単位の特定
  interface FamilyUnit {
    parents: string[];
    children: string[];
    generation: number;
    id: string; // 家族の一意識別子
  }

  const familyUnits: FamilyUnit[] = [];
  const processedNodes = new Set<string>();
  let familyIdCounter = 0;

  // Step 1: 夫婦ペアから家族単位を作成
  partnerships.forEach((partnerId, nodeId) => {
    if (processedNodes.has(nodeId) || processedNodes.has(partnerId)) return;

    const parents = [nodeId, partnerId].sort(); // 安定したソート
    const childrenSet = new Set<string>();

    // 両親の子どもを収集（共通の子どもを特定）
    const parent1Children = parentChildMap.get(parents[0]) || [];
    const parent2Children = parentChildMap.get(parents[1]) || [];
    
    // 共通の子どもを追加
    parent1Children.forEach(child => {
      if (parent2Children.includes(child)) {
        childrenSet.add(child);
      }
    });
    
    // 単独の子どももチェック（シングルペアレントから結婚した場合など）
    parent1Children.forEach(child => childrenSet.add(child));
    parent2Children.forEach(child => childrenSet.add(child));

    familyUnits.push({
      id: `family-${familyIdCounter++}`,
      parents,
      children: Array.from(childrenSet),
      generation: 0, // 後で設定
    });

    parents.forEach(p => processedNodes.add(p));
  });

  // Step 2: 単身の親も家族単位として追加
  nodes.forEach(node => {
    if (processedNodes.has(node.id)) return;
    
    const children = parentChildMap.get(node.id) || [];
    if (children.length > 0) {
      familyUnits.push({
        id: `family-${familyIdCounter++}`,
        parents: [node.id],
        children,
        generation: 0,
      });
      processedNodes.add(node.id);
      
      // 子どもも処理済みにマーク（他の家族に重複して含まれないように）
      children.forEach(child => processedNodes.add(child));
    }
  });

  // Step 3: 残りの子ども（親がない、または親が他の家族に属している）の処理
  nodes.forEach(node => {
    if (processedNodes.has(node.id)) return;
    
    // 子どもであるが、まだ家族に属していないノード
    const parentIds = childParentMap.get(node.id);
    if (parentIds && parentIds.length > 0) {
      // 親が既存の家族に属している場合はスキップ
      const parentInExistingFamily = parentIds.some(parentId => 
        familyUnits.some(family => family.parents.includes(parentId))
      );
      
      if (!parentInExistingFamily) {
        // 孤立した子どもの場合、単独ノードとして処理
        processedNodes.add(node.id);
      }
    }
  });

  console.log("👨‍👩‍👧‍👦 Families created:", familyUnits.map(f => ({
    id: f.id,
    parents: f.parents.length,
    children: f.children.length
  })));

  // 改善された世代計算
  const nodeGenerations = new Map<string, number>();
  const processedFamilies = new Set<number>();

  // ルートノード（親がいないノード）から開始
  const rootNodes = nodes.filter(node => !childParentMap.has(node.id));
  console.log("🌱 Root nodes found:", rootNodes.map(n => `${n.data.person.firstName} ${n.data.person.lastName}`));

  // ルートノードを世代0に設定
  rootNodes.forEach(node => {
    nodeGenerations.set(node.id, 0);
  });

  // BFSで世代を段階的に計算
  let currentGeneration = 0;
  let hasChanges = true;

  while (hasChanges && currentGeneration < 10) { // 無限ループ防止
    hasChanges = false;
    
    // 現在の世代に属する全ての家族を処理
    familyUnits.forEach((family, familyIndex) => {
      if (processedFamilies.has(familyIndex)) return;
      
      // 親の世代が全て確定している場合のみ処理
      const parentGenerations = family.parents
        .map(id => nodeGenerations.get(id))
        .filter(gen => gen !== undefined);
      
      if (parentGenerations.length === family.parents.length) {
        // 親の最大世代を取得
        const maxParentGeneration = Math.max(...parentGenerations, -1);
        
        // 親の世代を設定（既に設定済みでない場合）
        family.parents.forEach(parentId => {
          if (!nodeGenerations.has(parentId)) {
            nodeGenerations.set(parentId, maxParentGeneration + 1);
          }
        });
        
        // 子どもの世代を設定
        const childGeneration = maxParentGeneration + 2;
        family.children.forEach(childId => {
          const existingGen = nodeGenerations.get(childId);
          if (existingGen === undefined || existingGen > childGeneration) {
            nodeGenerations.set(childId, childGeneration);
            hasChanges = true;
          }
        });
        
        // 家族の世代を設定
        family.generation = maxParentGeneration + 1;
        processedFamilies.add(familyIndex);
        hasChanges = true;
      }
    });
    
    currentGeneration++;
  }

  // 未処理のノードに対する fallback 処理
  nodes.forEach(node => {
    if (!nodeGenerations.has(node.id)) {
      // 子どもであれば、その親の世代+1に設定
      const parentIds = childParentMap.get(node.id);
      if (parentIds) {
        const parentGens = parentIds
          .map(pid => nodeGenerations.get(pid))
          .filter(gen => gen !== undefined);
        
        if (parentGens.length > 0) {
          nodeGenerations.set(node.id, Math.max(...parentGens) + 1);
        } else {
          nodeGenerations.set(node.id, 1);
        }
      } else {
        // 親でも子どもでもない場合は世代0
        nodeGenerations.set(node.id, 0);
      }
    }
  });

  // 世代ごとにノードをグループ化
  const generationGroups = new Map<number, string[]>();
  nodeGenerations.forEach((generation, nodeId) => {
    const group = generationGroups.get(generation) || [];
    group.push(nodeId);
    generationGroups.set(generation, group);
  });

  // 理想的な家系図レイアウト計算
  const NODE_WIDTH = 180;
  const NODE_HEIGHT = 120;
  const COUPLE_SPACING = NODE_WIDTH + 40; // 夫婦間の距離を適度に調整
  const FAMILY_SPACING = 350; // 家族間の距離を最適化
  const GENERATION_HEIGHT = 280; // 世代間をさらに広げる
  const CHILD_SPACING = NODE_WIDTH + 60; // 子ども間の距離を調整
  const SOLO_NODE_SPACING = NODE_WIDTH + 120; // 単独ノード間の距離
  const MARGIN_X = 200; // 左右のマージンを広げる
  const MARGIN_Y = 120; // 上下のマージンを広げる

  // 世代ごとの家族を整理（改善版）
  const familyByGeneration = new Map<number, FamilyUnit[]>();
  familyUnits.forEach(family => {
    const gen = family.generation;
    const families = familyByGeneration.get(gen) || [];
    families.push(family);
    familyByGeneration.set(gen, families);
  });

  // 理想的な家族配置計算
  interface FamilyLayout {
    family: FamilyUnit;
    centerX: number;
    width: number;
    parentsStartX: number;
    childrenStartX: number;
  }

  const familyLayouts = new Map<FamilyUnit, FamilyLayout>();

  // 世代順に処理（0から順番に）
  const sortedGenerations = Array.from(familyByGeneration.keys()).sort((a, b) => a - b);
  
  sortedGenerations.forEach(generation => {
    const families = familyByGeneration.get(generation) || [];
    
    // 世代内の家族を中央揃えで配置
    const totalFamiliesWidth = families.reduce((total, family) => {
      const parentsCount = family.parents.length;
      const childrenCount = family.children.length;
      
      const parentsWidth = parentsCount > 1 ? 
        (parentsCount - 1) * COUPLE_SPACING + NODE_WIDTH : 
        NODE_WIDTH;
      
      const childrenWidth = childrenCount > 0 ? 
        Math.max(childrenCount - 1, 0) * CHILD_SPACING + NODE_WIDTH : 
        0;

      const familyWidth = Math.max(parentsWidth, childrenWidth, NODE_WIDTH);
      return total + familyWidth;
    }, 0);
    
    const totalSpacing = (families.length - 1) * FAMILY_SPACING;
    const generationTotalWidth = totalFamiliesWidth + totalSpacing;
    const generationStartX = MARGIN_X + (1200 - MARGIN_X * 2 - generationTotalWidth) / 2; // 固定幅1200pxで中央揃え

    let currentX = generationStartX;

    families.forEach((family, familyIndex) => {
      // 家族の必要幅を正確に計算
      const parentsCount = family.parents.length;
      const childrenCount = family.children.length;
      
      const parentsWidth = parentsCount > 1 ? 
        (parentsCount - 1) * COUPLE_SPACING + NODE_WIDTH : 
        NODE_WIDTH;
      
      const childrenWidth = childrenCount > 0 ? 
        Math.max(childrenCount - 1, 0) * CHILD_SPACING + NODE_WIDTH : 
        0;

      // 家族全体の幅は親と子どものうち広い方
      const familyTotalWidth = Math.max(parentsWidth, childrenWidth, NODE_WIDTH);
      
      // 家族の中心X座標を設定
      const familyCenterX = currentX + familyTotalWidth / 2;
      
      // 親の開始X座標（中央揃え）
      const parentsStartX = familyCenterX - parentsWidth / 2;
      
      // 子どもの開始X座標（中央揃え）  
      const childrenStartX = familyCenterX - childrenWidth / 2;

      familyLayouts.set(family, {
        family,
        centerX: familyCenterX,
        width: familyTotalWidth,
        parentsStartX,
        childrenStartX
      });

      // 次の家族の開始位置を更新
      currentX += familyTotalWidth + FAMILY_SPACING;
    });
  });

  // ノード配置の最終計算
  const layoutedNodes = nodes.map(node => {
    const generation = nodeGenerations.get(node.id) ?? 0;
    let x = MARGIN_X;
    let y = generation * GENERATION_HEIGHT + MARGIN_Y;

    // 家族単位での配置
    const family = familyUnits.find(f => 
      f.parents.includes(node.id) || f.children.includes(node.id)
    );

    if (family) {
      const layout = familyLayouts.get(family);
      
      if (layout) {
        if (family.parents.includes(node.id)) {
          // 親の配置
          const parentIndex = family.parents.indexOf(node.id);
          x = layout.parentsStartX + parentIndex * COUPLE_SPACING;
        } else if (family.children.includes(node.id)) {
          // 子どもの配置  
          const childIndex = family.children.indexOf(node.id);
          x = layout.childrenStartX + childIndex * CHILD_SPACING;
        }
      } else {
        // Fallback
        x = MARGIN_X + familyUnits.indexOf(family) * FAMILY_SPACING;
      }
    } else {
      // 単独ノード（家族に属さないノード）の配置
      const generationGroup = generationGroups.get(generation) || [];
      const soloNodes = generationGroup.filter(nodeId => {
        return !familyUnits.some(f => 
          f.parents.includes(nodeId) || f.children.includes(nodeId)
        );
      });
      
      const soloIndex = soloNodes.indexOf(node.id);
      if (soloIndex >= 0) {
        // 世代内の家族の右側に、適切な間隔で配置
        const familiesInGeneration = familyByGeneration.get(generation) || [];
        let maxFamilyEndX = MARGIN_X;
        
        familiesInGeneration.forEach(family => {
          const layout = familyLayouts.get(family);
          if (layout) {
            maxFamilyEndX = Math.max(maxFamilyEndX, layout.centerX + layout.width / 2);
          }
        });
        
        // 単独ノードを家族の右側に配置（より自然な間隔）
        x = maxFamilyEndX + FAMILY_SPACING + soloIndex * SOLO_NODE_SPACING;
      }
    }

    return {
      ...node,
      position: { x: Math.round(x), y: Math.round(y) },
    };
  });

  // 改良されたエッジを生成
  const improvedEdges = createFamilyTreeEdges(layoutedNodes, edges, partnerships, parentChildMap);

  console.log("🏠 Family Tree Layout - Completed:", {
    partnerships: partnerships.size,
    families: familyUnits.length,
    generations: Array.from(familyByGeneration.keys()).sort(),
    familyDetails: Array.from(familyByGeneration.entries()).map(([gen, families]) => ({
      generation: gen,
      count: families.length,
      families: families.map(f => ({
        parents: f.parents.length,
        children: f.children.length
      }))
    })),
    outputNodes: layoutedNodes.length,
    outputEdges: improvedEdges.length
  });

  return { nodes: layoutedNodes, edges: improvedEdges };
}

// 改善された家系図用エッジ生成
function createFamilyTreeEdges(
  nodes: PersonNode[],
  originalEdges: FamilyEdge[],
  partnerships: Map<string, string>,
  parentChildMap: Map<string, string[]>
): FamilyEdge[] {
  const nodeMap = new Map(nodes.map(node => [node.id, node]));
  const improvedEdges: FamilyEdge[] = [];
  const processedChildren = new Set<string>();

  console.log("🔗 Creating improved edges...", {
    originalEdges: originalEdges.length,
    partnerships: partnerships.size,
    parentChildRelations: parentChildMap.size
  });

  // パートナーシップエッジを追加（表示用）
  originalEdges.forEach(edge => {
    if (edge.type === "partnership") {
      improvedEdges.push({
        ...edge,
        style: { stroke: "transparent" } // 非表示（FamilyEdgeで描画するため）
      });
    }
  });

  // 親子関係エッジを生成（重複を避けて）
  parentChildMap.forEach((children, parentId) => {
    const partnerId = partnerships.get(parentId);
    
    children.forEach(childId => {
      // 既に処理済みの子どもはスキップ
      if (processedChildren.has(childId)) return;
      
      const parentNode = nodeMap.get(parentId);
      const childNode = nodeMap.get(childId);
      if (!parentNode || !childNode) return;

      let sourceId = parentId;
      let edgeId = `parent-child-${parentId}-${childId}`;

      if (partnerId) {
        // 夫婦の場合：IDが小さい方を主要な親として設定
        if (parseInt(parentId) < parseInt(partnerId)) {
          sourceId = parentId;
          edgeId = `family-${parentId}-${partnerId}-to-${childId}`;
        } else {
          // IDが大きい方の親からのエッジは作成しない（重複防止）
          return;
        }
      }

      improvedEdges.push({
        id: edgeId,
        source: sourceId,
        target: childId,
        type: "parent-child",
        data: { 
          relationship: { 
            id: parseInt(childId),
            parentId: parseInt(parentId),
            partnerId: partnerId ? parseInt(partnerId) : null
          } 
        } as any
      });

      processedChildren.add(childId);
    });
  });

  console.log("✨ Final edges created:", {
    partnerships: improvedEdges.filter(e => e.type === "partnership").length,
    parentChild: improvedEdges.filter(e => e.type === "parent-child").length,
    total: improvedEdges.length
  });

  return improvedEdges;
}

// 世代に基づく手動レイアウト（フォールバック）
export function generationLayout(
  nodes: PersonNode[],
  edges: FamilyEdge[]
): { nodes: PersonNode[]; edges: FamilyEdge[] } {
  if (nodes.length === 0) return { nodes, edges };

  // 親子関係から世代を計算
  const generations = new Map<string, number>();
  const childrenMap = new Map<string, string[]>();
  
  // 親子関係をマップ化
  edges.forEach((edge) => {
    if (edge.type === "parent-child" || !edge.type) {
      const children = childrenMap.get(edge.source) || [];
      children.push(edge.target);
      childrenMap.set(edge.source, children);
    }
  });

  // ルートノード（親がいないノード）を特定
  const hasParent = new Set<string>();
  edges.forEach((edge) => {
    if (edge.type === "parent-child" || !edge.type) {
      hasParent.add(edge.target);
    }
  });

  const rootNodes = nodes.filter((node) => !hasParent.has(node.id));

  // BFSで世代を計算
  const queue: Array<{ nodeId: string; generation: number }> = rootNodes.map(
    (node) => ({ nodeId: node.id, generation: 0 })
  );

  while (queue.length > 0) {
    const { nodeId, generation } = queue.shift()!;
    
    if (!generations.has(nodeId)) {
      generations.set(nodeId, generation);
      
      const children = childrenMap.get(nodeId) || [];
      children.forEach((childId) => {
        queue.push({ nodeId: childId, generation: generation + 1 });
      });
    }
  }

  // 世代に基づいてノードを配置
  const generationGroups = new Map<number, string[]>();
  generations.forEach((generation, nodeId) => {
    const group = generationGroups.get(generation) || [];
    group.push(nodeId);
    generationGroups.set(generation, group);
  });

  const layoutedNodes = nodes.map((node) => {
    const generation = generations.get(node.id) ?? 0;
    const group = generationGroups.get(generation) || [];
    const indexInGeneration = group.indexOf(node.id);

    return {
      ...node,
      position: {
        x: indexInGeneration * 220 + 100,
        y: generation * 120 + 100,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}
