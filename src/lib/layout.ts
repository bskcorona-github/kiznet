import { PersonNode, FamilyEdge } from "@/types";
import { Node, Edge } from "reactflow";
import { improvedFamilyTreeLayout } from "./improved-layout";

// Dynamic import for elkjs to avoid SSR issues
let elk: any = null;

// ELK を用いた階層レイアウト（高品質）
export async function elkLayeredLayout(
  nodes: PersonNode[],
  edges: FamilyEdge[]
): Promise<{ nodes: PersonNode[]; edges: FamilyEdge[] }> {
  if (!Array.isArray(nodes) || !Array.isArray(edges) || nodes.length === 0) {
    return { nodes, edges };
  }

  try {
    if (!elk) {
      // 動的読み込み（SSR回避）
      const Elk = (await import("elkjs/lib/elk.bundled.js")).default as any;
      elk = new Elk();
    }

    const elkGraph = convertToElkGraph(nodes, edges);
    const result = await elk.layout(elkGraph);
    let layoutedNodes = applyElkLayout(result, nodes);

    // ELKは交差最小化を優先するため、兄弟が離れることがある
    // 兄弟（同じ親または同じ夫婦の子）を同じ列ブロックに再整列する
    layoutedNodes = alignSiblingsAfterElk(layoutedNodes, edges);
    // 親（および夫婦）を子どもの重心に合わせて上から順に揃える
    layoutedNodes = alignAncestorsToChildrenCenters(layoutedNodes, edges);

    // エッジは既存のものをそのまま返す（描画は座標に追従）
    return { nodes: layoutedNodes, edges };
  } catch (error) {
    console.warn("ELK layered layout failed, falling back to generationLayout:", error);
    return generationLayout(nodes, edges);
  }
}

// 兄弟を同じ列ブロックに寄せる（ELK後の後処理）
function alignSiblingsAfterElk(
  nodes: PersonNode[],
  edges: FamilyEdge[]
): PersonNode[] {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const partnerships = new Map<string, string>();
  const parentChildren = new Map<string, string[]>();

  edges.forEach(e => {
    if (e.type === "partnership") {
      partnerships.set(e.source, e.target);
      partnerships.set(e.target, e.source);
    } else if (e.type === "parent-child") {
      const arr = parentChildren.get(e.source) || [];
      arr.push(e.target);
      parentChildren.set(e.source, arr);
    }
  });

  const processedChildren = new Set<string>();
  const CHILD_SPACING = 220; // カード幅(180) + 余白

  // 夫婦単位で子どもを再整列
  partnerships.forEach((partnerId, parentId) => {
    if (parseInt(parentId) > parseInt(partnerId)) return; // 重複回避

    const children = new Set<string>();
    (parentChildren.get(parentId) || []).forEach(c => children.add(c));
    (parentChildren.get(partnerId) || []).forEach(c => children.add(c));

    if (children.size === 0) return;

    const left = nodeMap.get(parentId);
    const right = nodeMap.get(partnerId);
    if (!left || !right) return;

    // 中心X（夫婦の中点）
    const centerX = (left.position.x + right.position.x) / 2;

    const childIds = Array.from(children);
    // 生年月日・続柄で安定ソート（既存関数を利用）
    const sorted = sortSiblingsByBirthAndSex(childIds, nodes as any);

    sorted.forEach((childId, idx) => {
      const child = nodeMap.get(childId);
      if (!child) return;
      const offset = (idx - (sorted.length - 1) / 2) * CHILD_SPACING;
      child.position = { x: Math.round(centerX + offset), y: child.position.y };
      processedChildren.add(childId);
    });
  });

  // 片親のみのケースも整列
  parentChildren.forEach((children, parentId) => {
    const partnerId = partnerships.get(parentId);
    if (partnerId) return; // 夫婦側で処理済み
    if (children.length === 0) return;
    const parent = nodeMap.get(parentId);
    if (!parent) return;

    const remaining = children.filter(c => !processedChildren.has(c));
    if (remaining.length === 0) return;

    const sorted = sortSiblingsByBirthAndSex(remaining, nodes as any);
    const centerX = parent.position.x;
    sorted.forEach((childId, idx) => {
      const child = nodeMap.get(childId);
      if (!child) return;
      const offset = (idx - (sorted.length - 1) / 2) * CHILD_SPACING;
      child.position = { x: Math.round(centerX + offset), y: child.position.y };
    });
  });

  return nodes.map(n => nodeMap.get(n.id) || n);
}

