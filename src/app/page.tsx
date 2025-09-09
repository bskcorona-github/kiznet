"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TreePine, Users, FileText, Plus, Sparkles, Zap, Heart, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";

type TreeItem = {
  id: number;
  name: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
};

export default function HomePage() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [treeName, setTreeName] = useState("");
  const [treeDescription, setTreeDescription] = useState("");
  const [trees, setTrees] = useState<TreeItem[] | null>(null);
  const [isLoadingTrees, setIsLoadingTrees] = useState(true);
  const [treesError, setTreesError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchTrees = async () => {
      setIsLoadingTrees(true);
      setTreesError(null);
      try {
        const res = await fetch("/api/trees", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to fetch trees");
        const data = (await res.json()) as TreeItem[];
        if (mounted) setTrees(data);
      } catch (e) {
        if (mounted) setTreesError("家系図一覧の取得に失敗しました");
      } finally {
        if (mounted) setIsLoadingTrees(false);
      }
    };
    fetchTrees();
    return () => {
      mounted = false;
    };
  }, []);

  const handleCreateTree = async () => {
    if (!treeName.trim()) return;

    setIsCreating(true);
    try {
      const newTreeData = {
        name: treeName.trim(),
        description: treeDescription.trim() || undefined,
      };

      const response = await fetch("/api/trees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTreeData),
      });

      if (!response.ok) {
        throw new Error("Failed to create tree");
      }

      const newTree = await response.json();
      router.push(`/editor?treeId=${newTree.id}`);
    } catch (error) {
      console.error("Failed to create tree:", error);
      alert("家系図の作成に失敗しました。データベース接続を確認してください。");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDemoTree = () => {
    router.push("/editor?demo=true");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <div className="container mx-auto px-4 py-8 md:py-16">
        {/* Header */}
        <div className="text-center mb-8 md:mb-10">
          <div className="flex items-center justify-center mb-6">
            <div className="relative">
              <TreePine className="h-12 w-12 text-blue-600 mr-3" />
              <Sparkles className="h-6 w-6 text-yellow-500 absolute -top-1 -right-1 animate-pulse" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900">Kiznet</h1>
          </div>
          <p className="text-gray-600 mt-2">家系図を作る・編集する</p>
        </div>

        {/* Tree List */}
        <div className="max-w-6xl mx-auto mb-12 md:mb-16">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl md:text-2xl font-semibold text-gray-900">作成した家系図一覧</h2>
            <Button variant="ghost" onClick={() => router.refresh()} className="text-gray-600 hover:text-gray-900">更新</Button>
          </div>

          {isLoadingTrees ? (
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
              <ul className="divide-y divide-gray-200">
                {Array.from({ length: 6 }).map((_, i) => (
                  <li key={i} className="h-16 animate-pulse">
                    <div className="h-full w-full bg-gradient-to-r from-gray-100 to-gray-50" />
                  </li>
                ))}
              </ul>
            </div>
          ) : treesError ? (
            <div className="text-center text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-4">{treesError}</div>
          ) : trees && trees.length > 0 ? (
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
              <ul className="divide-y divide-gray-200">
                {trees.map((tree) => (
                  <li key={tree.id}>
                    <button
                      onClick={() => router.push(`/editor?treeId=${tree.id}`)}
                      className="w-full text-left px-4 py-4 hover:bg-gray-50 transition flex items-center gap-3"
                    >
                      <div className="shrink-0 p-2 bg-blue-50 rounded-md">
                        <TreePine className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-900 truncate" title={tree.name}>{tree.name}</span>
                          <span className="text-xs text-gray-600 bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded">
                            最終更新 {formatDistanceToNow(new Date(tree.updatedAt), { addSuffix: true, locale: ja })}
                          </span>
                        </div>
                        {tree.description && (
                          <p className="text-sm text-gray-600 truncate" title={tree.description}>{tree.description}</p>
                        )}
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="text-center text-gray-700">作成済みの家系図はまだありません。</div>
          )}
        </div>

        {/* Action Cards */}
        <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-6 md:gap-8 mb-12 md:mb-16">
          {/* Create New Tree */}
          <Card className="hover:shadow-lg transition-all duration-300 border-2 hover:border-blue-200">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center text-xl">
                <div className="p-2 bg-blue-100 rounded-lg mr-3">
                  <Plus className="h-6 w-6 text-blue-600" />
                </div>
                新しい家系図を作成
              </CardTitle>
              <CardDescription className="text-base">
                空の家系図から始めて、家族の情報を入力していきます
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="tree-name" className="text-sm font-medium">家系図名 *</Label>
                <Input
                  id="tree-name"
                  placeholder="例: 田中家の家系図"
                  value={treeName}
                  onChange={(e) => setTreeName(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="tree-description" className="text-sm font-medium">説明（任意）</Label>
                <Input
                  id="tree-description"
                  placeholder="家系図の説明を入力..."
                  value={treeDescription}
                  onChange={(e) => setTreeDescription(e.target.value)}
                  className="mt-1"
                />
              </div>
              <Button 
                onClick={handleCreateTree} 
                disabled={!treeName.trim() || isCreating}
                className="w-full h-11 text-base font-medium"
                size="lg"
              >
                {isCreating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    作成中...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    家系図を作成
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Demo Tree */}
          <Card className="hover:shadow-lg transition-all duration-300 border-2 hover:border-green-200">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center text-xl">
                <div className="p-2 bg-green-100 rounded-lg mr-3">
                  <TreePine className="h-6 w-6 text-green-600" />
                </div>
                サンプル家系図で試す
              </CardTitle>
              <CardDescription className="text-base">
                既にサンプルデータが入った家系図で機能を体験できます
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-gray-700 bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg border border-green-100">
                <h4 className="font-semibold mb-3 text-gray-800">✨ 含まれる機能:</h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center">
                    <Users className="h-4 w-4 text-blue-500 mr-2" />
                    3世代のサンプル人物データ（13人）
                  </li>
                  <li className="flex items-center">
                    <Heart className="h-4 w-4 text-pink-500 mr-2" />
                    親子関係・配偶者関係
                  </li>
                  <li className="flex items-center">
                    <Zap className="h-4 w-4 text-yellow-500 mr-2" />
                    自動レイアウト機能
                  </li>
                  <li className="flex items-center">
                    <FileText className="h-4 w-4 text-purple-500 mr-2" />
                    エクスポート・印刷機能
                  </li>
                </ul>
              </div>
              <Button 
                onClick={handleDemoTree} 
                variant="outline" 
                className="w-full h-11 text-base font-medium border-green-200 hover:bg-green-50"
                size="lg"
              >
                <TreePine className="h-4 w-4 mr-2" />
                サンプルを試す
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* minimal footer removed per request */}
      </div>
    </div>
  );
}