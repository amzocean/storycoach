'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

/**
 * Story Coach — coach-first Write flow.
 * The child is ALWAYS the author. AI only encourages, asks questions, reviews,
 * and illustrates progress. It never writes paragraphs. See STORY_COACH_CONTEXT.md.
 */

type Stage = 'welcome' | 'hero' | 'name' | 'setting' | 'problem' | 'write' | 'review' | 'publish' | 'done';

interface CoachReply {
  praise: string;
  question: string;
  tip?: string;
  choices?: string[];
}

interface Suggestion {
  pageNumber: number;
  type: string;
  original: string;
  suggestion: string;
  why: string;
}

interface WritePage {
  pageNumber: number;
  text: string;
  image_path?: string;
  imagePrompt?: string;
  illustrating?: boolean;
}

interface CharacterSheet {
  name: string;
  appearance: string;
  style: string;
}

const HEROES = [
  { emoji: '🐉', label: 'Dragon' },
  { emoji: '🦄', label: 'Unicorn' },
  { emoji: '🤖', label: 'Robot' },
  { emoji: '🦊', label: 'Fox' },
  { emoji: '🧙', label: 'Wizard' },
  { emoji: '🧜‍♀️', label: 'Mermaid' },
  { emoji: '🐻', label: 'Bear' },
  { emoji: '🚀', label: 'Astronaut' },
];

const SETTINGS = [
  { emoji: '🏰', label: 'a magic castle' },
  { emoji: '🌲', label: 'a deep forest' },
  { emoji: '🚀', label: 'outer space' },
  { emoji: '🏫', label: 'school' },
  { emoji: '🏖️', label: 'the beach' },
  { emoji: '🌊', label: 'under the sea' },
  { emoji: '🏔️', label: 'the mountains' },
  { emoji: '🍭', label: 'candy land' },
];

const PROBLEMS = [
  { emoji: '💎', label: 'looking for lost treasure' },
  { emoji: '😨', label: 'afraid of the dark' },
  { emoji: '🏠', label: 'trying to find the way home' },
  { emoji: '🤝', label: 'looking for a new friend' },
  { emoji: '🐲', label: 'meeting a grumpy monster' },
  { emoji: '🗺️', label: 'lost on a big adventure' },
];

const WORDS_TO_UNLOCK = 12;

const wordCount = (t: string) => t.trim().split(/\s+/).filter(Boolean).length;

