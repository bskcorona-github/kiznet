import { PersonNode, FamilyEdge } from "@/types";

/**
 * 改善された家系図レイアウトアルゴリズム
 * 
 * 主な改善点：
 * 1. Force-directed layoutの要素を取り入れた物理シミュレーション
 * 2. より効率的な衝突検知・回避システム
 * 3. エッジ交差の最小化
 * 4. 動的なノード配置調整
 */

interface LayoutConfig {
  nodeWidth: number;
  nodeHeight: number;
  minDistance: number;
  generationHeight: number;
  coupleDistance: number;
  familySpacing: number;
  iterations: number;
  dampening: number;
}

const DEFAULT_CONFIG: LayoutConfig = {
  nodeWidth: 160,         // 新しいカードサイズに合わせる（200→160）
  nodeHeight: 80,         // 新しいカードサイズに合わせる（140→80）
  minDistance: 40,        // ノード間の最小距離をさらに縮小（60→40）
  generationHeight: 160,  // 世代間の高さをさらに縮小（200→160）
  coupleDistance: 70,     // 配偶者間の距離（適度な間隔に調整）
  familySpacing: 220,     // 家族間の距離をさらに縮小（280→220）
  iterations: 100,
  dampening: 0.9
};

interface ForceVector {
  x: number;
  y: number;
}

interface NodePosition {
  id: string;
  x: number;
  y: number;
  vx: number; // velocity x
  vy: number; // velocity y
  generation: number;
  fixed?: boolean; // 固定ノード（移動しない）
}

/**
 * 改善されたForce-directedレイアウト
 * 家系図特有の制約を考慮した物理シミュレーション
 */
export function improvedFamilyTreeLayout(
  nodes: PersonNode[],
  edges: FamilyEdge[],
  config: Partial<LayoutConfig> = {}
): { nodes: PersonNode[]; edges: FamilyEdge[] } {
  
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  if (nodes.length === 0) return { nodes, edges };

  console.log("🚀 Starting improved family tree layout...");

  // 1. 関係性を分析
  const relationships = analyzeRelationships(edges);
  
  // 2. 世代を計算
  const generations = calculateGenerations(nodes, relationships);
  
  // 3. 初期配置を設定
  const positions = initializePositions(nodes, generations, finalConfig, relationships);
  
  // 4. Force-directed simulation
  const finalPositions = runSimulation(positions, relationships, finalConfig);
  
  // 5. 最終調整
  const adjustedPositions = finalAdjustments(finalPositions, finalConfig, relationships);
  
  // 6. ノードに位置を適用
  const layoutedNodes = applyPositionsToNodes(nodes, adjustedPositions);
  
  // 7. エッジを最適化
  const optimizedEdges = optimizeEdges(layoutedNodes, edges, relationships);
  
  console.log("✨ Improved layout completed");
  
  return { nodes: layoutedNodes, edges: optimizedEdges };
}

/**
 * 関係性分析
 */
function analyzeRelationships(edges: FamilyEdge[]) {
  const partnerships = new Map<string, string>();
  const parentChildren = new Map<string, string[]>();
  const childParents = new Map<string, string[]>();
  
  edges.forEach(edge => {
    if (edge.type === "partnership") {
      console.log("🤝 Partnership found:", edge.source, "↔", edge.target);
      partnerships.set(edge.source, edge.target);
      partnerships.set(edge.target, edge.source);
    } else if (edge.type === "parent-child") {
      // 親→子
      const children = parentChildren.get(edge.source) || [];
      children.push(edge.target);
      parentChildren.set(edge.source, children);
      
      // 子→親
      const parents = childParents.get(edge.target) || [];
      parents.push(edge.source);
      childParents.set(edge.target, parents);
    }
  });
  
  return { partnerships, parentChildren, childParents };
}

/**
 * 世代計算（改善版）
 */
