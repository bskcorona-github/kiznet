import React, { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PersonNode as PersonNodeType } from "@/types";
import { User, Calendar, MapPin } from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { cn } from "@/lib/utils";

const PersonNode = memo(({ data, selected }: NodeProps<PersonNodeType["data"]>) => {
  const { person, isSearchHighlighted } = data;
  const fullName = `${person.firstName} ${person.lastName || ""}`.trim();
  
  const formatDate = (dateString?: string | null) => {
    if (!dateString) return null;
    try {
      return format(new Date(dateString), "yyyy年M月d日", { locale: ja });
    } catch {
      return dateString;
    }
  };

  const age = React.useMemo(() => {
    if (!person.birthDate) return null;
    
    const birth = new Date(person.birthDate);
    const endDate = person.deathDate ? new Date(person.deathDate) : new Date();
    const ageInMs = endDate.getTime() - birth.getTime();
    const ageInYears = Math.floor(ageInMs / (365.25 * 24 * 60 * 60 * 1000));
    
    return ageInYears >= 0 ? ageInYears : null;
  }, [person.birthDate, person.deathDate]);

  return (
    <div className={cn("relative")}>
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
        style={{ top: "50%" }}
      />
      
      {/* 配偶者からの接続（左端中央） */}
      <Handle
        type="target"
        position={Position.Left}
        id="spouse-left"  
        className="!bg-pink-500 !w-3 !h-3 !border-2 !border-white"
        style={{ top: "50%" }}
      />

      <Card
        className={cn(
          "w-[180px] min-h-[120px] shadow-lg transition-all duration-200 cursor-pointer hover:shadow-xl",
          selected && "ring-2 ring-blue-500 ring-offset-2",
          isSearchHighlighted && "ring-2 ring-yellow-400 ring-offset-2",
          person.isDeceased && "bg-gray-50 border-gray-300"
        )}
      >
        <CardContent className="p-3">
          <div className="space-y-2">
            {/* Header with name and status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1">
                <User className="h-4 w-4 text-gray-600" />
                <span className="font-medium text-sm truncate" title={fullName}>
                  {fullName}
                </span>
              </div>
              {person.sex && (
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs px-1.5 py-0.5",
                    person.sex === "male" && "bg-blue-50 text-blue-700 border-blue-200",
                    person.sex === "female" && "bg-pink-50 text-pink-700 border-pink-200",
                    person.sex === "other" && "bg-purple-50 text-purple-700 border-purple-200",
                    person.sex === "unknown" && "bg-gray-50 text-gray-700 border-gray-200"
                  )}
                >
                  {person.sex === "male" && "♂"}
                  {person.sex === "female" && "♀"}
                  {person.sex === "other" && "⚧"}
                  {person.sex === "unknown" && "?"}
                </Badge>
              )}
            </div>

            {/* Birth/Death dates */}
            {(person.birthDate || person.deathDate) && (
              <div className="flex items-center space-x-1">
                <Calendar className="h-3 w-3 text-gray-500" />
                <div className="text-xs text-gray-600">
                  {person.birthDate && (
                    <span>
                      {formatDate(person.birthDate)}
                      {age !== null && ` (${age}歳)`}
                    </span>
                  )}
                  {person.birthDate && person.deathDate && " - "}
                  {person.deathDate && (
                    <span className="text-red-600">
                      {formatDate(person.deathDate)}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Location */}
            {(person.city || person.prefecture) && (
              <div className="flex items-center space-x-1">
                <MapPin className="h-3 w-3 text-gray-500" />
                <span className="text-xs text-gray-600 truncate">
                  {[person.city, person.prefecture].filter(Boolean).join(", ")}
                </span>
              </div>
            )}

            {/* Deceased badge */}
            {person.isDeceased && (
              <Badge variant="secondary" className="text-xs">
                故人
              </Badge>
            )}

            {/* Note indicator */}
            {person.note && (
              <div className="text-xs text-gray-500 truncate" title={person.note}>
                📝 {person.note}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

PersonNode.displayName = "PersonNode";

export default PersonNode;
