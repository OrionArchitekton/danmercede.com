import { Download, Mail } from 'lucide-react';
import { trackEvent } from '../analytics/gaConfig';
import { SPEAKING_CONTACT, SPEAKING_ONE_SHEET_PATH, contactHref } from '../constants';

// Three of the four sessions in docs/one-sheets/speaking-one-sheet.html.
const topics = [
  { title: 'Who owns the workflow?', detail: 'Five tests for deciding when a team can depend on an AI pilot.' },
  { title: 'Fail closed by default', detail: 'How to test the gate that decides whether AI-written code can merge.' },
  { title: "Don't flatten the tree", detail: 'How to preserve the branches of a conversation in a knowledge graph.' },
];

export function SpeakingResources({ placement }: { placement: 'home' | 'connect' }) {
  const home = placement === 'home';
  const Heading = home ? 'h3' : 'h2';
  return (
    <div className={`overflow-hidden rounded-lg border border-white/10 bg-navy-deep ${home ? 'mb-6 grid md:grid-cols-[2fr_3fr]' : ''}`}>
      {home ? (
        <img src="/dan-mercede-executive-authority.webp" alt="Dan Mercede outside a glass office building"
          width="2048" height="1638" loading="lazy" decoding="async"
          className="h-full max-h-96 w-full object-cover object-[50%_20%] md:max-h-none" />
      ) : (
        <picture>
          <source type="image/webp" srcSet="/dan-mercede-executive-relaxed.webp" />
          <img src="/dan-mercede-executive-relaxed.png" alt="Dan Mercede outside an office entrance"
            width="2048" height="1638" loading="lazy" decoding="async"
            className="aspect-[2/1] w-full object-cover object-[50%_14%]" />
        </picture>
      )}
      <div className="self-center p-6 lg:p-8">
        <Heading className="mb-5 text-2xl font-bold text-white">{home ? 'Talk topics' : 'Speaking & workshops'}</Heading>
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
  );
}