function calculateGenerations(
  nodes: PersonNode[],
  relationships: ReturnType<typeof analyzeRelationships>
): Map<string, number> {
  
  const generations = new Map<string, number>();
  const { childParents } = relationships;
  
  // ルートノードを特定
  const rootNodes = nodes.filter(node => !childParents.has(node.id));
  
  // BFSで世代を計算
  const queue: Array<{ nodeId: string; generation: number }> = [];
  rootNodes.forEach(node => {
    generations.set(node.id, 0);
    queue.push({ nodeId: node.id, generation: 0 });
  });
  
  while (queue.length > 0) {
    const { nodeId, generation } = queue.shift()!;
    
    const children = relationships.parentChildren.get(nodeId) || [];
    children.forEach(childId => {
      const currentGen = generations.get(childId);
      const newGen = generation + 1;
      
      if (currentGen === undefined || currentGen > newGen) {
        generations.set(childId, newGen);
        queue.push({ nodeId: childId, generation: newGen });
      }
    });
  }
  
  // 配偶者は同じ世代に配置する
  // ルール: 片方未定義→相手に合わせる / 両方定義→より深い方（max）に合わせる
  for (let i = 0; i < 6; i++) { // 収束させるため複数回
    let changed = false;
    relationships.partnerships.forEach((spouseId, personId) => {
      const personGen = generations.get(personId);
      const spouseGen = generations.get(spouseId);
      console.log(`🔄 Spouse generation check (round ${i+1}): ${personId} (gen ${personGen}) ↔ ${spouseId} (gen ${spouseGen})`);
      
      if (personGen !== undefined && spouseGen === undefined) {
        generations.set(spouseId, personGen);
        console.log(`🔧 Adjusting generations: ${spouseId} → generation ${personGen}`);
        changed = true;
      } else if (personGen === undefined && spouseGen !== undefined) {
        generations.set(personId, spouseGen);
        console.log(`🔧 Adjusting generations: ${personId} → generation ${spouseGen}`);
        changed = true;
      } else if (personGen !== undefined && spouseGen !== undefined && personGen !== spouseGen) {
        const targetGen = Math.max(personGen, spouseGen); // 深い方に合わせる
        generations.set(personId, targetGen);
        generations.set(spouseId, targetGen);
        console.log(`🔧 Adjusting generations: ${personId} & ${spouseId} → generation ${targetGen}`);
        changed = true;
      }
    });
    if (!changed) break;
  }
  
  return generations;
}

/**
 * 初期配置設定
 */
function initializePositions(
  nodes: PersonNode[],
  generations: Map<string, number>,
  config: LayoutConfig,
  relationships: ReturnType<typeof analyzeRelationships>
): NodePosition[] {
  
  // ノードマップを作成
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  
  // 世代ごとにグループ化し、兄弟姉妹の並び順を適用
  const generationGroups = new Map<number, string[]>();
  generations.forEach((gen, nodeId) => {
    const group = generationGroups.get(gen) || [];
    group.push(nodeId);
    generationGroups.set(gen, group);
  });
  
  const positions: NodePosition[] = [];
  
  generationGroups.forEach((nodeIds, generation) => {
    console.log(`👥 Generation ${generation} nodes:`, nodeIds);
    console.log(`🤝 Available partnerships:`, Array.from(relationships.partnerships.entries()));
    
    // 配偶者ペアを特定
    const processedNodes = new Set<string>();
    let couples: Array<string[]> = [];
    const singles: string[] = [];
    
    nodeIds.forEach(nodeId => {
      if (processedNodes.has(nodeId)) return;
      const spouseId = relationships.partnerships.get(nodeId);
      const inSameGen = spouseId ? nodeIds.includes(spouseId) : false;
      console.log(`🔍 Checking node ${nodeId}, spouse: ${spouseId}, in generation: ${inSameGen}`);
      
      // 既に配偶者側が処理済みなら、重複カップルを作らない
      if (spouseId && inSameGen && !processedNodes.has(spouseId)) {
        // ノードが存在するか最終チェック
        if (nodeMap.has(nodeId) && nodeMap.has(spouseId)) {
          console.log(`💑 Couple found: ${nodeId} ↔ ${spouseId}`);
          couples.push([nodeId, spouseId]);
          processedNodes.add(nodeId);
          processedNodes.add(spouseId);
          return;
        }
      }
      // それ以外は単身として扱う
      console.log(`👤 Single: ${nodeId}`);
      singles.push(nodeId);
      processedNodes.add(nodeId);
    });
    
    // 配偶者ペアと単身者をソート
    couples = couples
      .filter(([a, b]) => nodeMap.has(a) && nodeMap.has(b))
      .map(([a, b]) => {
        const nodeA = nodeMap.get(a)!;
        const nodeB = nodeMap.get(b)!;
        // 男性を左に
        if (nodeA.data.person.sex === "male" && nodeB.data.person.sex === "female") return [a, b] as [string, string];
        if (nodeA.data.person.sex === "female" && nodeB.data.person.sex === "male") return [b, a] as [string, string];
        // 性別情報が無い場合はIDで安定ソート
        return [a, b].sort((x, y) => parseInt(x) - parseInt(y)) as [string, string];
      });
    
    const sortedSingles = sortSiblings(singles, nodeMap);
    
    console.log(`💑 Couples in generation ${generation}:`, couples.length);
    console.log(`👤 Singles in generation ${generation}:`, singles.length);
    
    const y = generation * config.generationHeight + 100;
    let currentX = 100;
    
    // 配偶者ペアを配置
    couples.forEach(couple => {
      const [person1, person2] = couple;
      console.log(`💑 Placing couple: ${person1} at (${currentX}, ${y}), ${person2} at (${currentX + config.coupleDistance}, ${y})`);
      
      positions.push({
        id: person1,
        x: currentX,
        y: y,
        vx: 0,
        vy: 0,
        generation: generation
      });
      
      positions.push({
        id: person2,
        x: currentX + config.coupleDistance,
        y: y,
        vx: 0,
        vy: 0,
        generation: generation
      });
      
      currentX += config.coupleDistance + config.nodeWidth + config.familySpacing;
    });
    
    // 単身者を配置
    sortedSingles.forEach(nodeId => {
      positions.push({
        id: nodeId,
        x: currentX,
        y: y,
        vx: 0,
        vy: 0,
        generation: generation
      });
      
      currentX += config.nodeWidth + config.minDistance;
    });
  });
  
  return positions;
}

