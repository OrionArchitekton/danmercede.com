import { Download, ExternalLink, Mail } from 'lucide-react';
import { trackEvent } from '../analytics/gaConfig';
import { SPEAKING, SPEAKING_CONTACT, SPEAKING_ONE_SHEET_PATH, UPCOMING_SPEAKING, contactHref } from '../constants';

const topics = [
  { title: 'Who owns the workflow?', detail: 'Five tests for deciding when a team can depend on an AI pilot.' },
  { title: 'Fail closed by default', detail: 'How to test the gate that decides whether AI-written code can merge.' },
  { title: "Don't flatten the tree", detail: 'How to preserve the branches of a conversation in a knowledge graph.' },
];

export function SpeakingResources() {
  return (
    <section id="speaking" aria-labelledby="speaking-heading" className="scroll-mt-24">
      <h2 id="speaking-heading" className="mb-1 text-3xl font-semibold text-white">Speaking &amp; workshops</h2>
      <p className="folio-index text-copper-400 mb-5">WORKSHOPS &amp; KEYNOTES</p>
      <div className="mb-6 meridian-plate-accent overflow-hidden rounded-lg">
        <picture>
          <source
            type="image/avif"
            srcSet="/media/portraits/dan-mercede-executive-relaxed-480w.avif 480w, /media/portraits/dan-mercede-executive-relaxed-800w.avif 800w"
            sizes="(max-width: 768px) 100vw, 700px"
          />
          <source
            type="image/webp"
            srcSet="/media/portraits/dan-mercede-executive-relaxed-480w.webp 480w, /media/portraits/dan-mercede-executive-relaxed-800w.webp 800w"
            sizes="(max-width: 768px) 100vw, 700px"
          />
          <img
            src="/dan-mercede-executive-relaxed.webp"
            alt="Dan Mercede outside an office entrance"
            width={850}
            height={680}
            loading="lazy"
            decoding="async"
            className="aspect-[16/10] w-full object-cover object-[50%_8%] contrast-[1.04] saturate-[0.92] brightness-[0.96]"
          />
        </picture>
        <div className="p-6 lg:p-8">
          <h3 className="mb-4 text-xl font-semibold text-white">Talk topics</h3>
          <dl className="divide-y divide-white/10">
            {topics.map(({ title, detail }, idx) => (
              <div key={title} className="py-3 first:pt-0 last:pb-0">
                <dt
                  data-index={`0${idx + 1}`}
                  className="font-semibold text-slate-100 flex items-baseline gap-2.5 before:content-[attr(data-index)] before:font-mono before:text-xs before:text-copper-400 before:tabular-nums"
                >
                  {title}
                </dt>
                <dd className="mt-1 text-sm leading-relaxed text-slate-300 pl-6">{detail}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/10 pt-4">
            <a
              href={contactHref(SPEAKING_CONTACT)}
              onClick={() => trackEvent(window, 'generate_lead', { method: 'email', intent: 'speaking' })}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-sm bg-copper-300 px-5 text-sm font-semibold text-slate-950 hover:bg-copper-400 transition-colors"
            >
              <Mail size={16} aria-hidden="true" /> Invite Dan to speak
            </a>
            <a
              href={SPEAKING_ONE_SHEET_PATH}
              download
              className="inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold text-copper-300 hover:text-copper-400 px-2"
            >
              <Download size={16} aria-hidden="true" /> Download speaking one-sheet
            </a>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="meridian-plate-accent flex flex-col p-7 rounded-lg">
          <h3 className="text-2xl font-semibold text-white mb-1">{UPCOMING_SPEAKING.event}</h3>
          <p className="text-copper-300 font-mono text-xs uppercase tracking-widest mb-3">{UPCOMING_SPEAKING.label}</p>
          <p className="text-slate-300 font-mono text-xs mb-4 tabular-nums">
            {UPCOMING_SPEAKING.date} · {UPCOMING_SPEAKING.time} · {UPCOMING_SPEAKING.format} · {UPCOMING_SPEAKING.location}
          </p>
          <p className="text-slate-100 italic mb-3">"{UPCOMING_SPEAKING.title}"</p>
          <p className="text-slate-300 text-sm leading-relaxed grow mb-6">{UPCOMING_SPEAKING.detail}</p>
          <a
            href={UPCOMING_SPEAKING.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-copper-300 text-sm font-semibold tracking-wider uppercase hover:text-copper-400 transition-colors inline-flex min-h-[44px] items-center"
          >
            {UPCOMING_SPEAKING.cta} <ExternalLink className="w-4 h-4 ml-2" aria-hidden="true" />
          </a>
        </div>

        <div className="meridian-plate flex flex-col p-7 rounded-lg">
          <h3 className="text-2xl font-semibold text-white mb-1">{SPEAKING.event}</h3>
          <p className="text-slate-300 font-mono text-xs uppercase tracking-widest mb-3">{SPEAKING.label}</p>
          <p className="text-copper-300 font-mono text-xs mb-4">{SPEAKING.date}</p>
          <p className="text-slate-100 italic mb-3">"{SPEAKING.title}"</p>
          <p className="text-slate-300 text-sm leading-relaxed grow mb-6">{SPEAKING.detail}</p>
          <a
            href={SPEAKING.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-copper-300 text-sm font-semibold tracking-wider uppercase hover:text-copper-400 transition-colors inline-flex min-h-[44px] items-center"
          >
            {SPEAKING.cta} <ExternalLink className="w-4 h-4 ml-2" aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  );
}
