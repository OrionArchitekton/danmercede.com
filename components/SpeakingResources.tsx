import { Download, ExternalLink, Mail } from 'lucide-react';
import { trackEvent } from '../analytics/gaConfig';
import { SPEAKING, SPEAKING_CONTACT, SPEAKING_ONE_SHEET_PATH, UPCOMING_SPEAKING, contactHref } from '../constants';

// Three of the four sessions in docs/one-sheets/speaking-one-sheet.html.
const topics = [
  { title: 'Who owns the workflow?', detail: 'Five tests for deciding when a team can depend on an AI pilot.' },
  { title: 'Fail closed by default', detail: 'How to test the gate that decides whether AI-written code can merge.' },
  { title: "Don't flatten the tree", detail: 'How to preserve the branches of a conversation in a knowledge graph.' },
];

export function SpeakingResources() {
  return (
    <section id="speaking" aria-labelledby="speaking-heading" className="scroll-mt-24">
      <h2 id="speaking-heading" className="mb-5 text-3xl font-bold text-white">Speaking &amp; workshops</h2>
      <div className="mb-6 overflow-hidden rounded-lg border border-white/10 bg-navy-deep">
        <picture>
          <source type="image/webp" srcSet="/dan-mercede-executive-relaxed.webp" />
          <img src="/dan-mercede-executive-relaxed.png" alt="Dan Mercede outside an office entrance"
            width="2048" height="1638" loading="lazy" decoding="async"
            className="aspect-[2/1] w-full object-cover object-[50%_14%]" />
        </picture>
        <div className="p-6 lg:p-8">
          <h3 className="mb-4 text-xl font-semibold text-white">Talk topics</h3>
          <dl className="space-y-4">
            {topics.map(({ title, detail }) => (
              <div key={title}>
                <dt className="font-semibold text-slate-200">{title}</dt>
                <dd className="mt-0.5 text-sm leading-relaxed text-slate-400">{detail}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/10 pt-4">
            <a href={contactHref(SPEAKING_CONTACT)}
              onClick={() => trackEvent(window, 'generate_lead', { method: 'email', intent: 'speaking' })}
              className="inline-flex min-h-11 items-center gap-2 rounded-sm bg-copper-500 px-4 text-sm font-semibold text-slate-950 hover:bg-copper-400">
              <Mail size={16} aria-hidden="true" /> Invite Dan to speak
            </a>
            <a href={SPEAKING_ONE_SHEET_PATH} download
              className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-copper-400 hover:text-copper-300">
              <Download size={16} aria-hidden="true" /> Download speaking one-sheet
            </a>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex flex-col p-8 rounded-lg border border-copper-500/30 bg-navy-deep/80">
          <p className="text-copper-400 font-mono text-xs uppercase tracking-widest mb-3">{UPCOMING_SPEAKING.label}</p>
          <h3 className="text-2xl font-bold text-white mb-2">{UPCOMING_SPEAKING.event}</h3>
          <p className="text-slate-300 font-mono text-xs mb-4">
            {UPCOMING_SPEAKING.date} · {UPCOMING_SPEAKING.time} · {UPCOMING_SPEAKING.format} · {UPCOMING_SPEAKING.location}
          </p>
          <p className="text-slate-200 italic mb-3">"{UPCOMING_SPEAKING.title}"</p>
          <p className="text-slate-400 text-sm leading-relaxed grow mb-6">{UPCOMING_SPEAKING.detail}</p>
          <a
            href={UPCOMING_SPEAKING.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-copper-400 text-sm font-semibold tracking-wider uppercase hover:text-copper-300 transition-colors inline-flex items-center"
          >
            {UPCOMING_SPEAKING.cta} <ExternalLink className="w-4 h-4 ml-2" aria-hidden="true" />
          </a>
        </div>

        <div className="flex flex-col p-8 rounded-lg border border-white/10 bg-navy-deep/60">
          <p className="text-slate-400 font-mono text-xs uppercase tracking-widest mb-3">{SPEAKING.label}</p>
          <h3 className="text-2xl font-bold text-white mb-2">{SPEAKING.event}</h3>
          <p className="text-copper-400 font-mono text-xs mb-4">{SPEAKING.date}</p>
          <p className="text-slate-200 italic mb-3">"{SPEAKING.title}"</p>
          <p className="text-slate-400 text-sm leading-relaxed grow mb-6">{SPEAKING.detail}</p>
          <a
            href={SPEAKING.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-copper-400 text-sm font-semibold tracking-wider uppercase hover:text-copper-300 transition-colors inline-flex items-center"
          >
            {SPEAKING.cta} <ExternalLink className="w-4 h-4 ml-2" aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  );
}
