"use client";
import React from 'react';
import { useParams } from 'next/navigation';
import { Toolbar } from '@/components/Toolbar';
import { FamilyGraph } from '@/components/FamilyGraph';
import { PersonForm } from '@/components/PersonForm';
import type { Edge, Node } from 'reactflow';
import { MarkerType } from 'reactflow';
import type { Person, Relationship, TreeDetail } from '@lib/types';
import { downloadCsv } from '@lib/csv';
import { applyDagreLayout } from '@lib/layout';

export default function TreeEditorPage() {
  const params = useParams<{ id: string }>();
  const treeId = params.id as string;
  const [detail, setDetail] = React.useState<TreeDetail | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const fetchDetail = React.useCallback(async () => {
    const res = await fetch(`/api/trees/${treeId}`);
    const data = await res.json();
    setDetail(data);
  }, [treeId]);

  React.useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const baseNodes: Node[] = (detail?.persons ?? []).map((p) => ({
    id: p.id,
    position: { x: 0, y: 0 },
    data: { id: p.id, label: `${p.familyName} ${p.givenName}`, birthDeath: `${p.birthDate ?? ''}${p.deathDate ? '–' + p.deathDate : '– '}` },
    type: 'default',
    width: 180 as any,
    height: 64 as any,
  }));

  const edges: Edge[] = (detail?.relationships ?? []).map((r) => ({
    id: r.id,
    source: r.fromId,
    target: r.toId,
    animated: false,
    style: r.type === 'spouse' ? { strokeDasharray: '4 4' } : undefined,
    markerEnd: r.type === 'parent_child' ? { type: MarkerType.ArrowClosed } : undefined,
  }));

  const nodes: Node[] = React.useMemo(() => {
    if (!baseNodes.length) return [];
    const positions = applyDagreLayout(
      baseNodes.map(n => ({ id: n.id, width: (n as any).width ?? 180, height: (n as any).height ?? 64 })),
      edges.map(e => ({ id: e.id, source: e.source, target: e.target }))
    );
    return baseNodes.map(n => ({ ...n, position: positions.get(n.id) ?? { x: 0, y: 0 } }));
  }, [JSON.stringify(baseNodes), JSON.stringify(edges)]);

  const onAddPerson = async () => {
    if (!detail) return;
    setBusy(true);
    const res = await fetch('/api/persons', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ treeId, familyName: '姓', givenName: '名' }) });
    const p = await res.json();
    await fetchDetail();
    setSelectedId(p.id);
    setBusy(false);
  };

  const onExportCsv = async () => {
    const res = await fetch(`/api/trees/${treeId}`);
    const data: TreeDetail = await res.json();
    downloadCsv('persons.csv', data.persons);
    downloadCsv('relationships.csv', data.relationships);
  };

  const onPrint = () => window.print();

  const addRelationship = async (type: 'parent_child' | 'spouse', fromId: string, toId: string) => {
    if (!detail) return;
    setBusy(true);
    const res = await fetch('/api/relationships', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ treeId, type, fromId, toId }) });
    if (!res.ok) { console.error('Failed to add relationship'); return; }
    await fetch(`/api/trees/${treeId}`);
    // 最新データ反映
    const refresh = await fetch(`/api/trees/${treeId}`);
    const data = await refresh.json();
    setDetail(data);
    setBusy(false);
  };

  const removeRelationship = async (id: string) => {
    if (!detail) return;
    await fetch(`/api/relationships/${id}`, { method: 'DELETE' });
    setDetail({ ...detail, relationships: detail.relationships.filter(r => r.id !== id) });
  };

  const onSave = async (values: any) => {
    if (!selectedId || !detail) return;
    // 空文字は null、空オブジェクト/配列は undefined に丸めて送る
    const normalized = Object.fromEntries(
      Object.entries(values).map(([k, v]) => [k, v === '' ? null : (v && typeof v === 'object' && Object.keys(v).length === 0 ? undefined : v)])
    );
    const res = await fetch(`/api/persons/${selectedId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(normalized) });
    if (!res.ok) { console.error('Failed to update person'); return; }
    await fetchDetail();
  };

  const onDelete = async () => {
    if (!selectedId || !detail) return;
    await fetch(`/api/persons/${selectedId}`, { method: 'DELETE' });
    await fetchDetail();
    setSelectedId(null);
  };

  const onOpenMap = (address: string) => {
    const url = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(address);
    window.open(url, '_blank');
  };

  return (
    <div className="h-screen flex flex-col">
      <Toolbar disabled={busy} onAddPerson={onAddPerson} onExportCsv={onExportCsv} onPrint={onPrint} onLayout={() => { /* layout handled by reactflow fit */ }} />
      <div className="flex flex-1 min-h-0">
        <div className="flex-1 min-w-0">
          <FamilyGraph nodes={nodes} edges={edges} onNodeSelect={setSelectedId} />
        </div>
        <PersonForm
          initial={detail?.persons.find(p => p.id === selectedId) ?? {}}
          onSave={onSave}
          onDelete={onDelete}
          onOpenMap={onOpenMap}
          extra={selectedId && detail ? (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold mt-4">関係</h3>
              <div className="flex gap-2">
                <select id="rel-target" className="border rounded px-2 py-1">
                  {detail.persons.filter(p => p.id !== selectedId).map(p => (
                    <option key={p.id} value={p.id}>{p.familyName} {p.givenName}</option>
                  ))}
                </select>
                <button className="border rounded px-2" onClick={() => {
                  const el = document.getElementById('rel-target') as HTMLSelectElement;
                  if (el?.value) addRelationship('parent_child', el.value, selectedId);
                }}>親→子 追加</button>
                <button className="border rounded px-2" onClick={() => {
                  const el = document.getElementById('rel-target') as HTMLSelectElement;
                  if (el?.value) addRelationship('spouse', selectedId, el.value);
                }}>配偶者 追加</button>
              </div>
              <ul className="text-sm list-disc ml-5">
                {detail.relationships.filter(r => r.fromId === selectedId || r.toId === selectedId).map(r => (
                  <li key={r.id}>
                    <span className="mr-2">{r.type}</span>
                    <button className="text-red-600 underline" onClick={() => removeRelationship(r.id)}>削除</button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        />
      </div>
    </div>
  );
}


