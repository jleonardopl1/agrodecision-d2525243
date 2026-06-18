import { useState } from 'react';
import { Leaf } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * Marca AD da AgroDecision. Em fundo CLARO usa a marca de "A" verde-campo
 * (mark-light.png); em fundo ESCURO, a de "A" branco (mark-dark.png) — garante
 * o contraste do "A" em qualquer barra. Fallback no monograma Leaf enquanto o
 * PNG não estiver em public/logos/. Suba mark-light.png e mark-dark.png pelo Lovable.
 */
export function BrandMark({ onDark = false, className }: { onDark?: boolean; className?: string }) {
  const [failed, setFailed] = useState(false);
  const src = onDark ? '/logos/mark-dark.png' : '/logos/mark-light.png';

  if (failed) {
    return (
      <span
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-lg',
          onDark ? 'bg-white/10 text-lima' : 'bg-campo text-white',
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
