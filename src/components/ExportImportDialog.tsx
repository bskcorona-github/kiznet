"use client";

import React, { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useFamilyTreeStore } from "@/stores/family-tree-store";
import { exportToCSV, exportToJSON, importFromJSON, validateImportData, getDataStats } from "@/lib/export-import";
import { ExportData, Person, Relationship, Partnership } from "@/types";
import { Download, Upload, FileText, Database, AlertCircle, CheckCircle, FileX } from "lucide-react";

interface ExportImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "export" | "import";
}

const ExportImportDialog: React.FC<ExportImportDialogProps> = ({ isOpen, onClose, mode }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [importStatus, setImportStatus] = useState<"idle" | "success" | "error">("idle");
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importStats, setImportStats] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    currentTree,
    nodes,
    edges,
    loadTreeData,
    setCurrentTree,
  } = useFamilyTreeStore();

  const handleExportCSV = async () => {
    if (!currentTree) return;

    setIsProcessing(true);
    try {
      // Fetch current data from API
      const [peopleRes, relationshipsRes, partnershipsRes] = await Promise.all([
        fetch(`/api/people?treeId=${currentTree.id}`),
        fetch(`/api/relationships?treeId=${currentTree.id}`),
        fetch(`/api/partnerships?treeId=${currentTree.id}`),
      ]);

      const [people, relationships, partnerships]: [Person[], Relationship[], Partnership[]] = 
        await Promise.all([
          peopleRes.json(),
          relationshipsRes.json(),
          partnershipsRes.json(),
        ]);

      exportToCSV({ people, relationships, partnerships });
    } catch (error) {
      console.error("Export failed:", error);
      alert("エクスポートに失敗しました。");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportJSON = async () => {
    if (!currentTree) return;

    setIsProcessing(true);
    try {
      // Fetch current data from API
      const [peopleRes, relationshipsRes, partnershipsRes] = await Promise.all([
        fetch(`/api/people?treeId=${currentTree.id}`),
        fetch(`/api/relationships?treeId=${currentTree.id}`),
        fetch(`/api/partnerships?treeId=${currentTree.id}`),
      ]);

      const [people, relationships, partnerships]: [Person[], Relationship[], Partnership[]] = 
        await Promise.all([
          peopleRes.json(),
          relationshipsRes.json(),
          partnershipsRes.json(),
        ]);

      const exportData: ExportData = {
        tree: currentTree,
        people,
        relationships,
        partnerships,
        exportedAt: new Date().toISOString(),
      };

      exportToJSON(exportData);
    } catch (error) {
      console.error("Export failed:", error);
      alert("エクスポートに失敗しました。");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImportJSON = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setImportStatus("idle");
    setImportErrors([]);
    setImportStats(null);

    try {
      // Parse JSON file
      const importData = await importFromJSON(file);
      
      // Validate data
      const errors = validateImportData(importData);
      if (errors.length > 0) {
        setImportErrors(errors);
        setImportStatus("error");
        return;
      }

      // Get stats
      const stats = getDataStats(importData);
      setImportStats(stats);

      // Confirm import
      const confirmed = confirm(
        `以下のデータをインポートしますか？\n\n` +
        `・人物: ${stats.totalPeople}人\n` +
        `・親子関係: ${stats.relationshipsCount}件\n` +
        `・配偶者関係: ${stats.partnershipsCount}件\n\n` +
        `※既存のデータは上書きされます。`
      );

      if (!confirmed) {
        setImportStatus("idle");
        return;
      }

      // Create/update tree
      let treeId: number;
      if (currentTree?.id) {
        // Update existing tree
        const treeResponse = await fetch(`/api/trees/${currentTree.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: importData.tree.name,
            description: importData.tree.description,
          }),
        });
        
        if (!treeResponse.ok) {
          throw new Error("Failed to update tree");
        }
        
        treeId = currentTree.id;
      } else {
        // Create new tree
        const treeResponse = await fetch("/api/trees", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: importData.tree.name,
            description: importData.tree.description,
          }),
        });
        
        if (!treeResponse.ok) {
          throw new Error("Failed to create tree");
        }
        
        const newTree = await treeResponse.json();
        treeId = newTree.id;
        setCurrentTree(newTree);
      }

      // Import people
      for (const person of importData.people) {
        const { id, treeId: _, createdAt, updatedAt, ...personData } = person;
        await fetch("/api/people", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...personData, treeId }),
        });
      }

      // Import relationships
      for (const relationship of importData.relationships) {
        const { id, createdAt, ...relData } = relationship;
        await fetch("/api/relationships", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...relData, treeId }),
        });
      }

      // Import partnerships
      for (const partnership of importData.partnerships) {
        const { id, createdAt, ...partData } = partnership;
        await fetch("/api/partnerships", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...partData, treeId }),
        });
      }

      // Reload tree data
      await loadTreeData(treeId);

      setImportStatus("success");
    } catch (error) {
      console.error("Import failed:", error);
      setImportErrors([error instanceof Error ? error.message : "インポートに失敗しました"]);
      setImportStatus("error");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            {mode === "export" ? (
              <>
                <Download className="h-5 w-5" />
                <span>データエクスポート</span>
              </>
            ) : (
              <>
                <Upload className="h-5 w-5" />
                <span>データインポート</span>
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {mode === "export" ? (
            <>
              {/* Export Options */}
              <div className="grid md:grid-cols-2 gap-4">
                <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center">
                      <FileText className="h-4 w-4 mr-2" />
                      CSV エクスポート
                    </CardTitle>
                    <CardDescription className="text-xs">
                      人物、関係、配偶者の情報を3つのCSVファイルで出力
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      onClick={handleExportCSV}
                      disabled={isProcessing || !currentTree}
                      className="w-full"
                      variant="outline"
                    >
                      {isProcessing ? "エクスポート中..." : "CSV ダウンロード"}
                    </Button>
                    <p className="text-xs text-gray-500 mt-2">
                      Excel等の表計算ソフトで開けます
                    </p>
                  </CardContent>
                </Card>

                <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center">
                      <Database className="h-4 w-4 mr-2" />
                      JSON エクスポート
                    </CardTitle>
                    <CardDescription className="text-xs">
                      家系図全体のデータを1つのJSONファイルで出力
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      onClick={handleExportJSON}
                      disabled={isProcessing || !currentTree}
                      className="w-full"
                      variant="outline"
                    >
                      {isProcessing ? "エクスポート中..." : "JSON ダウンロード"}
                    </Button>
                    <p className="text-xs text-gray-500 mt-2">
                      バックアップやデータ移行に最適
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Export Info */}
              {currentTree && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>{currentTree.name}</strong> のデータをエクスポートします。
                    <br />
                    現在 <strong>{nodes.length}</strong> 人の情報が登録されています。
                  </AlertDescription>
                </Alert>
              )}
            </>
          ) : (
            <>
              {/* Import Options */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center">
                    <Database className="h-4 w-4 mr-2" />
                    JSON インポート
                  </CardTitle>
                  <CardDescription className="text-xs">
                    JSONエクスポートで作成されたファイルから家系図データを復元
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <input
                      type="file"
                      accept=".json"
                      ref={fileInputRef}
                      className="w-full p-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                  
                  <Button
                    onClick={handleImportJSON}
                    disabled={isProcessing}
                    className="w-full"
                  >
                    {isProcessing ? "インポート中..." : "JSON ファイルをインポート"}
                  </Button>
                </CardContent>
              </Card>

              {/* Import Status */}
              {importStatus === "success" && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    インポートが完了しました！
                    {importStats && (
                      <div className="mt-2 text-xs">
                        <strong>インポートされたデータ:</strong>
                        <br />
                        ・人物: {importStats.totalPeople}人
                        <br />
                        ・親子関係: {importStats.relationshipsCount}件
                        <br />
                        ・配偶者関係: {importStats.partnershipsCount}件
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {importStatus === "error" && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>インポートに失敗しました</strong>
                    {importErrors.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs mb-1">エラーの詳細:</p>
                        <ul className="text-xs space-y-1">
                          {importErrors.map((error, index) => (
                            <li key={index} className="flex items-start space-x-1">
                              <FileX className="h-3 w-3 mt-0.5 flex-shrink-0" />
                              <span>{error}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {/* Import Warning */}
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  <strong>注意:</strong> インポートを実行すると、現在の家系図データは上書きされます。
                  事前にエクスポートでバックアップを取ることをお勧めします。
                </AlertDescription>
              </Alert>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExportImportDialog;
