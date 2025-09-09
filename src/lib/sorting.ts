import { PersonNode } from "@/types";

// 兄弟姉妹を生年月日と性別・続柄で並び替える（男性優先→生年月日昇順→姓名）
export function sortSiblingsByBirthAndSex(childrenIds: string[], nodes: PersonNode[]): string[] {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  return childrenIds.slice().sort((aId, bId) => {
    const nodeA = nodeMap.get(aId);
    const nodeB = nodeMap.get(bId);
    if (!nodeA || !nodeB) return 0;
    const personA = nodeA.data.person;
    const personB = nodeB.data.person;

    const birthOrderA = personA.birthOrder || "";
    const birthOrderB = personB.birthOrder || "";

    const getBirthOrderPriority = (birthOrder: string, sex: string) => {
      if (!birthOrder) return 1000;
      if (birthOrder.includes("長男")) return 1;
      if (birthOrder.includes("次男")) return 2;
      if (birthOrder.includes("三男")) return 3;
      if (birthOrder.includes("四男")) return 4;
      if (birthOrder.includes("五男")) return 5;
      if (birthOrder.match(/[六七八九十]男/)) return 6;
      if (birthOrder.includes("長女")) return 11;
      if (birthOrder.includes("次女")) return 12;
      if (birthOrder.includes("三女")) return 13;
      if (birthOrder.includes("四女")) return 14;
      if (birthOrder.includes("五女")) return 15;
      if (birthOrder.match(/[六七八九十]女/)) return 16;
      if (sex === "male") return 100;
      if (sex === "female") return 200;
      return 300;
    };

    const priorityA = getBirthOrderPriority(birthOrderA, personA.sex || "");
    const priorityB = getBirthOrderPriority(birthOrderB, personB.sex || "");
    if (priorityA !== priorityB) return priorityA - priorityB;

    const birthA = personA.birthDate ? new Date(personA.birthDate) : null;
    const birthB = personB.birthDate ? new Date(personB.birthDate) : null;
    if (birthA && birthB) return birthA.getTime() - birthB.getTime();
    if (birthA && !birthB) return -1;
    if (!birthA && birthB) return 1;

    const fullNameA = `${personA.lastName || ""} ${personA.firstName}`.trim();
    const fullNameB = `${personB.lastName || ""} ${personB.firstName}`.trim();
    return fullNameA.localeCompare(fullNameB, 'ja');
  });
}


