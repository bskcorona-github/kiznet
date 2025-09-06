"use client";
import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

async function createTree(title: string) {
  const res = await fetch('/api/trees', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title }) });
  if (!res.ok) throw new Error('failed');
  return res.json();
}

export default function Home() {
  const [title, setTitle] = useState('新しい家系図');
  const [trees, setTrees] = useState<{ id: string; title: string; createdAt: string }[]>([]);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    (async () => {
      const res = await fetch('/api/trees');
      const data = await res.json();
      setTrees(data);
    })();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">kiznet ダッシュボード</h1>
      <div className="no-print mb-4 flex gap-2 items-center">
        <input className="border rounded px-2 py-1" value={title} onChange={e => setTitle(e.target.value)} placeholder="タイトル" />
        <Button onClick={async () => {
          try {
            setLoading(true);
            const t = await createTree(title.trim() || '新しい家系図');
            setTrees(prev => [t, ...prev]);
          } finally {
            setLoading(false);
          }
        }} disabled={loading}>新規作成</Button>
      </div>
      <table className="w-full border text-sm">
        <thead className="bg-neutral-50">
          <tr>
            <th className="p-2 text-left">タイトル</th>
            <th className="p-2 text-left">作成日</th>
            <th className="p-2">操作</th>
          </tr>
        </thead>
        <tbody>
          {trees.map(t => (
            <tr key={t.id} className="border-t">
              <td className="p-2">{t.title}</td>
              <td className="p-2">{new Date(t.createdAt).toLocaleString()}</td>
              <td className="p-2 text-right">
                <Link href={`/trees/${t.id}`} className="underline mr-3">開く</Link>
                <button className="text-red-600 underline" onClick={async () => {
                  await fetch(`/api/trees/${t.id}`, { method: 'DELETE' });
                  setTrees(prev => prev.filter(x => x.id !== t.id));
                }}>削除</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
