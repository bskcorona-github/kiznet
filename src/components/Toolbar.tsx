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
} from "lucide-react";
import { useFamilyTreeStore } from "@/stores/family-tree-store";
import { useReactFlow } from "reactflow";

interface ToolbarProps {
  onAddPerson: () => void;
  onAddRelationship: () => void;
  onAddPartnership: () => void;
  onAutoLayout: () => void;
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
    <div className="bg-white border-b border-gray-200 px-4 py-2">
      <div className="flex items-center space-x-2">
        {/* Person Actions */}
        <Button
          size="sm"
          variant="outline"
          onClick={onAddPerson}
          className="flex items-center space-x-2"
        >
          <UserPlus className="h-4 w-4" />
          <span>人物追加</span>
        </Button>

        <Separator orientation="vertical" className="h-6" />

        {/* Relationship Actions */}
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

        <Separator orientation="vertical" className="h-6" />

        {/* Layout Actions */}
        <Button
          size="sm"
          variant="outline"
          onClick={onAutoLayout}
          disabled={isLoading}
          className="flex items-center space-x-2"
        >
          <LayoutGrid className="h-4 w-4" />
          <span>自動整列</span>
        </Button>

        <Separator orientation="vertical" className="h-6" />

        {/* View Controls */}
        <div className="flex items-center space-x-1">
          <Button size="sm" variant="ghost" onClick={handleZoomIn}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={handleZoomOut}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={handleFitView}>
            <Maximize className="h-4 w-4" />
          </Button>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* History Actions */}
        <div className="flex items-center space-x-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={undo}
            disabled={!canUndo()}
          >
            <Undo className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={redo}
            disabled={!canRedo()}
          >
            <Redo className="h-4 w-4" />
          </Button>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Search Toggle */}
        <Button size="sm" variant="ghost" onClick={onToggleSearch}>
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
            className="flex items-center space-x-2"
          >
            <Database className="h-4 w-4" />
            <span>サンプル</span>
          </Button>
        </div>
      </div>

      {selectedNodeId && (
        <div className="mt-2 text-sm text-gray-600">
          選択中: ID {selectedNodeId}
        </div>
      )}
    </div>
  );
};

export default Toolbar;