/**
 * 兄弟姉妹の並び順ソート
 * 男性優先、生年月日昇順
 */
function sortSiblings(nodeIds: string[], nodeMap: Map<string, PersonNode>): string[] {
  return nodeIds.slice().sort((aId, bId) => {
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

/**
 * Force-directed シミュレーション
 */
function runSimulation(
  positions: NodePosition[],
  relationships: ReturnType<typeof analyzeRelationships>,
  config: LayoutConfig
): NodePosition[] {
  
  const positionMap = new Map(positions.map(p => [p.id, p]));
  
  for (let iteration = 0; iteration < config.iterations; iteration++) {
    const forces = new Map<string, ForceVector>();
    
    // 初期化
    positions.forEach(pos => {
      forces.set(pos.id, { x: 0, y: 0 });
    });
    
    // 1. 反発力（ノード同士が離れようとする力）
    applyRepulsionForce(positions, forces, config);
    
    // 2. 引力（関係のあるノードが近づこうとする力）
    applyAttractionForce(positions, relationships, forces, config);
    
    // 3. 世代制約力（同世代は水平に並ぼうとする力）
    applyGenerationConstraint(positions, forces, config);

    // 4. 家族の重心合わせ（親・配偶者・子のまとまりを維持）
    applyFamilyCenteringConstraint(positions, relationships, forces, config);
    
    // 5. 力を適用して位置を更新
    positions.forEach(pos => {
      if (pos.fixed) return;
      
      const force = forces.get(pos.id)!;
      
      // 速度を更新
      pos.vx = (pos.vx + force.x) * config.dampening;
      pos.vy = (pos.vy + force.y) * config.dampening;
      
      // 位置を更新
      pos.x += pos.vx;
      pos.y += pos.vy;
      
      // 境界制約
      pos.x = Math.max(50, Math.min(1150, pos.x));
      pos.y = Math.max(50, pos.y);
    });
    
    // 6. 配偶者制約力（最後に適用して位置を確定）
    applySpouseConstraint(positions, relationships, forces, config);
    
    // 収束判定
    const totalEnergy = positions.reduce((sum, pos) => {
      return sum + Math.abs(pos.vx) + Math.abs(pos.vy);
    }, 0);
    
    if (totalEnergy < 0.1) {
      console.log(`🎯 Converged at iteration ${iteration}`);
      break;
    }
  }
  
  return positions;
}

/**
 * 反発力の適用
 */
function applyRepulsionForce(
  positions: NodePosition[],
  forces: Map<string, ForceVector>,
  config: LayoutConfig
) {
  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      const pos1 = positions[i];
      const pos2 = positions[j];
      
      const dx = pos1.x - pos2.x;
      const dy = pos1.y - pos2.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < config.minDistance * 2) {
        const force = (config.minDistance * 2 - distance) / distance * 0.1;
        const fx = dx * force;
        const fy = dy * force;
        
        const force1 = forces.get(pos1.id)!;
        const force2 = forces.get(pos2.id)!;
        
        force1.x += fx;
        force1.y += fy;
        force2.x -= fx;
        force2.y -= fy;
      }
    }
  }
}

