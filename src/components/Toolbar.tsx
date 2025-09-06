"use client";
import { Button } from "./ui/Button";
import { Download, Printer, Plus } from "lucide-react";

export function Toolbar(props: {
  onAddPerson: () => void;
  onExportCsv: () => void;
  onPrint: () => void;
  onLayout: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="no-print flex items-center gap-2 p-2 border-b bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/50 sticky top-0 z-10">
      <Button onClick={props.onAddPerson} disabled={props.disabled}><Plus className="w-4 h-4 mr-1"/>人物を追加</Button>
      <Button variant="secondary" onClick={props.onExportCsv} disabled={props.disabled}><Download className="w-4 h-4 mr-1"/>CSVエクスポート</Button>
      <Button variant="secondary" onClick={props.onPrint}><Printer className="w-4 h-4 mr-1"/>印刷</Button>
      <Button variant="outline" onClick={props.onLayout} disabled={props.disabled}>整列</Button>
    </div>
  );
}


