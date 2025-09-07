"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useFamilyTreeStore } from "@/stores/family-tree-store";
import { Search, Filter, X, User } from "lucide-react";

interface SearchPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const SearchPanel: React.FC<SearchPanelProps> = ({ isOpen, onClose }) => {
  const {
    searchFilters,
    setSearchFilters,
    getFilteredNodes,
    nodes,
    selectNode,
  } = useFamilyTreeStore();

  const filteredNodes = getFilteredNodes();
  const hasFilters = Object.values(searchFilters).some(value => value && value !== "all");

  const handleNameSearch = (value: string) => {
    setSearchFilters({ name: value || undefined });
  };

  const handleSexFilter = (value: string) => {
    setSearchFilters({ sex: value === "all" ? undefined : value as any });
  };

  const handleLivingStatusFilter = (value: string) => {
    setSearchFilters({ livingStatus: value === "all" ? undefined : value as any });
  };

  const clearFilters = () => {
    setSearchFilters({ name: undefined, sex: undefined, livingStatus: undefined });
  };

  const handleNodeClick = (nodeId: string) => {
    selectNode(nodeId);
    // TODO: Pan to node in the canvas
  };

  if (!isOpen) return null;

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <Search className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold">検索・フィルタ</h2>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Search by Name */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center">
              <User className="h-4 w-4 mr-2" />
              名前検索
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="名前を入力..."
              value={searchFilters.name || ""}
              onChange={(e) => handleNameSearch(e.target.value)}
            />
          </CardContent>
        </Card>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center">
              <Filter className="h-4 w-4 mr-2" />
              フィルタ
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Sex Filter */}
            <div>
              <Label className="text-xs">性別</Label>
              <Select
                value={searchFilters.sex || "all"}
                onValueChange={handleSexFilter}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  <SelectItem value="male">男性</SelectItem>
                  <SelectItem value="female">女性</SelectItem>
                  <SelectItem value="other">その他</SelectItem>
                  <SelectItem value="unknown">不明</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Living Status Filter */}
            <div>
              <Label className="text-xs">生存状況</Label>
              <Select
                value={searchFilters.livingStatus || "all"}
                onValueChange={handleLivingStatusFilter}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  <SelectItem value="living">存命</SelectItem>
                  <SelectItem value="deceased">故人</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Clear Filters */}
        {hasFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={clearFilters}
            className="w-full"
          >
            フィルタをクリア
          </Button>
        )}

        {/* Results */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">
              検索結果 ({filteredNodes.length}/{nodes.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredNodes.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                条件に一致する人物が見つかりません
              </p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredNodes.map((node) => {
                  const person = node.data.person;
                  const fullName = `${person.firstName} ${person.lastName || ""}`.trim();
                  
                  return (
                    <div
                      key={node.id}
                      className="p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => handleNodeClick(node.id)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-sm">{fullName}</h4>
                        <div className="flex items-center space-x-1">
                          {person.sex && (
                            <Badge
                              variant="outline"
                              className="text-xs px-1.5 py-0.5"
                            >
                              {person.sex === "male" && "♂"}
                              {person.sex === "female" && "♀"}
                              {person.sex === "other" && "⚧"}
                              {person.sex === "unknown" && "?"}
                            </Badge>
                          )}
                          {person.isDeceased && (
                            <Badge variant="secondary" className="text-xs">
                              故人
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-xs text-gray-600 space-y-1">
                        {person.birthDate && (
                          <div>
                            生: {new Date(person.birthDate).toLocaleDateString("ja-JP")}
                          </div>
                        )}
                        {person.deathDate && (
                          <div>
                            没: {new Date(person.deathDate).toLocaleDateString("ja-JP")}
                          </div>
                        )}
                        {(person.city || person.prefecture) && (
                          <div>
                            {[person.city, person.prefecture].filter(Boolean).join(", ")}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SearchPanel;