// 親（および夫婦）を子どもの重心に合わせて上流へ伝播する
function alignAncestorsToChildrenCenters(
  nodes: PersonNode[],
  edges: FamilyEdge[]
): PersonNode[] {
  const nodeMap = new Map(nodes.map(n => [n.id, { ...n }]));
  const parentChildren = new Map<string, string[]>();
  const childParents = new Map<string, string[]>();
  const partnerships = new Map<string, string>();

  edges.forEach(e => {
    if (e.type === "parent-child") {
      const arr = parentChildren.get(e.source) || [];
      arr.push(e.target);
      parentChildren.set(e.source, arr);
      const parr = childParents.get(e.target) || [];
      parr.push(e.source);
      childParents.set(e.target, parr);
    } else if (e.type === "partnership") {
      partnerships.set(e.source, e.target);
      partnerships.set(e.target, e.source);
    }
  });

  // 深さ（世代）計算: 親が無いノードからBFS
  const depth = new Map<string, number>();
  const roots = nodes.filter(n => !childParents.has(n.id)).map(n => n.id);
  const q: Array<{ id: string; d: number }> = roots.map(id => ({ id, d: 0 }));
  while (q.length) {
    const { id, d } = q.shift()!;
    if (depth.has(id)) continue;
    depth.set(id, d);
    (parentChildren.get(id) || []).forEach(c => q.push({ id: c, d: d + 1 }));
  }

  // 深い世代から親方向へ順に処理
  const parents = Array.from(parentChildren.keys()).sort((a, b) => (depth.get(b) ?? 0) - (depth.get(a) ?? 0));

  const COUPLE_DISTANCE = 70; // improved-layout と整合

  const processedCouple = new Set<string>();

  parents.forEach(pid => {
    const kids = (parentChildren.get(pid) || []).map(id => nodeMap.get(id)).filter(Boolean) as PersonNode[];
    if (kids.length === 0) return;
    const centerX = kids.reduce((s, c) => s + c.position.x, 0) / kids.length;

    const partnerId = partnerships.get(pid);
    const p = nodeMap.get(pid);
    if (!p) return;

    if (partnerId) {
      const key = pid < partnerId ? pid + "-" + partnerId : partnerId + "-" + pid;
      if (processedCouple.has(key)) return;
      const sp = nodeMap.get(partnerId);
      if (!sp) return;
      const half = COUPLE_DISTANCE / 2;
      // 左右どちらが左かに関わらず、中心に対して左右に配置
      p.position = { x: Math.round(centerX - half), y: p.position.y };
      sp.position = { x: Math.round(centerX + half), y: sp.position.y };
      processedCouple.add(key);
    } else {
      p.position = { x: Math.round(centerX), y: p.position.y };
    }
  });

  return nodes.map(n => nodeMap.get(n.id) || n);
}

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
        text: `${node.data.person.lastName || ""} ${node.data.person.firstName}`.trim(),
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
    console.log("🏠 Family Tree Layout - Starting with:", { nodes: nodes.length, edges: edges.length });
    
    // 配列チェックを追加
    if (!Array.isArray(nodes) || !Array.isArray(edges)) {
      console.warn("⚠️ autoLayout received non-array:", { nodes: typeof nodes, edges: typeof edges });
      return { nodes: [], edges: [] };
    }
    
    if (nodes.length === 0) {
      return { nodes, edges };
    }

    // 改善レイアウト
    const result = improvedFamilyTreeLayout(nodes, edges);
    // 兄弟を親（または夫婦）の中点に揃える後処理を常に実施
    let aligned = alignSiblingsAfterElk(result.nodes, edges);
    aligned = alignAncestorsToChildrenCenters(aligned, edges);
    return { nodes: aligned, edges: result.edges };
  } catch (error) {
    console.error("Auto layout failed:", error);
    // Fallback to generation layout
    return generationLayout(nodes, edges);
  }
}

