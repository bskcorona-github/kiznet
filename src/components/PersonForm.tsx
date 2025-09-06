"use client";
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from './ui/Button';

const emptyToUndefined = (v: unknown) => (v === '' ? undefined : v);

const schema = z.object({
  familyName: z.preprocess(emptyToUndefined, z.string().min(1, '必須').optional()),
  givenName: z.preprocess(emptyToUndefined, z.string().min(1, '必須').optional()),
  kana: z.preprocess(emptyToUndefined, z.string().optional()),
  gender: z.enum(['male','female','other','unknown']).default('unknown'),
  birthDate: z.preprocess(emptyToUndefined, z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
  deathDate: z.preprocess(emptyToUndefined, z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
  address: z.preprocess(emptyToUndefined, z.string().optional()),
  phone: z.preprocess(emptyToUndefined, z.string().optional()),
  email: z.preprocess(emptyToUndefined, z.string().email().optional()),
  notes: z.preprocess(emptyToUndefined, z.string().optional()),
}).refine((v) => {
  return (v.familyName && v.familyName.length > 0) || (v.givenName && v.givenName.length > 0);
}, { message: '姓か名のどちらかは必須', path: ['familyName'] });

type FormValues = z.infer<typeof schema>;

export function PersonForm({ initial, onSave, onDelete, onOpenMap, extra }: {
  initial: Partial<FormValues>;
  onSave: (values: FormValues) => void;
  onDelete: () => void;
  onOpenMap: (address: string) => void;
  extra?: React.ReactNode;
}) {
  const { register, handleSubmit, formState: { errors }, watch, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: initial as any,
    shouldUnregister: false,
    shouldFocusError: false,
  });
  const address = watch('address') ?? '';

  useEffect(() => {
    reset(initial as any);
  }, [initial, reset]);

  return (
    <div className="no-print w-96 shrink-0 border-l p-3 space-y-3">
      <form noValidate onSubmit={handleSubmit(onSave)} className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-neutral-600">姓</label>
            <input className="w-full border rounded px-2 py-1" {...register('familyName')} />
            {errors.familyName && <p className="text-red-600 text-xs">{errors.familyName.message}</p>}
          </div>
          <div>
            <label className="block text-xs text-neutral-600">名</label>
            <input className="w-full border rounded px-2 py-1" {...register('givenName')} />
            {errors.givenName && <p className="text-red-600 text-xs">{errors.givenName.message}</p>}
          </div>
        </div>
        <div>
          <label className="block text-xs text-neutral-600">ふりがな</label>
          <input className="w-full border rounded px-2 py-1" {...register('kana')} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-neutral-600">性別</label>
            <select className="w-full border rounded px-2 py-1" {...register('gender')}>
              <option value="unknown">不明</option>
              <option value="male">男性</option>
              <option value="female">女性</option>
              <option value="other">その他</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-neutral-600">電話</label>
            <input className="w-full border rounded px-2 py-1" {...register('phone')} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-neutral-600">生年月日</label>
            <input type="date" placeholder="YYYY-MM-DD（未入力可）" className="w-full border rounded px-2 py-1" {...register('birthDate')} />
          </div>
          <div>
            <label className="block text-xs text-neutral-600">没年月日</label>
            <input type="date" placeholder="YYYY-MM-DD（未入力可）" className="w-full border rounded px-2 py-1" {...register('deathDate')} />
          </div>
        </div>
        <div>
          <label className="block text-xs text-neutral-600">住所</label>
          <input className="w-full border rounded px-2 py-1" {...register('address')} />
        </div>
        <div>
          <label className="block text-xs text-neutral-600">メール</label>
          <input className="w-full border rounded px-2 py-1" {...register('email')} />
        </div>
        <div>
          <label className="block text-xs text-neutral-600">メモ</label>
          <textarea className="w-full border rounded px-2 py-1" rows={4} {...register('notes')} />
        </div>
        <div className="flex gap-2">
          <Button type="submit">保存</Button>
          <Button type="button" variant="secondary" onClick={() => { if (address) onOpenMap(address); }}>地図で開く</Button>
          <Button type="button" variant="outline" onClick={onDelete}>削除</Button>
        </div>
      </form>
      {extra}
    </div>
  );
}


