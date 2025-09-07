import Papa from "papaparse";
import { Person, Relationship, Partnership, Tree, ExportData, CSVData } from "@/types";
import { format } from "date-fns";

// CSV エクスポート関数
export function exportToCSV(data: CSVData): void {
  const { people, relationships, partnerships } = data;

  // People CSV
  const peopleCSV = Papa.unparse(
    people.map(person => ({
      ID: person.id,
      TreeID: person.treeId,
      FirstName: person.firstName,
      LastName: person.lastName || "",
      Sex: person.sex || "",
      BirthDate: person.birthDate || "",
      DeathDate: person.deathDate || "",
      IsDeceased: person.isDeceased ? "Yes" : "No",
      Email: person.email || "",
      Phone: person.phone || "",
      Address: person.address || "",
      City: person.city || "",
      Prefecture: person.prefecture || "",
      Country: person.country || "",
      Note: person.note || "",
      CreatedAt: format(new Date(person.createdAt), "yyyy-MM-dd HH:mm:ss"),
      UpdatedAt: format(new Date(person.updatedAt), "yyyy-MM-dd HH:mm:ss"),
    })),
    { header: true }
  );

  // Relationships CSV
  const relationshipsCSV = Papa.unparse(
    relationships.map(rel => ({
      ID: rel.id,
      TreeID: rel.treeId,
      ParentID: rel.parentId,
      ChildID: rel.childId,
      CreatedAt: format(new Date(rel.createdAt), "yyyy-MM-dd HH:mm:ss"),
    })),
    { header: true }
  );

  // Partnerships CSV
  const partnershipsCSV = Papa.unparse(
    partnerships.map(part => ({
      ID: part.id,
      TreeID: part.treeId,
      PartnerAID: part.partnerAId,
      PartnerBID: part.partnerBId,
      StartDate: part.startDate || "",
      EndDate: part.endDate || "",
      Type: part.type,
      CreatedAt: format(new Date(part.createdAt), "yyyy-MM-dd HH:mm:ss"),
    })),
    { header: true }
  );

  // Download files
  downloadFile(peopleCSV, "people.csv", "text/csv");
  downloadFile(relationshipsCSV, "relationships.csv", "text/csv");
  downloadFile(partnershipsCSV, "partnerships.csv", "text/csv");
}

// JSON エクスポート関数
export function exportToJSON(data: ExportData): void {
  const jsonString = JSON.stringify(data, null, 2);
  const timestamp = format(new Date(), "yyyy-MM-dd_HH-mm-ss");
  downloadFile(jsonString, `family-tree_${timestamp}.json`, "application/json");
}

// JSON インポート関数
export function importFromJSON(file: File): Promise<ExportData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const result = event.target?.result;
        if (typeof result !== "string") {
          throw new Error("Invalid file content");
        }
        
        const data = JSON.parse(result) as ExportData;
        
        // Validate the structure
        if (!data.tree || !Array.isArray(data.people) || 
            !Array.isArray(data.relationships) || !Array.isArray(data.partnerships)) {
          throw new Error("Invalid JSON structure");
        }
        
        resolve(data);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };
    
    reader.readAsText(file);
  });
}

// ファイルダウンロードヘルパー関数
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  window.URL.revokeObjectURL(url);
}

// データ整合性チェック関数
export function validateImportData(data: ExportData): string[] {
  const errors: string[] = [];
  
  // Check for required fields
  if (!data.tree.name) {
    errors.push("Tree name is required");
  }
  
  // Check people data
  data.people.forEach((person, index) => {
    if (!person.firstName) {
      errors.push(`Person at index ${index} is missing firstName`);
    }
    if (person.treeId !== data.tree.id) {
      errors.push(`Person at index ${index} has mismatched treeId`);
    }
  });
  
  // Check relationships
  const personIds = new Set(data.people.map(p => p.id));
  data.relationships.forEach((rel, index) => {
    if (!personIds.has(rel.parentId)) {
      errors.push(`Relationship at index ${index} references invalid parentId: ${rel.parentId}`);
    }
    if (!personIds.has(rel.childId)) {
      errors.push(`Relationship at index ${index} references invalid childId: ${rel.childId}`);
    }
  });
  
  // Check partnerships
  data.partnerships.forEach((part, index) => {
    if (!personIds.has(part.partnerAId)) {
      errors.push(`Partnership at index ${index} references invalid partnerAId: ${part.partnerAId}`);
    }
    if (!personIds.has(part.partnerBId)) {
      errors.push(`Partnership at index ${index} references invalid partnerBId: ${part.partnerBId}`);
    }
  });
  
  return errors;
}

// データ統計情報取得
export function getDataStats(data: ExportData) {
  const maleCount = data.people.filter(p => p.sex === "male").length;
  const femaleCount = data.people.filter(p => p.sex === "female").length;
  const deceasedCount = data.people.filter(p => p.isDeceased).length;
  const livingCount = data.people.length - deceasedCount;
  
  return {
    totalPeople: data.people.length,
    maleCount,
    femaleCount,
    livingCount,
    deceasedCount,
    relationshipsCount: data.relationships.length,
    partnershipsCount: data.partnerships.length,
  };
}
