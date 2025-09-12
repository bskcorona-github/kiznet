"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Person } from "@/types";
import { MapPin, Upload, X, User } from "lucide-react";

type Props = {
  person: Person;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
  onDeleted?: () => void;
};

const PersonEditDialog: React.FC<Props> = ({ person, open, onOpenChange, onSaved, onDeleted }) => {
  // フォーム状態
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [sex, setSex] = useState<"male" | "female" | "other" | "unknown">("unknown");
  const [birthOrder, setBirthOrder] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [deathDate, setDeathDate] = useState("");
  const [isDeceased, setIsDeceased] = useState(false);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [prefecture, setPrefecture] = useState("");
  const [country, setCountry] = useState("");
  const [note, setNote] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // 人物データをフォームに設定
  useEffect(() => {
    if (person) {
      setFirstName(person.firstName || "");
      setLastName(person.lastName || "");
      setSex(person.sex || "unknown");
      setBirthOrder(person.birthOrder || "");
      setBirthDate(person.birthDate || "");
      setDeathDate(person.deathDate || "");
      setIsDeceased(person.isDeceased || false);
      setEmail(person.email || "");
      setPhone(person.phone || "");
      setAddress(person.address || "");
      setCity(person.city || "");
      setPrefecture(person.prefecture || "");
      setCountry(person.country || "");
      setNote(person.note || "");
      setPhotoUrl(person.photoUrl || "");
    }
  }, [person]);

  // 写真アップロード処理
  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // ファイルサイズチェック（200KB）
    if (file.size > 200 * 1024) {
      alert("ファイルサイズは200KB以下にしてください。");
      return;
    }

    // WebP形式でない場合は変換を促す
    if (!file.type.includes("webp")) {
      alert("WebP形式のファイルをアップロードしてください。");
      return;
    }

    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload-photo", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setPhotoUrl(result.url);
        alert("写真をアップロードしました。");
      } else {
        alert(result.error || "アップロードに失敗しました。");
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("アップロードに失敗しました。");
    } finally {
      setUploadingPhoto(false);
    }
  };

  // 写真削除
  const handlePhotoRemove = () => {
    setPhotoUrl("");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim()) return;
    
    setSubmitting(true);
    try {
      const updateData = {
        firstName: firstName.trim(),
        lastName: lastName.trim() || null,
        sex: sex,
        birthOrder: birthOrder.trim() || null,
        birthDate: birthDate || null,
        deathDate: deathDate || null,
        isDeceased,
        email: email.trim() || null,
        phone: phone.trim() || null,
        address: address.trim() || null,
        city: city.trim() || null,
        prefecture: prefecture.trim() || null,
        country: country.trim() || null,
        note: note.trim() || null,
        photoUrl: photoUrl.trim() || null,
      };

      const res = await fetch(`/api/people/${person.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(`Failed to update person: ${errorData.details || errorData.error || res.statusText}`);
      }
      
      onSaved?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to update person:", error);
      alert(`更新に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = confirm("この人物を削除しますか？この操作は取り消せません。");
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/people/${person.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete person");
      
      onDeleted?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to delete person:", error);
      alert("削除に失敗しました");
    }
  };

  const fullAddress = [address, city, prefecture, country].filter(Boolean).join(" ");
  const mapUrl = fullAddress ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}` : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>人物編集</DialogTitle>
          <DialogDescription>
            人物の詳細情報を編集できます。
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSave}>
          {/* 基本情報 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="lastName">姓（任意）</Label>
              <Input 
                id="lastName" 
                value={lastName} 
                onChange={(e) => setLastName(e.target.value)} 
                placeholder="佐藤" 
              />
            </div>
            <div>
              <Label htmlFor="firstName">名 *</Label>
              <Input 
                id="firstName" 
                value={firstName} 
                onChange={(e) => setFirstName(e.target.value)} 
                placeholder="太郎" 
                required 
              />
            </div>
          </div>

          <div>
            <Label>性別</Label>
            <div className="flex items-center gap-4 mt-2 text-sm">
              <label className="flex items-center gap-1 cursor-pointer">
                <input type="radio" name="sex" value="male" checked={sex === "male"} onChange={() => setSex("male")} /> 男性
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input type="radio" name="sex" value="female" checked={sex === "female"} onChange={() => setSex("female")} /> 女性
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input type="radio" name="sex" value="other" checked={sex === "other"} onChange={() => setSex("other")} /> その他
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input type="radio" name="sex" value="unknown" checked={sex === "unknown"} onChange={() => setSex("unknown")} /> 不明
              </label>
            </div>
          </div>

          <div>
            <Label htmlFor="birthOrder">続柄（任意）</Label>
            <Input 
              id="birthOrder" 
              value={birthOrder} 
              onChange={(e) => setBirthOrder(e.target.value)} 
              placeholder="長男、次女、三男など" 
              maxLength={20}
            />
          </div>

          {/* 写真アップロード */}
          <div>
            <Label>写真（任意）</Label>
            <div className="mt-2 space-y-3">
              {photoUrl ? (
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img
                      src={photoUrl}
                      alt="プロフィール写真"
                      className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={handlePhotoRemove}
                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                      title="写真を削除"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="text-sm text-gray-600">
                    写真が設定されています
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center border-2 border-dashed border-gray-300">
                    <User className="w-8 h-8 text-gray-400" />
                  </div>
                  <div className="text-sm text-gray-600">
                    写真が設定されていません
                  </div>
                </div>
              )}
              <div>
                <input
                  type="file"
                  id="photo-upload"
                  accept="image/webp"
                  onChange={handlePhotoUpload}
                  className="hidden"
                  disabled={uploadingPhoto}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('photo-upload')?.click()}
                  disabled={uploadingPhoto}
                  className="flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  {uploadingPhoto ? "アップロード中..." : "写真をアップロード"}
                </Button>
                <div className="text-xs text-gray-500 mt-1">
                  WebP形式、200KB以下のファイルをアップロードしてください
                </div>
              </div>
            </div>
          </div>

          {/* 生年月日・没年月日 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="birthDate">誕生日（任意）</Label>
              <Input 
                id="birthDate" 
                type="date" 
                value={birthDate} 
                onChange={(e) => setBirthDate(e.target.value)} 
              />
            </div>
            <div>
              <Label htmlFor="deathDate">没年月日（任意）</Label>
              <Input 
                id="deathDate" 
                type="date" 
                value={deathDate} 
                onChange={(e) => setDeathDate(e.target.value)} 
              />
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={isDeceased} 
                onChange={(e) => setIsDeceased(e.target.checked)} 
              />
              <span className="text-sm">故人である</span>
            </label>
          </div>

          {/* 連絡先情報 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="email">メールアドレス（任意）</Label>
              <Input 
                id="email" 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="example@email.com" 
              />
            </div>
            <div>
              <Label htmlFor="phone">電話番号（任意）</Label>
              <Input 
                id="phone" 
                type="tel" 
                value={phone} 
                onChange={(e) => setPhone(e.target.value)} 
                placeholder="090-1234-5678" 
              />
            </div>
          </div>

          {/* 住所情報（単一フィールドに統一） */}
          <div className="space-y-3">
            <div>
              <Label htmlFor="address">住所（任意）</Label>
              <Input 
                id="address" 
                value={address} 
                onChange={(e) => setAddress(e.target.value)} 
                placeholder="例）沖縄県那覇市字大道151-3" 
              />
            </div>
            {mapUrl && (
              <Button type="button" variant="outline" size="sm" asChild>
                <a href={mapUrl} target="_blank" rel="noreferrer">
                  <MapPin className="w-4 h-4 mr-1" />
                  Googleマップで開く
                </a>
              </Button>
            )}
          </div>

          {/* メモ */}
          <div>
            <Label htmlFor="note">メモ（任意）</Label>
            <Textarea 
              id="note" 
              value={note} 
              onChange={(e) => setNote(e.target.value)} 
              placeholder="その他の情報やメモ" 
              rows={3}
              maxLength={1000}
            />
          </div>

          {/* アクションボタン */}
          <div className="flex justify-between pt-4">
            <Button 
              type="button" 
              variant="destructive" 
              onClick={handleDelete}
            >
              削除
            </Button>
            <div className="flex gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                キャンセル
              </Button>
              <Button 
                type="submit" 
                disabled={!firstName.trim() || submitting}
              >
                {submitting ? "保存中..." : "保存"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PersonEditDialog;