// 家系図専用レイアウト関数（改善版）
export function familyTreeLayout(
  nodes: PersonNode[],
  edges: FamilyEdge[]
): { nodes: PersonNode[]; edges: FamilyEdge[] } {
  // 配列チェックを追加
  if (!Array.isArray(nodes) || !Array.isArray(edges)) {
    console.warn("⚠️ familyTreeLayout received non-array:", { nodes: typeof nodes, edges: typeof edges });
    return { nodes: [], edges: [] };
  }
  
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
  console.log("🌱 Root nodes found:", rootNodes.map(n => `${n.data.person.lastName || ""} ${n.data.person.firstName}`));

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

  // 理想的な家系図レイアウト計算（コンパクト版）
  const NODE_WIDTH = 200; // 実際のカード幅に合わせる
  const NODE_HEIGHT = 140; // 実際のカード高さに合わせる
  const COUPLE_SPACING = NODE_WIDTH + 30; // 夫婦間の距離を縮小（60→30）
  const FAMILY_SPACING = 280; // 家族間の距離を縮小（420→280）
  const GENERATION_HEIGHT = 200; // 世代間の垂直距離を縮小（320→200）
  const CHILD_SPACING = NODE_WIDTH + 60; // 子ども間の距離を縮小（100→60）
  const SOLO_NODE_SPACING = NODE_WIDTH + 80; // 単独ノード間の距離を縮小（160→80）
  const MARGIN_X = 120; // 左右のマージンを縮小（240→120）
  const MARGIN_Y = 80; // 上下のマージンを縮小（140→80）
  const MIN_NODE_GAP = 30; // 同一世代での最小余白を縮小（40→30）

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
    const generationStartX = MARGIN_X + Math.max(0, (1400 - MARGIN_X * 2 - generationTotalWidth) / 2); // 固定幅1400pxで中央揃え

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
          // 子どもの配置（並び順を考慮）
          const sortedChildren = sortSiblingsByBirthAndSex(family.children, nodes);
          const childIndex = sortedChildren.indexOf(node.id);
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

  // 同一世代のノードの水平重なりを解消（右方向にずらす）
  const resolveOverlaps = (inputNodes: PersonNode[]): PersonNode[] => {
    const groups = new Map<number, PersonNode[]>();
    inputNodes.forEach(n => {
      const bucket = Math.round((n.position.y - MARGIN_Y) / GENERATION_HEIGHT);
      const arr = groups.get(bucket) || [];
      arr.push(n);
      groups.set(bucket, arr);
    });

    const output: PersonNode[] = [];
    groups.forEach((arr) => {
      // x昇順で並べ替え
      const sorted = arr.slice().sort((a, b) => a.position.x - b.position.x);
      let cursorX = -Infinity;
      sorted.forEach((n) => {
        let newX = n.position.x;
        if (cursorX === -Infinity) {
          cursorX = newX + NODE_WIDTH + MIN_NODE_GAP;
        } else {
          if (newX < cursorX) {
            newX = cursorX;
          }
          cursorX = newX + NODE_WIDTH + MIN_NODE_GAP;
        }
        output.push({ ...n, position: { x: Math.round(newX), y: n.position.y } });
      });
    });

    // バケツに含まれないノード（理論上無い）も含める保険
    if (output.length !== inputNodes.length) {
      const included = new Set(output.map(n => n.id));
      inputNodes.forEach(n => {
        if (!included.has(n.id)) output.push(n);
      });
    }

    return output;
  };

  const separatedNodes = resolveOverlaps(layoutedNodes);

  // 改良されたエッジを生成
  const improvedEdges = createFamilyTreeEdges(separatedNodes, edges, partnerships, parentChildMap);

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
    outputNodes: separatedNodes.length,
    outputEdges: improvedEdges.length
  });

  return { nodes: layoutedNodes, edges: improvedEdges };
}

