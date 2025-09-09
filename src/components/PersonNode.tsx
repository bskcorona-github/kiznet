import React, { memo, useCallback } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { Card, CardContent } from "@/components/ui/card";
import { LAYOUT } from "@/shared/config/layout";
import PersonEditDialog from "./PersonEditDialog";
import { Badge } from "@/components/ui/badge";
import { PersonNode as PersonNodeType } from "@/types";
import { User, Calendar, MapPin } from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { cn } from "@/lib/utils";

const PersonNode = memo(({ data, selected }: NodeProps<PersonNodeType["data"]>) => {
  const { person, isSearchHighlighted } = data;
  const fullName = `${person.lastName || ""} ${person.firstName}`.trim();
  
  const formatDate = useCallback((dateString?: string | null) => {
    if (!dateString) return null;
    try {
      return format(new Date(dateString), "yyyy年M月d日", { locale: ja });
    } catch {
      return dateString;
    }
  }, []);

  const age = React.useMemo(() => {
    if (!person.birthDate) return null;
    
    const birth = new Date(person.birthDate);
    const endDate = person.deathDate ? new Date(person.deathDate) : new Date();
    const ageInMs = endDate.getTime() - birth.getTime();
    const ageInYears = Math.floor(ageInMs / (365.25 * 24 * 60 * 60 * 1000));
    
    return ageInYears >= 0 ? ageInYears : null;
  }, [person.birthDate, person.deathDate]);

  const [open, setOpen] = React.useState(false);

  return (
    <div className={cn("relative group")}> 
      {/* Improved handles for precise connections */}
      
      {/* 親からの接続（上端中央） */}
      <Handle
        type="target"
        position={Position.Top}
        id="parent-connection"
        className="!bg-blue-500 !w-3 !h-3 !border-2 !border-white"
        style={{ left: "50%" }}
      />
      
      {/* 子どもへの接続（下端中央） */}
      <Handle
        type="source"  
        position={Position.Bottom}
        id="child-connection"
        className="!bg-blue-500 !w-3 !h-3 !border-2 !border-white"
        style={{ left: "50%" }}
      />
      
      {/* 配偶者への接続（右端中央） */}
      <Handle
        type="source"
        position={Position.Right}
        id="spouse-right"
        className="!bg-pink-500 !w-3 !h-3 !border-2 !border-white"
        style={{ top: "40%" }}
      />

      {/* 配偶者への接続（左端から出す用：反転対応） */}
      <Handle
        type="source"
        position={Position.Left}
        id="spouse-left-source"
        className="!bg-pink-500 !w-3 !h-3 !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ top: "60%" }}
      />
      
      {/* 配偶者からの接続（左端中央） */}
      <Handle
        type="target"
        position={Position.Left}
        id="spouse-left"  
        className="!bg-pink-500 !w-3 !h-3 !border-2 !border-white"
        style={{ top: "40%" }}
      />

      {/* 配偶者からの接続（右端に受ける用：反転対応） */}
      <Handle
        type="target"
        position={Position.Right}
        id="spouse-right-target"
        className="!bg-pink-500 !w-3 !h-3 !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ top: "60%" }}
      />

      <Card
        className={cn(
          `w-[${LAYOUT.card.width}px] h-[${LAYOUT.card.height}px] shadow-md transition-all duration-200 cursor-pointer hover:shadow-lg`,
          selected && "ring-2 ring-blue-500 ring-offset-2 shadow-blue-200",
          isSearchHighlighted && "ring-2 ring-yellow-400 ring-offset-2 shadow-yellow-200",
          person.isDeceased && "bg-gray-50 border-gray-300 opacity-80"
        )}
        onClick={() => setOpen(true)}
      >
        <CardContent className="p-2 h-full flex flex-col justify-center">
          {/* コンパクト表示：名前、続柄、性別 */}
          <div className="flex items-center gap-2 w-full">
            <div className="flex-1 min-w-0">
              <div className="text-[20px] font-medium truncate" title={fullName}>
                {fullName}
              </div>
              {person.birthOrder && (
                <div className="text-[12px] text-gray-600 truncate" title={person.birthOrder}>
                  {person.birthOrder}
                </div>
              )}
            </div>
            {person.sex && (
              <div
                className={cn(
                  "text-sm font-semibold flex-shrink-0",
                  person.sex === "male" && "text-blue-600",
                  person.sex === "female" && "text-pink-600",
                  person.sex === "other" && "text-purple-600",
                  person.sex === "unknown" && "text-gray-500"
                )}
              >
                {person.sex === "male" && "♂"}
                {person.sex === "female" && "♀"}
                {person.sex === "other" && "⚧"}
                {person.sex === "unknown" && "?"}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 編集ダイアログ */}
      <PersonEditDialog 
        person={person} 
        open={open} 
        onOpenChange={setOpen}
        onSaved={() => {
          // 人物情報が更新されたことを通知
          window.dispatchEvent(new CustomEvent("kiznet:person-updated"));
        }}
        onDeleted={() => {
          // 人物が削除されたことを通知
          window.dispatchEvent(new CustomEvent("kiznet:person-deleted"));
        }}
      />
    </div>
  );
});

PersonNode.displayName = "PersonNode";

export default PersonNode;