/**
 * 引力の適用（親子関係）
 */
function applyAttractionForce(
  positions: NodePosition[],
  relationships: ReturnType<typeof analyzeRelationships>,
  forces: Map<string, ForceVector>,
  config: LayoutConfig
) {
  const positionMap = new Map(positions.map(p => [p.id, p]));
  
  relationships.parentChildren.forEach((children, parentId) => {
    const parentPos = positionMap.get(parentId);
    if (!parentPos) return;
    
    children.forEach(childId => {
      const childPos = positionMap.get(childId);
      if (!childPos) return;
      
      const dx = childPos.x - parentPos.x;
      const dy = childPos.y - parentPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const idealDistance = config.generationHeight;
      
      if (Math.abs(distance - idealDistance) > 50) {
        const force = (distance - idealDistance) * 0.01;
        const fx = (dx / distance) * force;
        const fy = (dy / distance) * force;
        
        const parentForce = forces.get(parentId)!;
        const childForce = forces.get(childId)!;
        
        parentForce.x += fx * 0.5;
        parentForce.y += fy * 0.5;
        childForce.x -= fx * 0.5;
        childForce.y -= fy * 0.5;
      }
    });
  });
}

/**
 * 世代制約力の適用
 */
function applyGenerationConstraint(
  positions: NodePosition[],
  forces: Map<string, ForceVector>,
  config: LayoutConfig
) {
  const generationGroups = new Map<number, NodePosition[]>();
  
  positions.forEach(pos => {
    const group = generationGroups.get(pos.generation) || [];
    group.push(pos);
    generationGroups.set(pos.generation, group);
  });
  
  generationGroups.forEach(group => {
    if (group.length <= 1) return;
    
    const avgY = group.reduce((sum, pos) => sum + pos.y, 0) / group.length;
    
    group.forEach(pos => {
      const force = forces.get(pos.id)!;
      force.y += (avgY - pos.y) * 0.05;
    });
  });
}

/**
 * 家族の重心合わせ
 * - 親（配偶者がいればその中点）を子どもたちのX重心に寄せる
 * - 子どもは親の中点の下に寄せる
 */
function applyFamilyCenteringConstraint(
  positions: NodePosition[],
  relationships: ReturnType<typeof analyzeRelationships>,
  forces: Map<string, ForceVector>,
  config: LayoutConfig
) {
  const positionMap = new Map(positions.map(p => [p.id, p]));
  const processedParents = new Set<string>();

  relationships.parentChildren.forEach((children, parentId) => {
    const partnerId = relationships.partnerships.get(parentId);
    // 同じ夫婦を二重に処理しない
    const coupleKey = partnerId && parentId < partnerId ? `${parentId}-${partnerId}` : `${partnerId}-${parentId}`;
    if (partnerId && processedParents.has(coupleKey)) return;

    const parentPos = positionMap.get(parentId);
    if (!parentPos) return;

    const partnerPos = partnerId ? positionMap.get(partnerId) : undefined;
    if (partnerId) processedParents.add(coupleKey);

    const familyChildren = children
      .map(id => positionMap.get(id))
      .filter((p): p is NodePosition => !!p);
    if (familyChildren.length === 0) return;

    // 子どものXの重心
    const childrenCenterX = familyChildren.reduce((s, c) => s + c.x, 0) / familyChildren.length;

    // 親（夫婦）の中点X
    const parentsCenterX = partnerPos ? (parentPos.x + partnerPos.x) / 2 : parentPos.x;

    // 親側を子の重心に寄せる（弱め）
    const parentShift = (childrenCenterX - parentsCenterX) * 0.02;
    const parentForce = forces.get(parentId)!;
    parentForce.x += parentShift;
    if (partnerPos) {
      const partnerForce = forces.get(partnerId!)!;
      partnerForce.x += parentShift;
    }

    // 子ども側を親の中点の下に寄せる（弱め）
    familyChildren.forEach(child => {
      const childForce = forces.get(child.id)!;
      childForce.x += (parentsCenterX - child.x) * 0.02;
    });
  });
}

