import React from 'react';
import { Rss } from 'lucide-react';

export default function FollowFieldNotes() {
  return (
    <section aria-label="Follow new field notes" className="mt-12 flex flex-wrap items-center justify-between gap-5 border-y border-copper-500/25 bg-navy-deep/60 px-5 py-5 sm:px-7">
      <div className="flex items-center gap-4">
        <Rss size={20} className="shrink-0 text-copper-400" aria-hidden="true" />
        <div>
          <h2 className="text-xl font-semibold text-white">Follow new field notes</h2>
          <p className="text-sm text-slate-300">Get new essays and technical guides in your feed reader.</p>
        </div>
      </div>
      <div className="flex gap-5 text-sm font-medium text-copper-400">
        <a href="/feed.xml" type="application/rss+xml" className="py-2 underline underline-offset-4 hover:text-copper-300">RSS feed</a>
        <a href="/atom.xml" type="application/atom+xml" className="py-2 underline underline-offset-4 hover:text-copper-300">Atom feed</a>
      </div>
    </section>
  );
}
