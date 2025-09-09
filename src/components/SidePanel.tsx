"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { PersonSchema, Person } from "@/types";
import { useFamilyTreeStore } from "@/stores/family-tree-store";
import { Trash2, Save, X } from "lucide-react";
import { z } from "zod";

type PersonFormData = z.infer<typeof PersonSchema>;

interface SidePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const SidePanel: React.FC<SidePanelProps> = ({ isOpen, onClose }) => {
  const {
    selectedNodeId,
    getPersonById,
    updateNode,
    removeNode,
    selectNode,
  } = useFamilyTreeStore();

  const selectedPerson = selectedNodeId ? getPersonById(selectedNodeId) : null;
  const [partnershipId, setPartnershipId] = React.useState<number | null>(null);
  const [isFlipped, setIsFlipped] = React.useState<boolean>(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isDirty },
  } = useForm<PersonFormData>({
    resolver: zodResolver(PersonSchema),
    defaultValues: selectedPerson ? {
      firstName: selectedPerson.firstName,
      lastName: selectedPerson.lastName || "",
      sex: selectedPerson.sex || undefined,
      birthDate: selectedPerson.birthDate || "",
      deathDate: selectedPerson.deathDate || "",
      isDeceased: selectedPerson.isDeceased,
      email: selectedPerson.email || "",
      phone: selectedPerson.phone || "",
      address: selectedPerson.address || "",
      city: selectedPerson.city || "",
      prefecture: selectedPerson.prefecture || "",
      country: selectedPerson.country || "",
      note: selectedPerson.note || "",
    } : {
      firstName: "",
      lastName: "",
      sex: undefined,
      birthDate: "",
      deathDate: "",
      isDeceased: false,
      email: "",
      phone: "",
      address: "",
      city: "",
      prefecture: "",
      country: "",
      note: "",
    },
  });

  // Watch form values
  const watchedSex = watch("sex");
  const watchedIsDeceased = watch("isDeceased");

  // Reset form when selected person changes
  React.useEffect(() => {
    if (selectedPerson) {
      reset({
        firstName: selectedPerson.firstName,
        lastName: selectedPerson.lastName || "",
        sex: selectedPerson.sex || undefined,
        birthDate: selectedPerson.birthDate || "",
        deathDate: selectedPerson.deathDate || "",
        isDeceased: selectedPerson.isDeceased,
        email: selectedPerson.email || "",
        phone: selectedPerson.phone || "",
        address: selectedPerson.address || "",
        city: selectedPerson.city || "",
        prefecture: selectedPerson.prefecture || "",
        country: selectedPerson.country || "",
        note: selectedPerson.note || "",
      });
    }
  }, [selectedPerson, reset]);

  // 夫婦向きの取得
  React.useEffect(() => {
    (async () => {
      try {
        if (!selectedPerson) return;
        const res = await fetch(`/api/partnerships?treeId=${selectedPerson.treeId}`);
        if (!res.ok) return;
        const parts = await res.json();
        const match = parts.find((p: any) => p.partnerAId && p.partnerBId && (p.partnerAId === selectedPerson.id || p.partnerBId === selectedPerson.id));
        if (match) {
          setPartnershipId(match.id);
          setIsFlipped(!!match.isFlipped);
        } else {
          setPartnershipId(null);
          setIsFlipped(false);
        }
      } catch {}
    })();
  }, [selectedPerson]);

  const onSubmit = async (data: PersonFormData) => {
    if (!selectedNodeId || !selectedPerson) return;

    try {
      // Update in store
      updateNode(selectedNodeId, {
        ...data,
        email: data.email || null,
        lastName: data.lastName || null,
        sex: data.sex || null,
        birthDate: data.birthDate || null,
        deathDate: data.deathDate || null,
        phone: data.phone || null,
        address: data.address || null,
        city: data.city || null,
        prefecture: data.prefecture || null,
        country: data.country || null,
        note: data.note || null,
      });

      // Update in database
      const response = await fetch(`/api/people/${selectedPerson.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to update person");
      }

      console.log("Person updated successfully");
    } catch (error) {
      console.error("Failed to update person:", error);
    }
  };

  const handleDelete = async () => {
    if (!selectedNodeId || !selectedPerson) return;
    
    if (!confirm("この人物を削除してもよろしいですか？関連する関係も削除されます。")) {
      return;
    }

    try {
      // Delete from database
      const response = await fetch(`/api/people/${selectedPerson.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete person");
      }

      // Remove from store
      removeNode(selectedNodeId);
      onClose();
    } catch (error) {
      console.error("Failed to delete person:", error);
    }
  };

  if (!isOpen || !selectedPerson) {
    return null;
  }

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold">人物編集</h2>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">基本情報</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="firstName">名前 *</Label>
                <Input
                  id="firstName"
                  {...register("firstName")}
                  className={errors.firstName ? "border-red-500" : ""}
                />
                {errors.firstName && (
                  <p className="text-xs text-red-500 mt-1">{errors.firstName.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="lastName">姓</Label>
                <Input
                  id="lastName"
                  {...register("lastName")}
                  className={errors.lastName ? "border-red-500" : ""}
                />
                {errors.lastName && (
                  <p className="text-xs text-red-500 mt-1">{errors.lastName.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="sex">性別</Label>
                <Select
                  value={watchedSex || undefined}
                  onValueChange={(value) => {
                    // Handle clearing the selection
                    if (value === "unset") {
                      setValue("sex", undefined);
                    } else {
                      setValue("sex", value as any);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="性別を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unset">未選択</SelectItem>
                    <SelectItem value="male">男性</SelectItem>
                    <SelectItem value="female">女性</SelectItem>
                    <SelectItem value="other">その他</SelectItem>
                    <SelectItem value="unknown">不明</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Partnership */}
          {partnershipId && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">配偶者設定</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={isFlipped} onChange={async (e) => {
                    const value = e.target.checked;
                    setIsFlipped(value);
                    try {
                      await fetch(`/api/partnerships/${partnershipId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ isFlipped: value })
                      });
                    } catch {}
                  }} />
                  夫婦線の向きを入れ替える（左右反転）
                </label>
              </CardContent>
            </Card>
          )}

          {/* Life Dates */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">生没年月日</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="birthDate">生年月日</Label>
                <Input
                  id="birthDate"
                  type="date"
                  {...register("birthDate")}
                  className={errors.birthDate ? "border-red-500" : ""}
                />
                {errors.birthDate && (
                  <p className="text-xs text-red-500 mt-1">{errors.birthDate.message}</p>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isDeceased"
                  {...register("isDeceased")}
                  className="rounded"
                />
                <Label htmlFor="isDeceased">故人</Label>
              </div>

              {watchedIsDeceased && (
                <div>
                  <Label htmlFor="deathDate">没年月日</Label>
                  <Input
                    id="deathDate"
                    type="date"
                    {...register("deathDate")}
                    className={errors.deathDate ? "border-red-500" : ""}
                  />
                  {errors.deathDate && (
                    <p className="text-xs text-red-500 mt-1">{errors.deathDate.message}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contact Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">連絡先</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="email">メールアドレス</Label>
                <Input
                  id="email"
                  type="email"
                  {...register("email")}
                  className={errors.email ? "border-red-500" : ""}
                />
                {errors.email && (
                  <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="phone">電話番号</Label>
                <Input
                  id="phone"
                  {...register("phone")}
                  className={errors.phone ? "border-red-500" : ""}
                />
                {errors.phone && (
                  <p className="text-xs text-red-500 mt-1">{errors.phone.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Address */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">住所</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="country">国</Label>
                <Input
                  id="country"
                  {...register("country")}
                  className={errors.country ? "border-red-500" : ""}
                />
              </div>

              <div>
                <Label htmlFor="prefecture">都道府県</Label>
                <Input
                  id="prefecture"
                  {...register("prefecture")}
                  className={errors.prefecture ? "border-red-500" : ""}
                />
              </div>

              <div>
                <Label htmlFor="city">市区町村</Label>
                <Input
                  id="city"
                  {...register("city")}
                  className={errors.city ? "border-red-500" : ""}
                />
              </div>

              <div>
                <Label htmlFor="address">住所</Label>
                <Input
                  id="address"
                  {...register("address")}
                  className={errors.address ? "border-red-500" : ""}
                />
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">備考</CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <Label htmlFor="note">メモ</Label>
                <textarea
                  id="note"
                  {...register("note")}
                  className="w-full min-h-[80px] p-2 border border-gray-300 rounded-md resize-y"
                  placeholder="その他の情報や備考を入力..."
                />
                {errors.note && (
                  <p className="text-xs text-red-500 mt-1">{errors.note.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              className="flex items-center space-x-2"
            >
              <Trash2 className="h-4 w-4" />
              <span>削除</span>
            </Button>

            <Button
              type="submit"
              disabled={!isDirty}
              className="flex items-center space-x-2"
            >
              <Save className="h-4 w-4" />
              <span>保存</span>
            </Button>
          </div>
        </form>

        {/* Person Info Display */}
        <Separator />
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">ID</span>
              <Badge variant="outline">{selectedPerson.id}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">作成日</span>
              <span className="text-sm">
                {new Date(selectedPerson.createdAt).toLocaleDateString("ja-JP")}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">更新日</span>
              <span className="text-sm">
                {new Date(selectedPerson.updatedAt).toLocaleDateString("ja-JP")}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SidePanel;
