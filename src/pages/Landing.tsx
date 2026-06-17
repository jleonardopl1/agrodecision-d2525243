import { useEffect, useRef, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Leaf } from 'lucide-react';

import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SinalBadge } from '@/components/SinalBadge';

type CoopInfo = { name: string; region: string; cooperados: string; sede: string; color: string };

// Cores das cooperativas são dados de marca de terceiros (não fazem parte do nosso DS).
const COOPS: Record<string, CoopInfo> = {
  coopercitrus: { name: 'Coopercitrus', region: 'São Paulo', cooperados: '38.000+', sede: 'Bebedouro/SP', color: '#0066B3' },
  coamo: { name: 'Coamo', region: 'Paraná', cooperados: '32.000+', sede: 'Campo Mourão/PR', color: '#00843D' },
  integrada: { name: 'Integrada', region: 'Paraná', cooperados: '9.000+', sede: 'Londrina/PR', color: '#E31937' },
};

function Counter({ end, prefix = '', suffix = '', duration = 1800 }: { end: number; prefix?: string; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const [started, setStarted] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setStarted(true); }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  useEffect(() => {
    if (!started) return;
    let s = 0;
    const step = end / (duration / 16);
    const t = setInterval(() => { s += step; if (s >= end) { setCount(end); clearInterval(t); } else setCount(Math.floor(s)); }, 16);
    return () => clearInterval(t);
  }, [started, end, duration]);
  return <span ref={ref}>{prefix}{count.toLocaleString('pt-BR')}{suffix}</span>;
}

