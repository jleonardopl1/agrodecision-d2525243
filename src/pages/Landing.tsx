import { Link, Navigate } from 'react-router-dom';
import { Bell, Calculator, LineChart, Sparkles, Users } from 'lucide-react';

import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { BrandMark } from '@/components/BrandMark';
import { SinalCard } from '@/components/SinalCard';
import type { Cotacao, CustoProducao, SinalIA } from '@/hooks/use-market';

const FEATURES = [
  { Icon: Sparkles, titulo: 'Sinal de venda com IA', texto: 'VENDER, AGUARDAR ou ATENÇÃO — com o porquê em linguagem do campo, sem jargão.' },
  { Icon: Calculator, titulo: 'Margem real, não só preço', texto: 'Cadastre seu custo por saca e veja na hora quanto sobra em cada cotação.' },
  { Icon: Bell, titulo: 'Alertas que trabalham por você', texto: 'Me avise quando a soja chegar a R$ 135 — no app e no WhatsApp.' },
  { Icon: LineChart, titulo: 'Cotações e câmbio ao vivo', texto: 'CEPEA, B3 e dólar em uma tela só, atualizados ao longo do dia.' },
];

// Dados ilustrativos para o cartão-assinatura (SinalCard) no hero.
const mockCotacao = { preco: 128.5, unidade: 'R$/saca', variacao_pct: 1.2, fonte: 'cepea', capturado_em: new Date().toISOString() } as unknown as Cotacao;
const mockSinal = { sinal: 'VENDER', recomendacao: 'VENDER PARCIAL 30%', justificativa: 'A soja está 8% acima da média dos últimos 5 anos e o dólar está firme. Bom momento para fixar parte da produção.', confianca: 0.82 } as unknown as SinalIA;
const mockCusto = { custo_por_saca: 89.5, safra: '2025/26' } as unknown as CustoProducao;

export default function Landing() {
  const { session, loading } = useAuth();
  if (!loading && session) return <Navigate to='/app' replace />;

  return (
    <div className='min-h-screen bg-background text-foreground'>
      <header className='mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6'>
        <div className='flex items-center gap-2'>
          <BrandMark />
          <span className='font-display text-lg font-bold tracking-tight'>
            <span className='text-campo'>Agro</span><span className='text-campo-medio'>Decision</span>
          </span>
        </div>
        <div className='flex items-center gap-1 sm:gap-2'>
          <Button variant='ghost' asChild><Link to='/cooperativas'>Para cooperativas</Link></Button>
          <Button variant='ghost' asChild><Link to='/entrar'>Entrar</Link></Button>
          <Button asChild><Link to='/cadastro'>Criar conta</Link></Button>
        </div>
      </header>

      <main className='mx-auto w-full max-w-6xl px-6'>
        <section className='grid items-center gap-12 py-14 lg:grid-cols-[1.05fr_0.95fr]'>
          <div className='flex flex-col gap-6'>
            <h1 className='font-display text-4xl font-extrabold leading-[1.05] tracking-tight md:text-5xl'>
              Vender, aguardar ou prestar atenção? <span className='text-primary'>Saiba em 30 segundos.</span>
            </h1>
            <p className='max-w-xl text-lg leading-relaxed text-muted-foreground'>
              Preço, câmbio, custo e margem em uma tela — com um sinal claro de timing de venda para soja, milho, café, algodão e boi. Feito para o produtor, distribuído pela sua cooperativa.
            </p>
            <div className='flex flex-wrap gap-3'>
              <Button size='lg' asChild><Link to='/cadastro'>Começar grátis</Link></Button>
              <Button size='lg' variant='outline' asChild><Link to='/c/demo'>Ver portal de cooperativa</Link></Button>
            </div>
            <p className='flex items-center gap-2 text-sm text-muted-foreground'>
              <Users className='h-4 w-4' /> Sua cooperativa oferece o AgroDecision? Use o link dela para entrar já vinculado.
            </p>
          </div>

          <SinalCard destaque commodity='soja' cotacao={mockCotacao} sinal={mockSinal} custo={mockCusto} />
        </section>

        <section className='grid gap-4 pb-16 sm:grid-cols-2 lg:grid-cols-4'>
          {FEATURES.map(({ Icon, titulo, texto }) => (
            <Card key={titulo}>
              <CardContent className='space-y-2 p-5'>
                <span className='flex h-10 w-10 items-center justify-center rounded-md bg-secondary text-primary'><Icon className='h-5 w-5' /></span>
                <p className='font-semibold'>{titulo}</p>
                <p className='text-sm leading-relaxed text-muted-foreground'>{texto}</p>
              </CardContent>
            </Card>
          ))}
        </section>
      </main>

      <footer className='border-t py-6 text-center text-sm text-muted-foreground'>
        AgroDecision · inteligência de mercado para o produtor rural
      </footer>
    </div>
  );
}
