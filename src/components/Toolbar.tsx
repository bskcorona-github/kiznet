"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  UserPlus,
  Users,
  Heart,
  LayoutGrid,
  ZoomIn,
  ZoomOut,
  Maximize,
  Undo,
  Redo,
  Download,
  Upload,
  Printer,
  Database,
  Search,
  RotateCcw,
} from "lucide-react";
import { useFamilyTreeStore } from "@/stores/family-tree-store";
import { useReactFlow } from "reactflow";

interface ToolbarProps {
  onAddPerson: () => void;
  onAddRelationship: () => void;
  onAddPartnership: () => void;
  onAutoLayout: () => void;
  onResetPositions?: () => void;
  onSavePositions?: () => void;
  onImportData: () => void;
  onExportData: () => void;
  onPrint: () => void;
  onSeedSampleData: () => void;
  onToggleSearch: () => void;
}

const Toolbar: React.FC<ToolbarProps> = ({
  onAddPerson,
  onAddRelationship,
  onAddPartnership,
  onAutoLayout,
  onResetPositions,
  onSavePositions,
  onImportData,
  onExportData,
  onPrint,
  onSeedSampleData,
  onToggleSearch,
}) => {
  const {
    selectedNodeId,
    isLoading,
    canUndo,
    canRedo,
    undo,
    redo,
    applyAutoLayout,
    applyLayeredLayout,
    nodesLocked,
    setNodesLocked,
  } = useFamilyTreeStore();

  const { zoomIn, zoomOut, fitView } = useReactFlow();

  const handleAutoLayout = async () => {
    await applyAutoLayout();
  };

  const handleZoomIn = () => {
    zoomIn({ duration: 200 });
  };

  const handleZoomOut = () => {
    zoomOut({ duration: 200 });
  };

  const handleFitView = () => {
    fitView({ padding: 0.1, duration: 200 });
  };

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {/* Person Actions */}
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              onClick={onAddPerson}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <UserPlus className="h-4 w-4" />
              <span>人物追加</span>
            </Button>
          </div>

          <Separator orientation="vertical" className="h-6" />

          {/* Relationship Actions */}
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="outline"
              onClick={onAddRelationship}
              disabled={!selectedNodeId}
              className="flex items-center space-x-2"
            >
              <Users className="h-4 w-4" />
              <span>親子関係</span>
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={onAddPartnership}
              disabled={!selectedNodeId}
              className="flex items-center space-x-2"
            >
              <Heart className="h-4 w-4" />
              <span>配偶者関係</span>
            </Button>
          </div>

          <Separator orientation="vertical" className="h-6" />

          {/* Layout Actions */}
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="outline"
              onClick={onAutoLayout}
              disabled={isLoading}
              className="flex items-center space-x-2 bg-green-50 hover:bg-green-100 border-green-200 text-green-700"
            >
              <LayoutGrid className="h-4 w-4" />
              <span>自動整列</span>
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={applyLayeredLayout}
              disabled={isLoading}
              className="flex items-center space-x-2"
              title="階層（上→下）レイアウト"
            >
              <LayoutGrid className="h-4 w-4" />
              <span>階層整列</span>
            </Button>

            <Button
              size="sm"
              variant={nodesLocked ? "default" : "outline"}
              onClick={() => setNodesLocked(!nodesLocked)}
              className="flex items-center space-x-2"
              title={nodesLocked ? "ノードロック解除" : "ノードをロック（ドラッグ不可）"}
            >
              <span>{nodesLocked ? "ロック中" : "ロック"}</span>
            </Button>

            {onResetPositions && (
              <Button
                size="sm"
                variant="outline"
                onClick={onResetPositions}
                disabled={isLoading}
                className="flex items-center space-x-2 bg-orange-50 hover:bg-orange-100 border-orange-200 text-orange-700"
                title="手動で移動した位置をリセットして自動整列を適用"
              >
                <RotateCcw className="h-4 w-4" />
                <span>位置リセット</span>
              </Button>
            )}

            {onSavePositions && (
              <Button
                size="sm"
                variant="outline"
                onClick={onSavePositions}
                disabled={isLoading}
                className="flex items-center space-x-2 bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
                title="現在のノード位置をすべて保存"
              >
                <Download className="h-4 w-4" />
                <span>位置保存</span>
              </Button>
            )}
          </div>

          <Separator orientation="vertical" className="h-6" />

          {/* View Controls */}
          <div className="flex items-center space-x-1 bg-gray-50 rounded-lg p-1">
            <Button size="sm" variant="ghost" onClick={handleZoomIn} className="h-8 w-8 p-0">
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={handleZoomOut} className="h-8 w-8 p-0">
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={handleFitView} className="h-8 w-8 p-0">
              <Maximize className="h-4 w-4" />
            </Button>
          </div>

          <Separator orientation="vertical" className="h-6" />

          {/* History Actions */}
          <div className="flex items-center space-x-1 bg-gray-50 rounded-lg p-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={undo}
              disabled={!canUndo()}
              className="h-8 w-8 p-0"
              title="元に戻す (Ctrl+Z)"
            >
              <Undo className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={redo}
              disabled={!canRedo()}
              className="h-8 w-8 p-0"
              title="やり直し (Ctrl+Shift+Z)"
            >
              <Redo className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Search Toggle */}
          <Button size="sm" variant="ghost" onClick={onToggleSearch} className="h-8 w-8 p-0">
            <Search className="h-4 w-4" />
          </Button>

          <Separator orientation="vertical" className="h-6" />

          {/* Data Actions */}
          <div className="flex items-center space-x-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={onImportData}
              className="flex items-center space-x-2"
            >
              <Upload className="h-4 w-4" />
              <span>インポート</span>
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={onExportData}
              className="flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>エクスポート</span>
            </Button>
          </div>

          <Separator orientation="vertical" className="h-6" />

          {/* Utility Actions */}
          <div className="flex items-center space-x-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={onPrint}
              className="flex items-center space-x-2"
            >
              <Printer className="h-4 w-4" />
              <span>印刷</span>
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={onSeedSampleData}
              className="flex items-center space-x-2 bg-purple-50 hover:bg-purple-100 text-purple-700"
            >
              <Database className="h-4 w-4" />
              <span>サンプル</span>
            </Button>
          </div>
        </div>
      </div>

      {selectedNodeId && (
        <div className="mt-3 text-sm text-gray-600 bg-blue-50 px-3 py-2 rounded-lg">
          <span className="font-medium">選択中:</span> ID {selectedNodeId}
        </div>
      )}
    </div>
  );
};

export default Toolbar;