function Spark({ data, up }: { data: number[]; up: boolean }) {
  const mn = Math.min(...data);
  const mx = Math.max(...data);
  const r = mx - mn || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * 80},${24 - ((v - mn) / r) * 21 - 1.5}`).join(' ');
  return (
    <svg width={80} height={24} viewBox='0 0 80 24' className='block'>
      <polyline points={pts} fill='none' stroke={up ? 'hsl(var(--sinal-vender))' : 'hsl(var(--destructive))'} strokeWidth='1.5' strokeLinecap='round' />
    </svg>
  );
}

function DashboardPreview() {
  const commodities = [
    { name: 'Soja', price: 'R$ 139,80', pct: '+1,70%', up: true, sinal: 'VENDER', data: [128, 131, 133, 135, 134, 137, 136, 139, 138, 139.8] },
    { name: 'Milho', price: 'R$ 72,50', pct: '-1,16%', up: false, sinal: 'AGUARDAR', data: [70, 72, 74, 73, 75, 74, 73, 74, 73, 72.5] },
    { name: 'Café', price: 'R$ 1.420', pct: '+2,53%', up: true, sinal: 'VENDER', data: [1300, 1330, 1350, 1370, 1380, 1390, 1400, 1390, 1410, 1420] },
    { name: 'Boi', price: 'R$ 312,50', pct: '+1,56%', up: true, sinal: 'VENDER', data: [298, 302, 304, 306, 305, 307, 308, 309, 310, 312.5] },
  ];
  return (
    <Card className='border-border/60 shadow-xl'>
      <CardContent className='space-y-4 p-5'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <span className='flex h-7 w-7 items-center justify-center rounded-md bg-campo text-white'><Leaf className='h-4 w-4' /></span>
            <div>
              <p className='text-sm font-bold leading-none'>AgroDecision</p>
              <p className='text-[10px] uppercase tracking-wide text-muted-foreground'>Coopercitrus</p>
            </div>
          </div>
          <div className='flex gap-1'>
            {['Hoje', 'Simulador', 'Alertas'].map((t, i) => (
              <span key={t} className={cn('rounded-md px-2 py-1 text-[10px] font-medium', i === 0 ? 'bg-campo text-white' : 'text-muted-foreground')}>{t}</span>
            ))}
          </div>
        </div>

        <div className='rounded-lg border border-campo/15 bg-campo-claro p-4'>
          <p className='text-[10px] font-semibold uppercase tracking-wide text-muted-foreground'>Sinal IA — Soja</p>
          <div className='mt-1.5'><SinalBadge sinal='VENDER' size='lg' /></div>
          <p className='mt-2 text-xs text-muted-foreground'>Preço 8% acima da média sazonal. Fundos reduzindo posição comprada. Fixe 30% da produção.</p>
        </div>

        <div className='grid grid-cols-2 gap-3'>
          {commodities.map((c) => (
            <div key={c.name} className='rounded-lg border border-border bg-card p-3'>
              <div class‑Name='' className='flex items-start justify-between'>
                <div>
                  <p className='text-[10px] font-semibold uppercase tracking-wide text-muted-foreground'>{c.name}</p>
                  <p className='text-base font-bold'>{c.price}</p>
                </div>
                <SinalBadge sinal={c.sinal} />
              </div>
              <div className='mt-2 flex items-end justify-between'>
                <Spark data={c.data} up={c.up} />
                <span className={cn('text-xs font-semibold', c.up ? 'text-sinal-vender' : 'text-destructive')}>{c.pct}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function Eyebrow({ children, tone = 'campo' }: { children: React.ReactNode; tone?: 'campo' | 'colheita' }) {
  return <p className={cn('text-xs font-bold uppercase tracking-widest', tone === 'campo' ? 'text-campo' : 'text-colheita')}>{children}</p>;
}

export default function Landing() {
  const { session, loading } = useAuth();
  const [activeCoop, setActiveCoop] = useState<string>('coopercitrus');
  const [formData, setFormData] = useState<Record<'nome' | 'cargo' | 'cooperativa' | 'email' | 'telefone', string>>({ nome: '', cargo: '', cooperativa: '', email: '', telefone: '' });
  const [submitted, setSubmitted] = useState(false);

  if (!loading && session) return <Navigate to='/app' replace />;

  const coop = COOPS[activeCoop];
  const formFields: { key: 'nome' | 'cargo' | 'cooperativa' | 'email' | 'telefone'; label: string; placeholder: string; type: string }[] = [
    { key: 'nome', label: 'Seu nome', placeholder: 'João Silva', type: 'text' },
    { key: 'cargo', label: 'Cargo', placeholder: 'Diretor de TI / Gerente de Negócios', type: 'text' },
    { key: 'cooperativa', label: 'Cooperativa', placeholder: 'Nome da cooperativa', type: 'text' },
    { key: 'email', label: 'Email corporativo', placeholder: 'joao@cooperativa.com.br', type: 'email' },
    { key: 'telefone', label: 'WhatsApp', placeholder: '(XX) 9XXXX-XXXX', type: 'tel' },
  ];

  return (
    <div className='bg-background text-foreground'>
      {/* HERO */}
      <section className='relative overflow-hidden bg-campo text-white'>
        <div className='mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6'>
          <nav className='flex items-center justify-between py-6'>
            <div className='flex items-center gap-3'>
              <span className='flex h-10 w-10 items-center justify-center rounded-xl bg-white/10'><Leaf className='h-5 w-5 text-colheita' /></span>
              <div>
                <p className='text-lg font-extrabold leading-none tracking-tight'>AgroDecision</p>
                <p className='text-[10px] uppercase tracking-widest text-white/50'>Inteligência de mercado</p>
              </div>
            </div>
            <div className='flex items-center gap-4'>
              <Link to='/entrar' className='text-sm font-semibold text-white/70 transition-colors hover:text-white'>Entrar</Link>
              <Button asChild className='bg-colheita text-accent-foreground hover:bg-colheita/90'><a href='#agendar'>Agendar Demonstração</a></Button>
            </div>
          </nav>

          <div className='grid flex-1 items-center gap-12 py-12 lg:grid-cols-2'>
            <div>
              <span className='inline-flex items-center gap-2 rounded-full border border-colheita/30 bg-colheita/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-colheita'>
                <span className='h-1.5 w-1.5 animate-pulse rounded-full bg-colheita' /> Piloto Gratuito — 90 dias
              </span>
              <h1 className='mt-7 text-4xl font-extrabold leading-tight tracking-tight md:text-6xl'>
                Seu cooperado usa <span className='text-white/40'>WhatsApp</span> para cotação. <span className='text-colheita'>Nós entregamos isso com IA.</span>
              </h1>
              <p className='mt-6 max-w-md text-lg leading-relaxed text-white/60'>
                Dashboard de preços, câmbio, margem e recomendações de venda por inteligência artificial — no app da sua cooperativa, em 4 semanas. <strong className='font-semibold text-white/90'>Piloto gratuito por 90 dias.</strong>
              </p>
              <div className='mt-8 flex flex-wrap gap-3'>
                <Button asChild size='lg' className='bg-colheita text-accent-foreground hover:bg-colheita/90'><a href='#agendar'>Agendar Demonstração →</a></Button>
                <Button asChild size='lg' variant='outline' className='border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white'><a href='#como-funciona'>Como funciona</a></Button>
              </div>
              <div className='mt-12 grid grid-cols-3 gap-6 border-t border-white/10 pt-7'>
                {[{ n: 'R$ 160k–300k', s: 'margem recuperada/ano por produtor' }, { n: '< 30s', s: 'para a primeira decisão informada' }, { n: '5', s: 'commodities monitoradas com IA' }].map((x) => (
                  <div key={x.s}>
                    <p className='text-xl font-extrabold text-colheita'>{x.n}</p>
                    <p className='mt-1 text-[11px] leading-snug text-white/50'>{x.s}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className='lg:pl-6'>
              <DashboardPreview />
              <p className='mt-3 text-center text-[11px] text-white/40'>Dashboard real · dados atualizados a cada 15 min</p>
            </div>
          </div>
        </div>
      </section>

      {/* PROBLEMA */}
      <section id='como-funciona' className='bg-muted/30 py-24'>
        <div className='mx-auto w-full max-w-5xl px-6'>
          <div className='mx-auto max-w-2xl text-center'>
            <Eyebrow tone='colheita'>O problema</Eyebrow>
            <h2 className='mt-3 text-3xl font-extrabold tracking-tight md:text-4xl'>Produtores perdem <span className='text-destructive'>8–15% de margem</span> por decisões no instinto.</h2>
            <p className='mt-4 text-muted-foreground'>Em uma safra de R$ 2 milhões, são R$ 160k–300k de valor destruído por falta de informação integrada. (Conab, 2024)</p>
          </div>
          <div className='mt-14 grid gap-5 md:grid-cols-3'>
            {[{ icon: '📱', title: 'WhatsApp como fonte', desc: 'Cotações espalhadas em grupos, sem padronização, sem histórico, sem contexto de decisão.' }, { icon: '📊', title: 'Planilhas desconexas', desc: 'Cada produtor mantém a sua. Sem câmbio, sem margem automática, sem alertas.' }, { icon: '🎯', title: 'Timing por instinto', desc: 'Quando vender? Quando travar câmbio? Sem dados consolidados, a decisão é emocional.' }].map((p) => (
              <Card key={p.title}>
                <CardContent className='space-y-2 p-6'>
                  <div className='flex items-center justify-between'>
                    <span className='text-3xl'>{p.icon}</span>
                    <Badge variant='destructive' className='bg-destructive/10 text-destructive hover:bg-destructive/10'>Hoje</Badge>
                  </div>
                  <h3 className='pt-1 font-bold'>{p.title}</h3>
                  <p className='text-sm text-muted-foreground'>{p.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* SOLUÇÃO */}
      <section className='py-24'>
        <div className='mx-auto w-full max-w-5xl px-6'>
          <div className='mx-auto max-w-2xl text-center'>
            <Eyebrow>A solução</Eyebrow>
            <h2 className='mt-3 text-3xl font-extrabold tracking-tight md:text-4xl'>Um dashboard. 30 segundos. <span className='text-campo'>Decisão informada.</span></h2>
          </div>
          <div className='mt-14 grid gap-4 md:grid-cols-2'>
            {[{ icon: '📊', title: 'Dashboard Integrado', desc: 'Soja, milho, café, algodão, boi — preço, variação e tendência numa tela.', tag: 'F01' }, { icon: '🤖', title: 'Sinal de IA', desc: 'VENDER, AGUARDAR ou ATENÇÃO com justificativa em linguagem do campo.', tag: 'F06' }, { icon: '🧮', title: 'Calculadora de Margem', desc: 'Quanto sobra se eu vender hoje? Com break-even automático.', tag: 'F03' }, { icon: '⚡', title: 'Alertas por WhatsApp', desc: 'Aviso quando preço, margem ou sinal de IA atingir seu alvo.', tag: 'F04' }, { icon: '💱', title: 'Câmbio + Impacto', desc: 'USD/BRL em tempo real com impacto automático no preço da soja.', tag: 'F05' }, { icon: '📄', title: 'Relatório Semanal', desc: 'PDF toda segunda com resumo de preços, sinais e ações.', tag: 'F08' }].map((f) => (
              <Card key={f.title}>
                <CardContent className='flex items-start gap-4 p-6'>
                  <span className='text-2xl'>{f.icon}</span>
                  <div>
                    <div className='flex items-center gap-2'>
                      <h3 className='font-bold'>{f.title}</h3>
                      <Badge variant='secondary' className='bg-campo/10 text-campo hover:bg-campo/10'>{f.tag}</Badge>
                    </div>
                    <p className='mt-1 text-sm text-muted-foreground'>{f.desc}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* PITCH COOPERATIVA */}
      <section className='bg-campo py-24 text-white'>
        <div className='mx-auto w-full max-w-4xl px-6 text-center'>
          <Eyebrow tone='colheita'>Proposta para sua cooperativa</Eyebrow>
          <h2 className='mt-4 text-3xl font-extrabold tracking-tight md:text-4xl'>Não vendemos software para o produtor. Vendemos <span className='text-colheita'>diferenciação competitiva</span> para você.</h2>
          <p className='mx-auto mt-5 max-w-2xl text-white/60'>Enquanto outras cooperativas oferecem o mesmo de sempre, vocês passam a oferecer inteligência de mercado com IA como benefício exclusivo — fideliza o cooperado e reduz evasão para tradings.</p>
          <div className='mt-12 grid grid-cols-2 gap-4 md:grid-cols-4'>
            {[{ n: <Counter end={8} suffix='–15%' />, l: 'de margem recuperada' }, { n: <Counter end={4} suffix=' sem' />, l: 'para implementar' }, { n: <Counter end={90} suffix=' dias' />, l: 'piloto gratuito' }, { n: <Counter end={0} prefix='R$ ' />, l: 'custo no piloto' }].map((s, i) => (
              <div key={i} className='rounded-xl border border-white/10 bg-white/5 p-6'>
                <p className='text-2xl font-extrabold text-colheita'>{s.n}</p>
                <p className='mt-1 text-xs text-white/60'>{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CO-BRANDING */}
      <section className='bg-muted/30 py-24'>
        <div className='mx-auto w-full max-w-3xl px-6'>
          <div className='text-center'>
            <Eyebrow>Co-branding</Eyebrow>
            <h2 className='mt-3 text-3xl font-extrabold tracking-tight md:text-4xl'>Sua marca. Nossa tecnologia.</h2>
            <p className='mx-auto mt-3 max-w-md text-muted-foreground'>O cooperado vê a marca da cooperativa — logo, cores e link personalizados.</p>
          </div>
          <div className='mt-8 flex flex-wrap justify-center gap-2'>
            {Object.entries(COOPS).map(([key, c]) => (
              <Button key={key} variant={activeCoop === key ? 'default' : 'outline'} size='sm' onClick={() => setActiveCoop(key)}>{c.name}</Button>
            ))}
          </div>
          <Card className='mx-auto mt-8 max-w-xl overflow-hidden'>
            <div className='flex items-center gap-3 p-5 text-white' style={{ backgroundColor: coop.color }}>
              <span className='flex h-9 w-9 items-center justify-center rounded-lg bg-white/20 font-extrabold'>{coop.name.charAt(0)}</span>
              <div>
                <p className='font-bold leading-none'>{coop.name}</p>
                <p className='text-[10px] uppercase tracking-wide text-white/70'>powered by AgroDecision</p>
              </div>
            </div>
            <CardContent className='grid grid-cols-3 gap-3 p-5'>
              {[{ l: 'Cooperados', v: coop.cooperados }, { l: 'Região', v: coop.region }, { l: 'Sede', v: coop.sede }].map((s) => (
                <div key={s.l} className='rounded-lg bg-muted/50 p-4 text-center'>
                  <p className='font-bold'>{s.v}</p>
                  <p className='text-[10px] uppercase tracking-wide text-muted-foreground'>{s.l}</p>
                </div>
              ))}
            </CardContent>
            <div className='px-5 pb-5'>
              <div className='rounded-lg border border-border bg-muted/30 p-3 text-center text-sm text-muted-foreground'>URL exclusiva: <strong className='text-campo'>agrodecision.com.br/{activeCoop}</strong></div>
            </div>
          </Card>
        </div>
      </section>

      {/* PLANOS */}
      <section className='py-24'>
        <div className='mx-auto w-full max-w-5xl px-6'>
          <div className='text-center'>
            <Eyebrow>Investimento</Eyebrow>
            <h2 className='mt-3 text-3xl font-extrabold tracking-tight md:text-4xl'>Comece com zero risco.</h2>
          </div>
          <div className='mt-12 grid gap-5 md:grid-cols-3'>
            {[{ plan: 'Piloto', price: 'Grátis', period: '90 dias', features: ['Até 500 cooperados', 'Dashboard completo', 'Sinais de IA', 'Alertas push', 'Relatórios semanais', 'Co-branding completo'], highlight: true, cta: 'Solicitar Piloto' }, { plan: 'Starter', price: 'R$ 1.500', period: '/mês', features: ['Até 500 cooperados', 'Tudo do Piloto', 'Portal admin', 'Relatórios mensais', 'Suporte email'], highlight: false, cta: 'Após o piloto' }, { plan: 'Pro', price: 'R$ 3.500', period: '/mês', features: ['Até 2.000 cooperados', 'Tudo do Starter', 'API básica', 'Suporte prioritário', 'Revenue share 20%'], highlight: false, cta: 'Após o piloto' }].map((p) => (
              <Card key={p.plan} className={cn('relative', p.highlight && 'border-colheita/40 bg-campo text-white shadow-lg')}>
                {p.highlight ? <Badge className='absolute -top-2.5 left-1/2 -translate-x-1/2 bg-colheita text-accent-foreground hover:bg-colheita'>Recomendado</Badge> : null}
                <CardContent className='p-6'>
                  <p className={cn('text-xs font-bold uppercase tracking-wide', p.highlight ? 'text-white/60' : 'text-muted-foreground')}>{p.plan}</p>
                  <p className='mt-2 text-3xl font-extrabold'>{p.price}<span className={cn('text-sm font-medium', p.highlight ? 'text-white/50' : 'text-muted-foreground')}>{p.period}</span></p>
                  <ul className='mt-5 space-y-2'>
                    {p.features.map((f) => (
                      <li key={f} className={cn('flex items-center gap-2 text-sm', p.highlight ? 'text-white/80' : 'text-muted-foreground')}><span className={p.highlight ? 'text-colheita' : 'text-campo'}>✓</span> {f}</li>
                    ))}
                  </ul>
                  <Button asChild className={cn('mt-6 w-full', p.highlight ? 'bg-colheita text-accent-foreground hover:bg-colheita/90' : '')} variant={p.highlight ? 'default' : 'outline'}><a href='#agendar'>{p.cta}</a></Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FORM */}
      <section id='agendar' className='bg-campo py-24 text-white'>
        <div className='mx-auto w-full max-w-lg px-6'>
          <div className='text-center'>
            <Eyebrow tone='colheita'>Agendar demonstração</Eyebrow>
            <h2 className='mt-3 text-3xl font-extrabold tracking-tight md:text-4xl'>Vamos mostrar o dashboard com os dados da sua cooperativa.</h2>
            <p className='mt-3 text-sm text-white/50'>Demonstração de 20 min. Sem compromisso.</p>
          </div>
          {submitted ? (
            <Card className='mt-8 text-center'><CardContent className='space-y-2 p-8'><div className='text-4xl'>✅</div><h3 className='text-lg font-bold'>Recebemos seu contato!</h3><p className='text-sm text-muted-foreground'>Nosso time entra em contato em até 24h para agendar.</p></CardContent></Card>
          ) : (
            <Card className='mt-8'>
              <CardContent className='space-y-4 p-6'>
                {formFields.map((f) => (
                  <div key={f.key} className='space-y-1.5'>
                    <Label htmlFor={`f-${f.key}`}>{f.label}</Label>
                    <Input id={`f-${f.key}`} type={f.type} placeholder={f.placeholder} value={formData[f.key]} onChange={(e) => setFormData((p) => ({ ...p, [f.key]: e.target.value }))} />
                  </div>
                ))}
                <Button onClick={() => setSubmitted(true)} className='w-full bg-colheita text-accent-foreground hover:bg-colheita/90' size='lg'>Solicitar Demonstração Gratuita →</Button>
                <p className='text-center text-xs text-muted-foreground'>Respondemos em até 24h. Sem spam.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      <footer className='bg-campo py-8 text-center text-white/50'>
        <div className='flex items-center justify-center gap-2'><Leaf className='h-4 w-4 text-colheita' /><span className='font-bold text-white/70'>AgroDecision</span></div>
        <p className='mt-2 text-xs'>Yamazing Corp © 2026 · Dados: CEPEA / B3 / BCB · IA: Claude by Anthropic</p>
      </footer>
    </div>
  );
}
