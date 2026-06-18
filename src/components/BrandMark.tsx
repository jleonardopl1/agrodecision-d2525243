import { useState } from 'react';
import { Leaf } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * Marca AD da AgroDecision. Usa o PNG oficial em /public/logos quando presente;
 * se o arquivo ainda não foi subido, cai no monograma Leaf (mesma identidade),
 * para nada quebrar. Suba mark-dark.png (fundo claro) e mark-light.png (fundo
 * escuro) em public/logos/ pelo Lovable.
 */
export function BrandMark({ variant = 'dark', className }: { variant?: 'dark' | 'light'; className?: string }) {
  const [failed, setFailed] = useState(false);
  const src = variant === 'light' ? '/logos/mark-light.png' : '/logos/mark-dark.png';

  if (failed) {
    return (
      <span
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-lg',
          variant === 'light' ? 'bg-white/10 text-lima' : 'bg-campo text-white',
          className,
        )}
      >
        <Leaf className='h-4 w-4' />
      </span>
    );
  }

  return (
    <img
      src={src}
      alt='AgroDecision'
      onError={() => setFailed(true)}
      className={cn('h-8 w-auto', className)}
    />
  );
}
