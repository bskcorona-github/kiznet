"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { ReactFlowProvider } from "reactflow";
import TreeCanvas from "@/components/TreeCanvas";
import Toolbar from "@/components/Toolbar";
import SidePanel from "@/components/SidePanel";
import { useFamilyTreeStore } from "@/stores/family-tree-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
// SearchPanel と ExportImportDialog は後で復元
// import SearchPanel from "@/components/SearchPanel";
// import ExportImportDialog from "@/components/ExportImportDialog";
import { TreePine, Home, Loader2 } from "lucide-react";
import Link from "next/link";
import { autoLayout } from "@/lib/layout";

export default function EditorPage() {
  const searchParams = useSearchParams();
  const treeId = searchParams?.get("treeId");
  const isDemo = searchParams?.get("demo") === "true";

  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  
  const {
    currentTree,
    nodes,
    edges,
    isLoading,
    error,
    selectedNodeId,
    loadTreeData,
    setCurrentTree,
    setNodes,
    selectNode,
  } = useFamilyTreeStore();

  // Load tree data
  useEffect(() => {
    if (treeId && !isDemo) {
      const numericTreeId = parseInt(treeId);
      if (!isNaN(numericTreeId)) {
        loadTreeData(numericTreeId);
        // Also load tree metadata
        fetch(`/api/trees/${numericTreeId}`)
          .then(res => res.json())
          .then(tree => setCurrentTree(tree))
          .catch(console.error);
      }
    } else if (isDemo) {
      // Load demo data
      setCurrentTree({
        id: 0,
        name: "サンプル家系図",
        description: "デモ用のサンプルデータ",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      // TODO: Load sample data
    }
  }, [treeId, isDemo, loadTreeData, setCurrentTree]);

  // Open side panel when node is selected
  useEffect(() => {
    if (selectedNodeId) {
      setIsSidePanelOpen(true);
    }
  }, [selectedNodeId]);

  const handleAddPerson = () => {
    // TODO: Implement add person dialog
    console.log("Add person");
  };

  const handleAutoLayout = async () => {
    try {
      const { nodes: layoutedNodes } = await autoLayout(nodes, edges);
      setNodes(layoutedNodes);
    } catch (error) {
      console.error("Auto layout failed:", error);
      alert("自動レイアウトに失敗しました。");
    }
  };

  const handleSeedSampleData = async () => {
    if (!treeId) return;
    
    const confirmed = confirm("サンプルデータを投入しますか？\n\n3世代のサンプル家族（13人）が追加されます。");
    if (!confirmed) return;

    try {
      const response = await fetch("/api/sample-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ treeId }),
      });

      if (!response.ok) {
        throw new Error("Failed to seed sample data");
      }

      // Reload data and then auto-layout
      await loadTreeData(parseInt(treeId));
      
      // Debug log current state
      setTimeout(() => {
        console.log("📊 After sample data load:", {
          nodes: nodes.length,
          edges: edges.length
        });
      }, 100);
      
      alert("サンプルデータが投入されました！ツールバーの「自動整列」ボタンでレイアウトを整えてください。");
    } catch (error) {
      console.error("Failed to seed sample data:", error);
      alert("サンプルデータの投入に失敗しました。");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>家系図を読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
          <div className="text-red-500 text-xl mb-4">エラーが発生しました</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link href="/" className="text-blue-600 hover:underline">
            ホームに戻る
          </Link>
        </div>
      </div>
    );
  }

  return (
    <ReactFlowProvider>
      <div className="flex flex-col h-screen">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/" className="flex items-center space-x-2 text-blue-600 hover:text-blue-700">
              <Home className="h-5 w-5" />
              <span>ホーム</span>
            </Link>
            <div className="flex items-center space-x-2">
              <TreePine className="h-6 w-6 text-green-600" />
              <h1 className="text-xl font-semibold">
                {currentTree?.name || "家系図エディター"}
              </h1>
            </div>
          </div>
          <div className="text-sm text-gray-600">
            {nodes.length} 人の情報が登録されています
          </div>
        </header>

        {/* Toolbar */}
        <Toolbar
          onAddPerson={handleAddPerson}
          onAddRelationship={() => console.log("Add relationship")}
          onAddPartnership={() => console.log("Add partnership")}
          onAutoLayout={handleAutoLayout}
          onImportData={() => console.log("Import data")}
          onExportData={() => console.log("Export data")}
          onPrint={() => console.log("Print")}
          onSeedSampleData={handleSeedSampleData}
          onToggleSearch={() => console.log("Toggle search")}
        />

        {/* Main content */}
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 relative">
            <TreeCanvas />
          </div>
          
          {isSidePanelOpen && (
            <SidePanel
              isOpen={isSidePanelOpen}
              onClose={() => {
                setIsSidePanelOpen(false);
                selectNode(null);
              }}
            />
          )}
        </div>

        {/* Empty state */}
        {nodes.length === 0 && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <Card className="max-w-md pointer-events-auto">
              <CardContent className="text-center p-8">
                <TreePine className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  家系図が空です
                </h3>
                <p className="text-gray-600 mb-4">
                  最初の人物を追加するか、サンプルデータを投入して家系図作りを始めましょう
                </p>
                <div className="space-y-2">
                  <Button onClick={handleAddPerson}>
                    人物を追加
                  </Button>
                  <Button onClick={handleSeedSampleData} variant="outline">
                    サンプルデータを投入
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </ReactFlowProvider>
  );
}
