import ChoghadiyaGrid from "../app/components/ChoghadiyaGrid";

export default function Home() {
    return (
        <main className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto mb-8 text-center">
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                    Global Vedic Choghadiya Calculator
                </h1>
                <p className="mt-3 text-lg text-slate-500">
                    Precise daily auspicious & inauspicious timelines for any
                    location worldwide.
                </p>
            </div>
            <ChoghadiyaGrid />
        </main>
    );
}