/**
 * 兄弟姉妹を生年月日と性別で並び順ソート
 * 男性優先、生年月日昇順
 */
function sortSiblingsByBirthAndSex(childrenIds: string[], nodes: PersonNode[]): string[] {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  
  return childrenIds.slice().sort((aId, bId) => {
    const nodeA = nodeMap.get(aId);
    const nodeB = nodeMap.get(bId);
    
    if (!nodeA || !nodeB) return 0;
    
    const personA = nodeA.data.person;
    const personB = nodeB.data.person;
    
    // 1. 続柄による並び順（長男、次男、三男、長女、次女、三女の順）
    const birthOrderA = personA.birthOrder || "";
    const birthOrderB = personB.birthOrder || "";
    
    // 続柄の優先順位を定義
    const getBirthOrderPriority = (birthOrder: string, sex: string) => {
      if (!birthOrder) return 1000; // 続柄がない場合は最後
      
      // 男性の続柄
      if (birthOrder.includes("長男")) return 1;
      if (birthOrder.includes("次男")) return 2;
      if (birthOrder.includes("三男")) return 3;
      if (birthOrder.includes("四男")) return 4;
      if (birthOrder.includes("五男")) return 5;
      if (birthOrder.match(/[六七八九十]男/)) return 6;
      
      // 女性の続柄
      if (birthOrder.includes("長女")) return 11;
      if (birthOrder.includes("次女")) return 12;
      if (birthOrder.includes("三女")) return 13;
      if (birthOrder.includes("四女")) return 14;
      if (birthOrder.includes("五女")) return 15;
      if (birthOrder.match(/[六七八九十]女/)) return 16;
      
      // その他の続柄
      if (sex === "male") return 100; // 男性だが続柄不明
      if (sex === "female") return 200; // 女性だが続柄不明
      return 300; // 性別・続柄ともに不明
    };
    
    const priorityA = getBirthOrderPriority(birthOrderA, personA.sex || "");
    const priorityB = getBirthOrderPriority(birthOrderB, personB.sex || "");
    
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    
    // 2. 続柄が同じ場合は生年月日による並び順
    const birthA = personA.birthDate ? new Date(personA.birthDate) : null;
    const birthB = personB.birthDate ? new Date(personB.birthDate) : null;
    
    // 生年月日が両方ある場合
    if (birthA && birthB) {
      return birthA.getTime() - birthB.getTime();
    }
    
    // 生年月日がある方を先に
    if (birthA && !birthB) return -1;
    if (!birthA && birthB) return 1;
    
    // 両方とも生年月日がない場合は名前順
    const fullNameA = `${personA.lastName || ""} ${personA.firstName}`.trim();
    const fullNameB = `${personB.lastName || ""} ${personB.firstName}`.trim();
    
    return fullNameA.localeCompare(fullNameB, 'ja');
  });
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

  // パートナーシップエッジを追加（そのまま描画に使用）
  originalEdges.forEach(edge => {
    if (edge.type === "partnership") {
      const { style, ...rest } = edge as any;
      improvedEdges.push({
        ...(rest as any),
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
  // 配列チェックを追加
  if (!Array.isArray(nodes) || !Array.isArray(edges)) {
    console.warn("⚠️ generationLayout received non-array:", { nodes: typeof nodes, edges: typeof edges });
    return { nodes: [], edges: [] };
  }
  
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
