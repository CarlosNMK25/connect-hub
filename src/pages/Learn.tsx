import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, BookOpen, ChevronRight, GraduationCap } from 'lucide-react';
import { MANUALS, loadManualContent, type ManualMeta } from '../content/learn/index';

/* ── Minimal Markdown renderer (no extra deps) ── */
function renderMarkdown(md: string): string {
  return md
    // Code blocks
    .replace(/```([\s\S]*?)```/g, '<pre class="learn-code-block"><code>$1</code></pre>')
    // Tables
    .replace(/^(\|.+\|)\n(\|[\s:-]+\|)\n((?:\|.+\|\n?)*)/gm, (_match, header: string, _sep: string, body: string) => {
      const ths = header.split('|').filter(Boolean).map((h: string) => `<th>${h.trim()}</th>`).join('');
      const rows = body.trim().split('\n').map((row: string) => {
        const tds = row.split('|').filter(Boolean).map((c: string) => `<td>${c.trim()}</td>`).join('');
        return `<tr>${tds}</tr>`;
      }).join('');
      return `<table class="learn-table"><thead><tr>${ths}</tr></thead><tbody>${rows}</tbody></table>`;
    })
    // Blockquotes
    .replace(/^> (.+)$/gm, '<blockquote class="learn-blockquote">$1</blockquote>')
    // Headers
    .replace(/^### (.+)$/gm, '<h3 class="learn-h3">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="learn-h2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="learn-h1">$1</h1>')
    // HR
    .replace(/^---$/gm, '<hr class="learn-hr" />')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Ordered lists
    .replace(/^\d+\. (.+)$/gm, '<li class="learn-li-ordered">$1</li>')
    // Unordered lists
    .replace(/^- (.+)$/gm, '<li class="learn-li">$1</li>')
    // Paragraphs (lines that aren't already tags)
    .replace(/^(?!<[a-z])((?!^\s*$).+)$/gm, (line) => {
      if (line.startsWith('<')) return line;
      return `<p class="learn-p">${line}</p>`;
    });
}

/* ── Manual Reader ── */
const ManualReader: React.FC<{ manual: ManualMeta; onBack: () => void }> = ({ manual, onBack }) => {
  const [content, setContent] = useState<string | null>(null);

  useEffect(() => {
    loadManualContent(manual.fileName).then(setContent);
  }, [manual.fileName]);

  return (
    <div className="min-h-screen bg-white">
      {/* Top bar */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-black/5">
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center gap-4">
          <button onClick={onBack} className="flex items-center gap-2 text-idm-muted hover:text-idm-ink transition-colors text-xs font-mono uppercase tracking-widest">
            <ArrowLeft size={14} />
            Índice
          </button>
          <span className="text-black/10">|</span>
          <span className="text-[9px] font-mono text-idm-muted uppercase tracking-widest">
            Sesión {manual.session} — {manual.title}
          </span>
        </div>
      </div>

      {/* Content */}
      <article className="max-w-3xl mx-auto px-6 py-12">
        {content === null ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-6 h-6 border-2 border-system-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div
            className="learn-content"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
          />
        )}
      </article>
    </div>
  );
};

/* ── Manual Index ── */
const ManualIndex: React.FC<{ onSelect: (m: ManualMeta) => void; onBack: () => void }> = ({ onSelect, onBack }) => (
  <div className="min-h-screen bg-white">
    {/* Header */}
    <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-black/5">
      <div className="max-w-3xl mx-auto px-6 py-3 flex items-center gap-4">
        <button onClick={onBack} className="flex items-center gap-2 text-idm-muted hover:text-idm-ink transition-colors text-xs font-mono uppercase tracking-widest">
          <ArrowLeft size={14} />
          Sequencer
        </button>
      </div>
    </div>

    <div className="max-w-3xl mx-auto px-6 py-12">
      <div className="mb-12">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2.5 bg-system-accent/10 rounded-xl">
            <GraduationCap size={22} className="text-system-accent" />
          </div>
          <h1 className="text-2xl font-mono font-bold tracking-tighter uppercase text-idm-ink">
            Cuaderno de Aprendizaje
          </h1>
        </div>
        <p className="text-xs font-mono text-idm-muted uppercase tracking-widest max-w-lg">
          Guías paso a paso para entender y dominar el Euclidean IDM Machine. Cada sesión construye sobre la anterior.
        </p>
      </div>

      <div className="space-y-3">
        {MANUALS.map((m) => (
          <button
            key={m.id}
            onClick={() => onSelect(m)}
            className="w-full text-left group border border-black/5 rounded-xl p-5 hover:border-system-accent/30 hover:bg-system-accent/[0.02] transition-all duration-300"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1.5">
                  <span className="text-[9px] font-mono font-bold text-system-accent bg-system-accent/10 px-2 py-0.5 rounded-full uppercase tracking-widest">
                    Sesión {m.session}
                  </span>
                  <div className="flex items-center gap-1.5 text-idm-muted">
                    <Clock size={10} />
                    <span className="text-[9px] font-mono uppercase tracking-wider">{m.duration}</span>
                  </div>
                </div>
                <h2 className="text-sm font-mono font-bold text-idm-ink uppercase tracking-tight mb-1 group-hover:text-system-accent transition-colors">
                  {m.title}
                </h2>
                <p className="text-[10px] font-mono text-idm-muted leading-relaxed">
                  {m.description}
                </p>
                <div className="mt-2 flex items-center gap-1.5 text-[8px] font-mono text-idm-muted/60 uppercase tracking-widest">
                  <BookOpen size={9} />
                  Prerrequisito: {m.prerequisite}
                </div>
              </div>
              <ChevronRight size={16} className="text-idm-muted/30 group-hover:text-system-accent transition-colors mt-1 flex-shrink-0" />
            </div>
          </button>
        ))}

        {/* Placeholder for future sessions */}
        {MANUALS.length < 12 && (
          <div className="border border-dashed border-black/10 rounded-xl p-5 text-center">
            <p className="text-[9px] font-mono text-idm-muted/50 uppercase tracking-widest">
              Más sesiones próximamente
            </p>
          </div>
        )}
      </div>
    </div>
  </div>
);

/* ── Main Learn Page ── */
const LearnPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const activeSlug = searchParams.get('s');
  const activeManual = activeSlug ? MANUALS.find(m => m.slug === activeSlug) : null;

  return activeManual ? (
    <ManualReader manual={activeManual} onBack={() => setSearchParams({})} />
  ) : (
    <ManualIndex
      onSelect={(m) => setSearchParams({ s: m.slug })}
      onBack={() => navigate('/')}
    />
  );
};

export default LearnPage;