/**
 * 配偶者制約力の適用
 */
function applySpouseConstraint(
  positions: NodePosition[],
  relationships: ReturnType<typeof analyzeRelationships>,
  forces: Map<string, ForceVector>,
  config: LayoutConfig
) {
  const positionMap = new Map(positions.map(p => [p.id, p]));
  
  relationships.partnerships.forEach((spouseId, personId) => {
    if (personId > spouseId) return; // 重複処理を避ける
    
    const pos1 = positionMap.get(personId);
    const pos2 = positionMap.get(spouseId);
    
    if (!pos1 || !pos2) return;
    
    console.log(`💑 Applying spouse constraint: ${personId} (${pos1.x}, ${pos1.y}) ↔ ${spouseId} (${pos2.x}, ${pos2.y})`);
    
    // 配偶者は同じY座標（世代）に配置する（強制的に同じ高さに）
    const targetY = Math.round((pos1.y + pos2.y) / 2);
    
    // Y座標を強制的に同じにする
    pos1.y = targetY;
    pos2.y = targetY;
    
    // 速度と力を完全にリセットして配偶者の動きを固定
    pos1.vy = 0;
    pos2.vy = 0;
    
    // 配偶者の力をリセット（他の力に影響されないようにする）
    const force1 = forces.get(personId)!;
    const force2 = forces.get(spouseId)!;
    force1.y = 0; // Y方向の力を完全に無効化
    force2.y = 0;
    
    // X座標の調整（適切な距離を保つ）
    const dx = pos2.x - pos1.x;
    const distance = Math.abs(dx);
    const idealDistance = config.coupleDistance;
    
    if (Math.abs(distance - idealDistance) > 5) { // より厳密に
      // X座標も強制的に調整
      const centerX = (pos1.x + pos2.x) / 2;
      const halfDistance = idealDistance / 2;
      
      if (pos1.x < pos2.x) {
        pos1.x = centerX - halfDistance;
        pos2.x = centerX + halfDistance;
      } else {
        pos1.x = centerX + halfDistance;
        pos2.x = centerX - halfDistance;
      }
      
      // X方向の速度もリセット
      pos1.vx = 0;
      pos2.vx = 0;
      force1.x = 0;
      force2.x = 0;
    }
    
    console.log(`💑 After constraint: ${personId} (${pos1.x}, ${pos1.y}) ↔ ${spouseId} (${pos2.x}, ${pos2.y})`);
  });
}

/**
 * 最終調整
 */
