"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    firstName: string;
    lastName?: string;
    sex?: "male" | "female" | "other" | "unknown";
    birthOrder?: string;
    birthDate?: string;
  }) => Promise<void> | void;
};

const AddPersonDialog: React.FC<Props> = ({ open, onOpenChange, onSubmit }) => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [sex, setSex] = useState<"male" | "female" | "other" | "unknown">("unknown");
  const [birthOrder, setBirthOrder] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit({
        firstName: firstName.trim(),
        lastName: lastName.trim() || undefined,
        sex,
        birthOrder: birthOrder.trim() || undefined,
        birthDate: birthDate || undefined,
      });
      // reset
      setFirstName("");
      setLastName("");
      setSex("unknown");
      setBirthOrder("");
      setBirthDate("");
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>人物を追加</DialogTitle>
          <DialogDescription>必要最低限の情報だけで作成できます。後から編集可能です。</DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-1">
              <Label htmlFor="lastName">姓（任意）</Label>
              <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="佐藤" />
            </div>
            <div className="col-span-1">
              <Label htmlFor="firstName">名 *</Label>
              <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="太郎" required />
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

          <div>
            <Label htmlFor="birthDate">誕生日（任意）</Label>
            <Input id="birthDate" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>キャンセル</Button>
            <Button type="submit" disabled={!firstName.trim() || submitting}>{submitting ? "作成中..." : "作成"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddPersonDialog;