export default function WritePage() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>('welcome');
  const [error, setError] = useState('');

  // Story skeleton
  const [hero, setHero] = useState('');
  const [heroName, setHeroName] = useState('');
  const [setting, setSetting] = useState('');
  const [problem, setProblem] = useState('');
  const [ageLevel, setAgeLevel] = useState(1);
  const [characterSheet, setCharacterSheet] = useState<CharacterSheet | null>(null);

  // Custom inputs
  const [customHero, setCustomHero] = useState('');
  const [customSetting, setCustomSetting] = useState('');
  const [customProblem, setCustomProblem] = useState('');

  // Writing
  const [storyId] = useState(() => crypto.randomUUID());
  const [pages, setPages] = useState<WritePage[]>([{ pageNumber: 1, text: '' }]);
  const [current, setCurrent] = useState(0);
  const [coach, setCoach] = useState<CoachReply | null>(null);
  const [coaching, setCoaching] = useState(false);
  const [starting, setStarting] = useState(false);

  // Review
  const [reviewing, setReviewing] = useState(false);
  const [celebration, setCelebration] = useState('');
  const [strength, setStrength] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [handled, setHandled] = useState<Set<number>>(new Set());

  // Publish
  const [title, setTitle] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [coverImage, setCoverImage] = useState('');

  const storyContext = () =>
    `${heroName} the ${hero} in ${setting}, ${problem}. Story: ${pages.map((p) => p.text).join(' ')}`;

  // ---- setup transitions ----
  const startWriting = async () => {
    setStarting(true);
    setError('');
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'character-sheet', hero, heroName, setting }),
      });
      const data = await res.json();
      if (data.characterSheet) setCharacterSheet(data.characterSheet);
    } catch {
      /* non-blocking — illustrations still work without a sheet */
    }
    if (!title) setTitle(`${heroName}'s Adventure`);
    setStarting(false);
    setStage('write');
  };

  // ---- coaching ----
  const askCoach = async () => {
    setCoaching(true);
    setError('');
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'coach-response',
          state: { hero, heroName, setting, problem, ageLevel },
          currentPageText: pages[current].text,
          storySoFar: pages.map((p) => p.text).join(' '),
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setCoach(data);
    } catch (e: any) {
      setError(e.message || 'Coach is thinking too hard — try again!');
    }
    setCoaching(false);
  };

  const updateText = (value: string) => {
    setPages((prev) => prev.map((p, i) => (i === current ? { ...p, text: value } : p)));
  };

  const unlockIllustration = async () => {
    setPages((prev) => prev.map((p, i) => (i === current ? { ...p, illustrating: true } : p)));
    setError('');
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate-illustration',
          pageText: pages[current].text,
          storyContext: storyContext(),
          storyId,
          pageNumber: pages[current].pageNumber,
          characterSheet,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setPages((prev) =>
        prev.map((p, i) =>
          i === current ? { ...p, image_path: data.imageUrl, imagePrompt: data.imagePrompt, illustrating: false } : p
        )
      );
    } catch (e: any) {
      setError(e.message || 'Could not draw the picture — try again!');
      setPages((prev) => prev.map((p, i) => (i === current ? { ...p, illustrating: false } : p)));
    }
  };

  const nextPage = () => {
    setCoach(null);
    const nextIndex = current + 1;
    if (nextIndex >= pages.length) {
      setPages((prev) => [...prev, { pageNumber: prev.length + 1, text: '' }]);
    }
    setCurrent(nextIndex);
  };

  const goToPage = (i: number) => {
    setCoach(null);
    setCurrent(i);
  };

  // ---- review ----
  const startReview = async () => {
    const written = pages.filter((p) => p.text.trim().length > 0);
    if (written.length === 0) {
      setError('Write at least one page first! ✍️');
      return;
    }
    setReviewing(true);
    setError('');
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'review-story',
          pages: written.map((p) => ({ pageNumber: p.pageNumber, text: p.text })),
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setCelebration(data.celebration || 'You finished a real story! 🎉');
      setStrength(data.strength || '');
      setSuggestions(data.suggestions || []);
      setHandled(new Set());
      setStage('review');
    } catch (e: any) {
      setError(e.message || 'Review failed — try again!');
    }
    setReviewing(false);
  };

  const acceptSuggestion = (idx: number) => {
    const s = suggestions[idx];
    setPages((prev) =>
      prev.map((p) =>
        p.pageNumber === s.pageNumber ? { ...p, text: p.text.replace(s.original, s.suggestion) } : p
      )
    );
    setHandled((prev) => new Set(prev).add(idx));
  };
  const ignoreSuggestion = (idx: number) => setHandled((prev) => new Set(prev).add(idx));

  // ---- publish ----
  const publish = async () => {
    setPublishing(true);
    setError('');
    try {
      const written = pages.filter((p) => p.text.trim().length > 0);
      // Cover (best-effort)
      let cover = coverImage;
      if (!cover) {
        try {
          const res = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'generate-cover',
              title,
              description: `${heroName} the ${hero} in ${setting}, ${problem}.`,
              category: 'adventure',
              storyId,
              characterSheet,
            }),
          });
          const data = await res.json();
          if (data.imageUrl) {
            cover = data.imageUrl;
            setCoverImage(data.imageUrl);
          }
        } catch {
          /* cover is optional */
        }
      }

      await fetch('/api/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: storyId,
          title: title || `${heroName}'s Adventure`,
          description: `${heroName} the ${hero} in ${setting}, ${problem}.`,
          category: 'adventure',
          tags: [setting, problem],
          cover_image: cover,
          status: 'published',
          detail_level: ageLevel === 1 ? 3 : ageLevel === 2 ? 4 : 5,
          author_name: null,
          author_credit: 'authored',
        }),
      });
      await fetch(`/api/stories/${storyId}/pages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pages: written.map((p, i) => ({
            pageNumber: i + 1,
            text: p.text,
            image_path: p.image_path,
            image_prompt: p.imagePrompt,
          })),
        }),
      });
      await fetch(`/api/stories/${storyId}/publish`, { method: 'POST' });
      setStage('done');
    } catch (e: any) {
      setError(e.message || 'Could not publish — try again!');
    }
    setPublishing(false);
  };

  // ============================ UI ============================
  const page = pages[current];
  const words = page ? wordCount(page.text) : 0;
  const canUnlock = words >= WORDS_TO_UNLOCK && !page?.image_path && !page?.illustrating;

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-300 via-sky-200 to-emerald-100 pb-24">
      <header className="sticky top-0 z-50 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 shadow-lg px-4 sm:px-6 py-3 sm:py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-2">
          <Link href="/" className="text-white/90 hover:text-white text-sm font-medium">← Library</Link>
          <h1 className="text-white font-extrabold text-sm sm:text-lg">✍️ Story Coach</h1>
          <div className="w-16" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-6">
        {error && (
          <div className="mb-4 bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-xl text-sm shadow whitespace-pre-line">
            ⚠️ {error}
          </div>
        )}

        {/* WELCOME */}
        {stage === 'welcome' && (
          <div className="bg-white/85 backdrop-blur-sm border-4 border-yellow-300 rounded-3xl p-6 sm:p-10 shadow-xl text-center">
            <div className="text-6xl mb-4 animate-bounce">✨</div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-800 mb-2">Let&apos;s write your very first story!</h2>
            <p className="text-gray-600 mb-6">You are the author. I&apos;m your coach — I&apos;ll cheer you on and ask fun questions. You write every word. 💜</p>
            <button
              onClick={() => setStage('hero')}
              className="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-extrabold rounded-full text-lg shadow-lg hover:scale-105 active:scale-95 transition-all"
            >
              🚀 Start Writing
            </button>
          </div>
        )}

        {/* HERO */}
        {stage === 'hero' && (
          <SetupCard title="Who is your hero?" subtitle="Pick one, or type your own idea.">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              {HEROES.map((h) => (
                <ChoiceButton
                  key={h.label}
                  emoji={h.emoji}
                  label={h.label}
                  selected={hero === h.label}
                  onClick={() => { setHero(h.label); setCustomHero(''); }}
                />
              ))}
            </div>
            <CustomInput
              placeholder="…or my own hero (e.g. a brave turtle)"
              value={customHero}
              onChange={(v) => { setCustomHero(v); setHero(v); }}
            />
            <NavButtons onBack={() => setStage('welcome')} onNext={() => setStage('name')} nextDisabled={!hero.trim()} />
          </SetupCard>
        )}

        {/* NAME */}
        {stage === 'name' && (
          <SetupCard title={`What's your ${hero || 'hero'}'s name?`} subtitle="Give your hero a special name.">
            <CustomInput placeholder="Type a name…" value={heroName} onChange={setHeroName} autoFocus />
            <NavButtons onBack={() => setStage('hero')} onNext={() => setStage('setting')} nextDisabled={!heroName.trim()} />
          </SetupCard>
        )}

        {/* SETTING */}
        {stage === 'setting' && (
          <SetupCard title="Where does the story happen?" subtitle="Pick a place, or make up your own.">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              {SETTINGS.map((s) => (
                <ChoiceButton
                  key={s.label}
                  emoji={s.emoji}
                  label={s.label}
                  selected={setting === s.label}
                  onClick={() => { setSetting(s.label); setCustomSetting(''); }}
                />
              ))}
            </div>
            <CustomInput
              placeholder="…or my own place"
              value={customSetting}
              onChange={(v) => { setCustomSetting(v); setSetting(v); }}
            />
            <NavButtons onBack={() => setStage('name')} onNext={() => setStage('problem')} nextDisabled={!setting.trim()} />
          </SetupCard>
        )}

        {/* PROBLEM */}
        {stage === 'problem' && (
          <SetupCard title="What's the big problem?" subtitle="Every great story needs a problem to solve!">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              {PROBLEMS.map((p) => (
                <ChoiceButton
                  key={p.label}
                  emoji={p.emoji}
                  label={p.label}
                  selected={problem === p.label}
                  onClick={() => { setProblem(p.label); setCustomProblem(''); }}
                />
              ))}
            </div>
            <CustomInput
              placeholder="…or my own problem"
              value={customProblem}
              onChange={(v) => { setCustomProblem(v); setProblem(v); }}
            />
            <div className="mt-5">
              <p className="text-sm font-bold text-gray-600 mb-2">How grown-up should the coaching be?</p>
              <div className="flex gap-2">
                {[{ v: 1, l: 'Ages 5–7' }, { v: 2, l: 'Ages 8–10' }, { v: 3, l: 'Ages 11–13' }].map((a) => (
                  <button
                    key={a.v}
                    onClick={() => setAgeLevel(a.v)}
                    className={`flex-1 px-3 py-2 rounded-xl text-sm font-bold border-2 transition-all ${
                      ageLevel === a.v ? 'bg-purple-500 text-white border-purple-500' : 'bg-white text-gray-600 border-gray-200'
                    }`}
                  >
                    {a.l}
                  </button>
                ))}
              </div>
            </div>
            <NavButtons
              onBack={() => setStage('setting')}
              onNext={startWriting}
              nextDisabled={!problem.trim() || starting}
              nextLabel={starting ? 'Getting ready…' : "Let's write! ✍️"}
            />
          </SetupCard>
        )}

        {/* WRITE */}
        {stage === 'write' && page && (
          <div>
            <div className="bg-white/70 rounded-2xl px-4 py-2 mb-4 text-sm text-gray-700 shadow-sm">
              <b>{heroName}</b> the {hero} · {setting} · {problem}
            </div>

            {/* page tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-3 hide-scrollbar">
              {pages.map((p, i) => (
                <button
                  key={i}
                  onClick={() => goToPage(i)}
                  className={`shrink-0 w-9 h-9 rounded-full text-sm font-bold border-2 flex items-center justify-center ${
                    i === current ? 'bg-purple-500 text-white border-purple-500' : p.text.trim() ? 'bg-white text-purple-600 border-purple-300' : 'bg-white text-gray-400 border-gray-200'
                  }`}
                  title={`Page ${i + 1}`}
                >
                  {p.image_path ? '⭐' : i + 1}
                </button>
              ))}
            </div>

            <div className="bg-white/85 backdrop-blur-sm border-4 border-yellow-300 rounded-3xl p-5 sm:p-7 shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-extrabold text-gray-800">📖 Page {current + 1}</h2>
                <span className="text-xs text-gray-400">{words} words</span>
              </div>

              <textarea
                value={page.text}
                onChange={(e) => updateText(e.target.value)}
                placeholder={current === 0 ? `Write one sentence to start… e.g. "${heroName} the ${hero} woke up in ${setting}."` : 'What happens next? Write it in your own words…'}
                className="w-full min-h-[140px] p-4 rounded-2xl border-2 border-gray-200 focus:border-purple-400 outline-none text-gray-800 text-lg leading-relaxed resize-y"
                autoFocus
              />

              {page.image_path && (
                <div className="mt-4">
                  <img src={page.image_path} alt={`Page ${current + 1} illustration`} className="w-full rounded-2xl shadow-md" />
                  <p className="text-center text-xs text-emerald-700 font-bold mt-1">🎉 You unlocked this picture with your words!</p>
                </div>
              )}
              {page.illustrating && (
                <div className="mt-4 text-center py-8 bg-purple-50 rounded-2xl">
                  <div className="text-4xl animate-pulse mb-2">🎨</div>
                  <p className="text-purple-700 font-bold text-sm">Drawing your picture from your words…</p>
                </div>
              )}

              {/* actions */}
              <div className="flex flex-wrap gap-2 mt-4">
                <button
                  onClick={askCoach}
                  disabled={coaching || !page.text.trim()}
                  className="px-4 py-2.5 bg-purple-500 hover:bg-purple-600 disabled:opacity-40 text-white rounded-xl font-bold text-sm shadow"
                >
                  {coaching ? '💭 Thinking…' : '💬 Coach me'}
                </button>
                <button
                  onClick={unlockIllustration}
                  disabled={!canUnlock}
                  className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-amber-900 rounded-xl font-bold text-sm shadow"
                  title={canUnlock ? 'Unlock a picture!' : `Write ${WORDS_TO_UNLOCK}+ words to unlock a picture`}
                >
                  🎨 Unlock picture
                </button>
                <button
                  onClick={nextPage}
                  disabled={!page.text.trim()}
                  className="px-4 py-2.5 bg-white border-2 border-purple-200 text-purple-600 rounded-xl font-bold text-sm disabled:opacity-40"
                >
                  ➕ Next page
                </button>
              </div>
              {!canUnlock && !page.image_path && !page.illustrating && (
                <p className="text-xs text-gray-400 mt-2">✏️ Write {Math.max(0, WORDS_TO_UNLOCK - words)} more words to unlock a picture.</p>
              )}
            </div>

            {/* coach panel */}
            {coach && (
              <div className="mt-4 bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-3xl p-5 shadow-lg">
                <div className="flex items-start gap-3">
                  <div className="text-3xl">🦉</div>
                  <div className="flex-1">
                    <p className="text-purple-800 font-bold">{coach.praise}</p>
                    <p className="text-gray-700 mt-2">💭 {coach.question}</p>
                    {coach.tip && <p className="text-gray-500 text-sm mt-2">✨ Tiny tip: {coach.tip}</p>}
                    {coach.choices && coach.choices.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs font-bold text-gray-500 mb-1">Stuck? Here are ideas — but YOU choose or invent your own:</p>
                        <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                          {coach.choices.map((c, i) => <li key={i}>{c}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 text-center">
              <button
                onClick={startReview}
                disabled={reviewing}
                className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-extrabold rounded-full shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
              >
                {reviewing ? 'Reviewing…' : '✅ Finish & Review My Story'}
              </button>
            </div>
          </div>
        )}

        {/* REVIEW */}
        {stage === 'review' && (
          <div className="bg-white/85 backdrop-blur-sm border-4 border-yellow-300 rounded-3xl p-6 sm:p-8 shadow-xl">
            <div className="text-center mb-5">
              <div className="text-5xl mb-2">🎉</div>
              <h2 className="text-2xl font-extrabold text-gray-800">{celebration}</h2>
              {strength && <p className="text-emerald-700 font-semibold mt-2">🌟 {strength}</p>}
            </div>

            {suggestions.length === 0 ? (
              <p className="text-center text-gray-600 mb-6">Your writing looks wonderful — no fixes needed! 💜</p>
            ) : (
              <div className="space-y-3 mb-6">
                <p className="text-sm text-gray-500">Here are some tiny ideas. You decide — accept or keep yours. 💪</p>
                {suggestions.map((s, i) => (
                  <div key={i} className={`border-2 rounded-2xl p-4 ${handled.has(i) ? 'border-gray-100 opacity-50' : 'border-purple-200'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">{s.type}</span>
                      <span className="text-xs text-gray-400">Page {s.pageNumber}</span>
                    </div>
                    <p className="text-sm text-gray-700"><span className="line-through text-gray-400">{s.original}</span> → <span className="font-bold text-emerald-700">{s.suggestion}</span></p>
                    <p className="text-xs text-gray-500 mt-1">{s.why}</p>
                    {!handled.has(i) && (
                      <div className="flex gap-2 mt-2">
                        <button onClick={() => acceptSuggestion(i)} className="px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-bold">✓ Use this</button>
                        <button onClick={() => ignoreSuggestion(i)} className="px-3 py-1.5 bg-white border border-gray-200 text-gray-500 rounded-lg text-xs font-bold">Keep mine</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={() => setStage('write')} className="px-6 py-3 bg-white border border-gray-200 text-gray-600 rounded-xl font-bold">← Keep writing</button>
              <button onClick={() => setStage('publish')} className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-extrabold rounded-xl shadow-lg">Next: Publish 📖</button>
            </div>
          </div>
        )}

        {/* PUBLISH */}
        {stage === 'publish' && (
          <div className="bg-white/85 backdrop-blur-sm border-4 border-yellow-300 rounded-3xl p-6 sm:p-8 shadow-xl">
            <h2 className="text-2xl font-extrabold text-gray-800 mb-2 text-center">📖 Publish your book!</h2>
            <p className="text-gray-600 text-center mb-5">You wrote this whole story yourself. 🌟</p>
            <label className="block text-sm font-bold text-gray-600 mb-1">Book title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-3 rounded-xl border-2 border-gray-200 focus:border-purple-400 outline-none mb-4"
              placeholder="My Amazing Story"
            />
            <div className="bg-purple-50 rounded-xl p-4 text-sm text-gray-600 mb-5">
              ✍️ <b>Written by you</b><br />
              🎨 Illustrated with Story Coach
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={() => setStage('review')} className="px-6 py-3 bg-white border border-gray-200 text-gray-600 rounded-xl font-bold">← Back</button>
              <button
                onClick={publish}
                disabled={publishing || !title.trim()}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-extrabold rounded-xl shadow-lg disabled:opacity-50"
              >
                {publishing ? 'Publishing your book…' : '🎉 Publish My Book'}
              </button>
            </div>
          </div>
        )}

        {/* DONE */}
        {stage === 'done' && (
          <div className="bg-white/85 backdrop-blur-sm border-4 border-yellow-300 rounded-3xl p-8 shadow-xl text-center">
            <div className="text-6xl mb-4 animate-bounce">🏆</div>
            <h2 className="text-3xl font-extrabold text-gray-800 mb-2">You are officially an author!</h2>
            <p className="text-gray-600 mb-6">Your book is now in the library for everyone to read. 💜</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href={`/read/${storyId}`} className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-extrabold rounded-full shadow-lg">📖 Read my book</Link>
              <button onClick={() => router.push('/')} className="px-6 py-3 bg-white border border-gray-200 text-gray-600 font-bold rounded-full">🏠 Library</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ============================ small components ============================
function SetupCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="bg-white/85 backdrop-blur-sm border-4 border-yellow-300 rounded-3xl p-6 sm:p-8 shadow-xl">
      <h2 className="text-xl sm:text-2xl font-extrabold text-gray-800 mb-1">{title}</h2>
      <p className="text-gray-500 mb-5">{subtitle}</p>
      {children}
    </div>
  );
}

function ChoiceButton({ emoji, label, selected, onClick }: { emoji: string; label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`p-3 rounded-2xl border-2 text-center transition-all ${
        selected ? 'bg-purple-500 text-white border-purple-500 scale-105' : 'bg-white text-gray-700 border-gray-200 hover:border-purple-300'
      }`}
    >
      <div className="text-3xl mb-1">{emoji}</div>
      <div className="text-xs font-bold capitalize">{label}</div>
    </button>
  );
}

function CustomInput({ placeholder, value, onChange, autoFocus }: { placeholder: string; value: string; onChange: (v: string) => void; autoFocus?: boolean }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoFocus={autoFocus}
      className="w-full p-3 rounded-xl border-2 border-gray-200 focus:border-purple-400 outline-none text-gray-800"
    />
  );
}

function NavButtons({ onBack, onNext, nextDisabled, nextLabel }: { onBack: () => void; onNext: () => void; nextDisabled?: boolean; nextLabel?: string }) {
  return (
    <div className="flex gap-3 mt-6">
      <button onClick={onBack} className="px-5 py-3 bg-white border border-gray-200 text-gray-600 rounded-xl font-bold">← Back</button>
      <button
        onClick={onNext}
        disabled={nextDisabled}
        className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-extrabold rounded-xl shadow-lg disabled:opacity-40"
      >
        {nextLabel || 'Next →'}
      </button>
    </div>
  );
}