function finalAdjustments(
  positions: NodePosition[],
  config: LayoutConfig,
  relationships: ReturnType<typeof analyzeRelationships>
): NodePosition[] {
  
  // 世代ごとの水平整列
  const generationGroups = new Map<number, NodePosition[]>();
  positions.forEach(pos => {
    const group = generationGroups.get(pos.generation) || [];
    group.push(pos);
    generationGroups.set(pos.generation, group);
  });
  
  generationGroups.forEach((group, generation) => {
    // Y座標を世代に基づいて正規化（よりコンパクトに）
    const targetY = generation * config.generationHeight + 80;
    group.forEach(pos => {
      pos.y = targetY;
    });
    
    // 家族ブロック単位での整列
    const positionMap = new Map(group.map(p => [p.id, p]));
    const used = new Set<string>();
    const familyBlocks: { members: NodePosition[]; left: number; right: number }[] = [];

    // 親（または夫婦）と、その子どもを一つのブロックとしてまとめる
    relationships.parentChildren.forEach((children, parentId) => {
      const parent = positionMap.get(parentId);
      if (!parent) return;
      const partnerId = relationships.partnerships.get(parentId);
      const partner = partnerId ? positionMap.get(partnerId) : undefined;

      const members: NodePosition[] = [parent];
      if (partner) members.push(partner);
      children.forEach(cid => {
        const child = positionMap.get(cid);
        if (child) members.push(child);
      });

      // 同じ世代に1人以上いるときだけブロック化
      if (members.some(m => m.generation === generation)) {
        members.forEach(m => used.add(m.id));
        const left = Math.min(...members.map(m => m.x));
        const right = Math.max(...members.map(m => m.x + config.nodeWidth));
        familyBlocks.push({ members, left, right });
      }
    });

    // どのブロックにも属さない単体ノード
    group.forEach(pos => {
      if (!used.has(pos.id)) {
        familyBlocks.push({ members: [pos], left: pos.x, right: pos.x + config.nodeWidth });
      }
    });

    // 左端でソートして、ブロック間の間隔を一定にして横詰め
    familyBlocks.sort((a, b) => a.left - b.left);
    let cursor = 80;
    familyBlocks.forEach(block => {
      const blockWidth = block.right - block.left;
      const delta = cursor - block.left;
      block.members.forEach(m => {
        m.x += delta;
      });
      cursor += blockWidth + config.minDistance;
    });

    // 最後に同一世代内のカードの重なりを解消（水平の衝突解消）
    // 同一世代で x の距離がカード幅+余白未満なら、左右に押し広げる
    const maxIterations = 10;
    for (let iter = 0; iter < maxIterations; iter++) {
      let resolvedAny = false;
      // 位置で安定した結果にするため、xでソート
      group.sort((a, b) => a.x - b.x);
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          const a = group[i];
          const b = group[j];
          // 同一世代のみ対象
          if (a.generation !== b.generation) continue;
          const requiredGap = config.nodeWidth + config.minDistance;
          const dx = b.x - a.x;
          if (dx < requiredGap) {
            const push = (requiredGap - dx) / 2;
            a.x -= push;
            b.x += push;
            // 境界制約を適用
            a.x = Math.max(50, Math.min(1150, a.x));
            b.x = Math.max(50, Math.min(1150, b.x));
            resolvedAny = true;
          } else {
            // これ以降は十分離れている
            break;
          }
        }
      }
      if (!resolvedAny) break;
    }
  });
  
  return positions;
}

/**
 * ノードに位置を適用
 */
function applyPositionsToNodes(
  nodes: PersonNode[],
  positions: NodePosition[]
): PersonNode[] {
  
  const positionMap = new Map(positions.map(p => [p.id, p]));
  
  return nodes.map(node => {
    const pos = positionMap.get(node.id);
    if (!pos) return node;
    
    return {
      ...node,
      position: {
        x: Math.round(pos.x),
        y: Math.round(pos.y)
      }
    };
  });
}

/**
 * エッジの最適化
 * 複数の子どもを持つ親の場合、共通の分岐点から線を分ける
 */
function optimizeEdges(
  nodes: PersonNode[],
  edges: FamilyEdge[],
  relationships: ReturnType<typeof analyzeRelationships>
): FamilyEdge[] {
  
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const optimizedEdges: FamilyEdge[] = [];
  
  // 配偶者関係のエッジはそのまま追加
  edges.forEach(edge => {
    if (edge.type === "partnership") {
      optimizedEdges.push({
        ...edge,
        style: {
          ...edge.style,
          strokeWidth: 3,
        }
      });
    }
  });
  
  // 親子関係のエッジを最適化
  relationships.parentChildren.forEach((children, parentId) => {
    if (children.length === 0) return;
    
    const parentNode = nodeMap.get(parentId);
    if (!parentNode) return;
    
    // 配偶者がいるかチェック
    const partnerId = relationships.partnerships.get(parentId);
    const hasPartner = partnerId && nodeMap.has(partnerId);
    
    // 各子どもへのエッジを作成
    children.forEach(childId => {
      const childNode = nodeMap.get(childId);
      if (!childNode) return;
      
      // 重複チェック（配偶者がいる場合はIDの小さい方のみ）
      if (hasPartner && parseInt(parentId) > parseInt(partnerId)) {
        return;
      }
      
      optimizedEdges.push({
        id: `parent-child-${parentId}-${childId}`,
        source: parentId,
        target: childId,
        type: "parent-child" as const,
        data: {
          relationship: {
            id: parseInt(childId),
            parentId: parseInt(parentId),
            partnerId: hasPartner ? parseInt(partnerId) : null
          }
        }
      });
    });
  });
  
  return optimizedEdges;
}
