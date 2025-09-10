"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Person, Relationship, Partnership, Tree } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Calendar, MapPin, Heart, Users } from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

interface PrintPageData {
  tree: Tree;
  people: Person[];
  relationships: Relationship[];
  partnerships: Partnership[];
}

function PrintPageInner() {
  const searchParams = useSearchParams();
  const treeId = searchParams?.get("treeId");
  
  const [data, setData] = useState<PrintPageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!treeId) {
      setError("家系図IDが指定されていません");
      setIsLoading(false);
      return;
    }

    const loadPrintData = async () => {
      try {
        const [treeRes, peopleRes, relationshipsRes, partnershipsRes] = await Promise.all([
          fetch(`/api/trees/${treeId}`),
          fetch(`/api/people?treeId=${treeId}`),
          fetch(`/api/relationships?treeId=${treeId}`),
          fetch(`/api/partnerships?treeId=${treeId}`),
        ]);

        if (!treeRes.ok || !peopleRes.ok || !relationshipsRes.ok || !partnershipsRes.ok) {
          throw new Error("データの読み込みに失敗しました");
        }

        const [tree, people, relationships, partnerships] = await Promise.all([
          treeRes.json(),
          peopleRes.json(),
          relationshipsRes.json(),
          partnershipsRes.json(),
        ]);

        setData({ tree, people, relationships, partnerships });
      } catch (error) {
        console.error("Failed to load print data:", error);
        setError(error instanceof Error ? error.message : "データの読み込みに失敗しました");
      } finally {
        setIsLoading(false);
      }
    };

    loadPrintData();
  }, [treeId]);

  // Auto print when page loads
  useEffect(() => {
    if (data && !isLoading) {
      setTimeout(() => {
        window.print();
      }, 1000);
    }
  }, [data, isLoading]);

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return null;
    try {
      return format(new Date(dateString), "yyyy年M月d日", { locale: ja });
    } catch {
      return dateString;
    }
  };

  const getAge = (person: Person) => {
    if (!person.birthDate) return null;
    
    const birth = new Date(person.birthDate);
    const endDate = person.deathDate ? new Date(person.deathDate) : new Date();
    const ageInMs = endDate.getTime() - birth.getTime();
    const ageInYears = Math.floor(ageInMs / (365.25 * 24 * 60 * 60 * 1000));
    
    return ageInYears >= 0 ? ageInYears : null;
  };

  const getPersonById = (id: number) => {
    return data?.people.find(p => p.id === id);
  };

  const getChildrenOf = (parentId: number) => {
    if (!data) return [];
    return data.relationships
      .filter(rel => rel.parentId === parentId)
      .map(rel => getPersonById(rel.childId))
      .filter(Boolean) as Person[];
  };

  const getParentsOf = (childId: number) => {
    if (!data) return [];
    return data.relationships
      .filter(rel => rel.childId === childId)
      .map(rel => getPersonById(rel.parentId))
      .filter(Boolean) as Person[];
  };

  const getPartnersOf = (personId: number) => {
    if (!data) return [];
    return data.partnerships
      .filter(part => part.partnerAId === personId || part.partnerBId === personId)
      .map(part => {
        const partnerId = part.partnerAId === personId ? part.partnerBId : part.partnerAId;
        return { person: getPersonById(partnerId), partnership: part };
      })
      .filter(p => p.person) as Array<{ person: Person; partnership: Partnership }>;
  };

  // Generate family structure by generation
  const generateFamilyStructure = () => {
    if (!data) return [];

    // Find root people (those without parents)
    const hasParent = new Set(data.relationships.map(rel => rel.childId));
    const rootPeople = data.people.filter(person => !hasParent.has(person.id));

    // Build generations
    const generations: Person[][] = [];
    let currentGen = rootPeople;
    let processedPeople = new Set<number>();

    while (currentGen.length > 0) {
      generations.push(currentGen);
      currentGen.forEach(person => processedPeople.add(person.id));

      // Get next generation (children)
      const nextGen: Person[] = [];
      currentGen.forEach(person => {
        const children = getChildrenOf(person.id);
        children.forEach(child => {
          if (!processedPeople.has(child.id)) {
            nextGen.push(child);
          }
        });
      });

      // Remove duplicates
      const uniqueNextGen = nextGen.filter((person, index, arr) => 
        arr.findIndex(p => p.id === person.id) === index
      );

      currentGen = uniqueNextGen;
    }

    return generations;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center print:hidden">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>印刷データを準備中...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center print:hidden">
        <div className="text-center text-red-600">
          <p>{error || "データが見つかりません"}</p>
        </div>
      </div>
    );
  }

  const familyStructure = generateFamilyStructure();

  return (
    <div className="print-container">
      {/* Print styles are in globals.css */}
      
      {/* Header (print only) */}
      <div className="print-header mb-8">
        <h1 className="text-3xl font-bold text-center mb-4">{data.tree.name}</h1>
        {data.tree.description && (
          <p className="text-center text-gray-600 mb-4">{data.tree.description}</p>
        )}
        <div className="text-center text-sm text-gray-500">
          <p>印刷日: {format(new Date(), "yyyy年M月d日", { locale: ja })}</p>
          <p>総人数: {data.people.length}名 | 親子関係: {data.relationships.length}件 | 配偶者関係: {data.partnerships.length}件</p>
        </div>
      </div>

      {/* Family Tree Structure */}
      <div className="family-tree-print">
        {familyStructure.map((generation, genIndex) => (
          <div key={genIndex} className="generation mb-8">
            <div className="generation-label text-lg font-semibold mb-4 text-center">
              第{genIndex + 1}世代
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {generation.map((person) => {
                const parents = getParentsOf(person.id);
                const children = getChildrenOf(person.id);
                const partners = getPartnersOf(person.id);
                const age = getAge(person);

                return (
                  <Card key={person.id} className="person-card">
                    <CardContent className="p-4">
                      {/* Basic Info */}
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-bold text-lg">
                          {person.lastName} {person.firstName}
                        </h3>
                        <div className="flex items-center space-x-1">
                          {person.sex && (
                            <Badge
                              variant="outline"
                              className="text-xs"
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

                      {/* Birth/Death Info */}
                      {(person.birthDate || person.deathDate) && (
                        <div className="flex items-center space-x-2 mb-2 text-sm">
                          <Calendar className="h-4 w-4 text-gray-500" />
                          <div>
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
                        <div className="flex items-center space-x-2 mb-2 text-sm">
                          <MapPin className="h-4 w-4 text-gray-500" />
                          <span>
                            {[person.city, person.prefecture].filter(Boolean).join(", ")}
                          </span>
                        </div>
                      )}

                      {/* Family Relations */}
                      {parents.length > 0 && (
                        <div className="flex items-start space-x-2 mb-2 text-sm">
                          <Users className="h-4 w-4 text-gray-500 mt-0.5" />
                          <div>
                            <span className="font-medium">両親: </span>
                            {parents.map((parent, index) => (
                              <span key={parent.id}>
                                {parent.lastName} {parent.firstName}
                                {index < parents.length - 1 && ", "}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {partners.length > 0 && (
                        <div className="flex items-start space-x-2 mb-2 text-sm">
                          <Heart className="h-4 w-4 text-gray-500 mt-0.5" />
                          <div>
                            <span className="font-medium">配偶者: </span>
                            {partners.map((partner, index) => (
                              <span key={partner.person.id}>
                                {partner.person.lastName} {partner.person.firstName}
                                {partner.partnership.type === "marriage" ? " (婚姻)" : " (パートナー)"}
                                {index < partners.length - 1 && ", "}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {children.length > 0 && (
                        <div className="flex items-start space-x-2 mb-2 text-sm">
                          <User className="h-4 w-4 text-gray-500 mt-0.5" />
                          <div>
                            <span className="font-medium">子供: </span>
                            {children.map((child, index) => (
                              <span key={child.id}>
                                {child.lastName} {child.firstName}
                                {index < children.length - 1 && ", "}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Contact Info */}
                      {person.email && (
                        <div className="text-xs text-gray-600 mb-1">
                          📧 {person.email}
                        </div>
                      )}

                      {person.phone && (
                        <div className="text-xs text-gray-600 mb-1">
                          📞 {person.phone}
                        </div>
                      )}

                      {/* Note */}
                      {person.note && (
                        <div className="text-xs text-gray-600 mt-2 border-t pt-2">
                          📝 {person.note}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer (print only) */}
      <div className="print-footer mt-8 text-center text-sm text-gray-500">
        <p>Kiznet - 家系図作成アプリケーション</p>
      </div>

      {/* No-print instructions */}
      <div className="no-print fixed bottom-4 right-4 bg-white p-4 rounded-lg shadow-lg border">
        <p className="text-sm text-gray-600 mb-2">
          印刷プレビューが表示されています
        </p>
        <button
          onClick={() => window.close()}
          className="text-xs bg-gray-100 px-3 py-1 rounded hover:bg-gray-200"
        >
          閉じる
        </button>
      </div>

      {/* Print styles */}
      <style jsx>{`
        @media print {
          .print-container {
            font-size: 12px;
            line-height: 1.4;
          }
          
          .person-card {
            break-inside: avoid;
            margin-bottom: 0.5rem;
          }
          
          .generation {
            break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
}

export default function PrintPage() {
  return (
    <Suspense fallback={<div className="p-6">印刷データを準備中...</div>}>
      <PrintPageInner />
    </Suspense>
  );
}
