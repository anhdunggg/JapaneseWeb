import { BookOpenText, LogOut, Sparkles, Sprout } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const placeholders = [
  { title: 'Lessons', value: '0', detail: 'Ready to connect to Supabase lessons.' },
  { title: 'Vocabulary', value: '0', detail: 'Words will appear by selected lesson.' },
  { title: 'AI Practice', value: 'Soon', detail: 'Gemini exercises come in the next step.' },
];

export default function Dashboard() {
  const { user, signOut } = useAuth();

  return (
    <main className="min-h-screen bg-washi px-5 py-6 text-indigo sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-10 flex flex-col gap-5 border-b border-indigo/10 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded bg-white shadow-soft">
              <Sprout className="h-6 w-6 text-vermilion" />
            </div>
            <div>
              <p className="text-sm font-medium text-ink/70">Signed in as {user?.email}</p>
              <h1 className="font-mincho text-3xl">Study Dashboard</h1>
            </div>
          </div>
          <button
            type="button"
            onClick={signOut}
            className="inline-flex items-center justify-center gap-2 rounded border border-indigo/10 bg-white px-4 py-2 text-sm font-semibold text-indigo shadow-soft transition hover:border-sakura"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </header>

        <section className="mb-8 rounded bg-white/90 p-7 shadow-zen ring-1 ring-indigo/5">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-vermilion">
                <BookOpenText className="h-4 w-4" />
                Lesson room
              </p>
              <h2 className="font-mincho text-4xl">今日の学習</h2>
              <p className="mt-4 max-w-2xl leading-7 text-ink/75">
                This protected dashboard is ready for lesson lists, lesson details, and
                AI-generated practice once the content views are connected.
              </p>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded bg-sakura/30">
              <Sparkles className="h-7 w-7 text-vermilion" />
            </div>
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-3">
          {placeholders.map((item) => (
            <article
              key={item.title}
              className="rounded bg-white/85 p-6 shadow-soft ring-1 ring-indigo/5"
            >
              <p className="text-sm font-semibold text-ink/65">{item.title}</p>
              <p className="mt-3 font-mincho text-3xl text-indigo">{item.value}</p>
              <p className="mt-3 text-sm leading-6 text-ink/70">{item.detail}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
