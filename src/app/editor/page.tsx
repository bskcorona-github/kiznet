"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
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
import { TreePine, Home, Loader2, UserPlus, Database } from "lucide-react";
import Link from "next/link";
import { autoLayout } from "@/lib/layout";
import AddPersonDialog from "@/components/AddPersonDialog";

function EditorPageInner() {
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
    undo,
    redo,
    canUndo,
    canRedo,
    applyAutoLayout,
    resetAllPositions,
    saveAllPositions,
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
    console.log("📱 Side panel effect - selectedNodeId:", selectedNodeId, "nodes count:", nodes.length);
    if (selectedNodeId) {
      setIsSidePanelOpen(true);
    }
  }, [selectedNodeId, nodes.length]);

  // 人物削除イベントで最新データを取得
  useEffect(() => {
    const handler = async () => {
      if (treeId) {
        await loadTreeData(parseInt(treeId));
        await applyAutoLayout();
      }
    };
    
    window.addEventListener("kiznet:person-deleted", handler as any);
    window.addEventListener("kiznet:person-updated", handler as any);
    
    return () => {
      window.removeEventListener("kiznet:person-deleted", handler as any);
      window.removeEventListener("kiznet:person-updated", handler as any);
    };
  }, [treeId, loadTreeData, applyAutoLayout]);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const handleAddPerson = useCallback(() => {
    setIsAddOpen(true);
  }, []);

  const handleAutoLayout = useCallback(async () => {
    try {
      await applyAutoLayout();
    } catch (error) {
      console.error("Auto layout failed:", error);
      alert("自動レイアウトに失敗しました。");
    }
  }, [applyAutoLayout]);

  const submitAddPerson = useCallback(async (data: { firstName: string; lastName?: string; sex?: "male"|"female"|"other"|"unknown"; birthOrder?: string; birthDate?: string; }) => {
    try {
      if (!treeId) {
        alert("treeIdがありません。ホームから家系図を開き直してください。");
        return;
      }
      const res = await fetch("/api/people", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ treeId, ...data, isDeceased: false }),
      });
      if (!res.ok) throw new Error("Failed to create person");
      await loadTreeData(parseInt(treeId));
      // 最新の状態に対して自動整列（ストアの現在値を使用）
      await applyAutoLayout();
    } catch (e) {
      console.error(e);
      alert("人物の追加に失敗しました");
    }
  }, [treeId, loadTreeData, applyAutoLayout]);

  // Keyboard shortcuts
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Prevent shortcuts when typing in input fields
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      return;
    }

    if (event.ctrlKey || event.metaKey) {
      switch (event.key) {
        case 'z':
          if (event.shiftKey) {
            // Ctrl+Shift+Z: Redo
            event.preventDefault();
            if (canRedo()) {
              redo();
            }
          } else {
            // Ctrl+Z: Undo
            event.preventDefault();
            if (canUndo()) {
              undo();
            }
          }
          break;
        case 'f':
          // Ctrl+F: Fit view
          event.preventDefault();
          // TODO: Implement fit view
          break;
        case 'a':
          // Ctrl+A: Add person
          event.preventDefault();
          handleAddPerson();
          break;
        case 'l':
          // Ctrl+L: Auto layout
          event.preventDefault();
          handleAutoLayout();
          break;
        case 's':
          // Ctrl+S: Save (prevent default browser save)
          event.preventDefault();
          // TODO: Implement save
          break;
      }
    }

    if (event.key === 'Escape') {
      // Escape: Close side panel
      if (isSidePanelOpen) {
        setIsSidePanelOpen(false);
        selectNode(null);
      }
    }

    if (event.key === 'Delete' && selectedNodeId) {
      // Delete: Delete selected node
      event.preventDefault();
      // TODO: Implement delete
    }
  }, [canUndo, canRedo, undo, redo, isSidePanelOpen, selectNode, selectedNodeId, handleAddPerson, handleAutoLayout]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

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
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-white">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
          <div className="p-4 bg-blue-100 rounded-full w-fit mx-auto mb-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">家系図を読み込み中...</h2>
          <p className="text-gray-600">データを取得しています。しばらくお待ちください。</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-red-50 to-white">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md border border-red-200">
          <div className="p-4 bg-red-100 rounded-full w-fit mx-auto mb-4">
            <div className="text-red-600 text-2xl">⚠️</div>
          </div>
          <h2 className="text-lg font-semibold text-red-900 mb-2">エラーが発生しました</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="space-y-2">
            <Button 
              onClick={() => window.location.reload()} 
              className="w-full"
            >
              ページを再読み込み
            </Button>
            <Link href="/" className="block">
              <Button variant="outline" className="w-full">
                ホームに戻る
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ReactFlowProvider>
      <div className="flex flex-col h-screen">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-4">
            <Link 
              href="/" 
              className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 transition-colors duration-200 px-3 py-2 rounded-lg hover:bg-blue-50"
            >
              <Home className="h-5 w-5" />
              <span className="font-medium">ホーム</span>
            </Link>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <TreePine className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {currentTree?.name || "家系図エディター"}
                </h1>
                {currentTree?.description && (
                  <p className="text-sm text-gray-600">{currentTree.description}</p>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
              <span className="font-medium">{nodes.length}</span> 人の情報が登録されています
            </div>
          </div>
        </header>

        {/* Toolbar */}
        <Toolbar
          onAddPerson={handleAddPerson}
          onAddRelationship={() => console.log("Add relationship")}
          onAddPartnership={() => console.log("Add partnership")}
          onAutoLayout={handleAutoLayout}
          onResetPositions={resetAllPositions}
          onSavePositions={saveAllPositions}
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

        {/* Add Person Dialog */}
        <AddPersonDialog open={isAddOpen} onOpenChange={setIsAddOpen} onSubmit={submitAddPerson} />

        {/* Empty state */}
        {nodes.length === 0 && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <Card className="max-w-md pointer-events-auto shadow-xl border-2 border-dashed border-gray-300">
              <CardContent className="text-center p-8">
                <div className="p-4 bg-gray-100 rounded-full w-fit mx-auto mb-4">
                  <TreePine className="h-12 w-12 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  家系図が空です
                </h3>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  最初の人物を追加するか、サンプルデータを投入して家系図作りを始めましょう
                </p>
                <div className="space-y-3">
                  <Button onClick={handleAddPerson} className="w-full" size="lg">
                    <UserPlus className="h-4 w-4 mr-2" />
                    人物を追加
                  </Button>
                  <Button 
                    onClick={handleSeedSampleData} 
                    variant="outline" 
                    className="w-full"
                    size="lg"
                  >
                    <Database className="h-4 w-4 mr-2" />
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

export default function EditorPage() {
  return (
    <Suspense fallback={<div className="p-6">読み込み中...</div>}>
      <EditorPageInner />
    </Suspense>
  );
}
