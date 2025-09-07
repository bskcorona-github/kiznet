"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TreePine, Users, FileText, Plus } from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [treeName, setTreeName] = useState("");
  const [treeDescription, setTreeDescription] = useState("");

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
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-6">
            <TreePine className="h-12 w-12 text-blue-600 mr-3" />
            <h1 className="text-4xl font-bold text-gray-900">Kiznet</h1>
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            直感的に操作できる家系図作成アプリケーション
          </p>
          <p className="text-gray-500 mt-4">
            ドラッグ&ドロップで簡単に家族関係を編集・整理できます
          </p>
        </div>

        {/* Action Cards */}
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8 mb-16">
          {/* Create New Tree */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Plus className="h-5 w-5 mr-2" />
                新しい家系図を作成
              </CardTitle>
              <CardDescription>
                空の家系図から始めて、家族の情報を入力していきます
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="tree-name">家系図名 *</Label>
                <Input
                  id="tree-name"
                  placeholder="田中家の家系図"
                  value={treeName}
                  onChange={(e) => setTreeName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="tree-description">説明（任意）</Label>
                <Input
                  id="tree-description"
                  placeholder="家系図の説明を入力..."
                  value={treeDescription}
                  onChange={(e) => setTreeDescription(e.target.value)}
                />
              </div>
              <Button 
                onClick={handleCreateTree} 
                disabled={!treeName.trim() || isCreating}
                className="w-full"
              >
                {isCreating ? "作成中..." : "家系図を作成"}
              </Button>
            </CardContent>
          </Card>

          {/* Demo Tree */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TreePine className="h-5 w-5 mr-2" />
                サンプル家系図で試す
              </CardTitle>
              <CardDescription>
                既にサンプルデータが入った家系図で機能を体験できます
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">含まれる機能:</h4>
                <ul className="space-y-1 text-xs">
                  <li>• 3世代のサンプル人物データ</li>
                  <li>• 親子関係・配偶者関係</li>
                  <li>• 自動レイアウト機能</li>
                  <li>• エクスポート・印刷機能</li>
                </ul>
              </div>
              <Button onClick={handleDemoTree} variant="outline" className="w-full">
                サンプルを試す
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <Card className="text-center">
            <CardHeader>
              <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <CardTitle className="text-lg">直感的な操作</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                ドラッグ&ドロップで人物や関係を簡単に編集。誰でも使いやすいインターフェース。
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <TreePine className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <CardTitle className="text-lg">自動レイアウト</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                世代ごとに自動で整列。複雑な家系図も見やすく美しく表示されます。
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <FileText className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <CardTitle className="text-lg">データ管理</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                CSV・JSON形式でのエクスポート・インポート。印刷やデータバックアップも簡単。
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center mt-16 text-sm text-gray-500">
          <p>© 2024 Kiznet. 家族の繋がりを視覚化するWebアプリケーション</p>
          <p className="mt-2">
            ※ データベース機能を使用するには、環境変数でNeonの接続設定が必要です
          </p>
        </div>
      </div>
    </div>
  );
}