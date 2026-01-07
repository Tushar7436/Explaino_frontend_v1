import { PlusIcon } from "lucide-react";
import { Button } from "../../../../components/ui/button";
import { Card, CardContent } from "../../../../components/ui/card";

export const HomeSection = (): JSX.Element => {
  return (
    <main className="flex-1 min-h-screen p-10 bg-gradient-to-b from-white to-[#fbfbfc] dark:bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] dark:from-[#241b4d] dark:to-[#070510] text-[#131920] dark:text-white relative overflow-hidden transition-colors duration-300">

      {/* Decorative Accents - Light Mode */}
      <div className="absolute -left-24 -top-24 w-[320px] h-[320px] rounded-full bg-[#f7ecff] opacity-70 blur-[40px] pointer-events-none dark:hidden" />
      <div className="absolute -right-24 -top-12 w-[360px] h-[360px] rounded-full bg-[#f4f9ff] opacity-60 blur-[40px] pointer-events-none dark:hidden" />

      {/* Decorative Accents - Dark Mode (Stars/Nebula) */}
      <div className="hidden dark:block absolute top-0 left-0 w-full h-[500px] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none" />
      <div className="hidden dark:block absolute top-[-10%] right-[20%] w-[500px] h-[500px] rounded-full bg-purple-600/20 blur-[100px] pointer-events-none" />
      <div className="hidden dark:block absolute top-[10%] left-[-10%] w-[400px] h-[400px] rounded-full bg-blue-600/10 blur-[80px] pointer-events-none" />

      <div className="max-w-[1200px] mx-auto relative z-10">
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-6 mb-12">
          <Button className="bg-[#2563EB] hover:bg-[#1D4ED8] dark:bg-[#2563EB] dark:hover:bg-[#1D4ED8] text-white rounded-lg px-6 py-2.5 inline-flex items-center gap-2 shadow-sm dark:shadow-[0_0_15px_rgba(37,99,235,0.4)] transition-all">
            <PlusIcon className="w-4 h-4" />
            <span className="text-sm font-semibold">Create a new video</span>
          </Button>

          <header className="text-center">
            <h2 className="text-4xl md:text-5xl font-extrabold leading-tight tracking-tight dark:text-white">
              Make something awesome
            </h2>
            <p className="mt-3 text-[#6b7280] dark:text-gray-400 text-lg">Create stunning product videos and docs</p>
          </header>

          <div className="flex items-center justify-end gap-4">
            <div className="w-10 h-10 rounded-full bg-[#f3f3f4] border border-[#efeff0] dark:bg-white/10 dark:border-white/10 backdrop-blur-sm" />
          </div>
        </div>

        {/* Feature Cards Section */}
        <section className="grid grid-cols-3 gap-6 mb-10">
          <Card className="group bg-white dark:bg-[#151226]/80 dark:backdrop-blur-xl border border-[#efeff0] dark:border-white/5 rounded-2xl shadow-[0_8px_24px_rgba(16,24,40,0.06)] dark:shadow-none overflow-hidden hover:scale-[1.02] transition-transform duration-200 cursor-pointer">
            <CardContent className="p-0 h-full flex flex-col">
              <div className="h-44 relative overflow-hidden group-hover:opacity-90 transition-opacity">
                <img
                  src="https://cdn.vocallabs.ai/landing_page/3511850f-c41a-4dd2-8756-da2ae3a27ce7.png"
                  alt="Record screen illustration"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-6">
                <h3 className="font-semibold text-lg mb-2 dark:text-white">Record screen</h3>
                <p className="text-sm text-[#6b7280] dark:text-gray-400">Turn a screen-recording into a studio-style video.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="group bg-white dark:bg-[#151226]/80 dark:backdrop-blur-xl border border-[#efeff0] dark:border-white/5 rounded-2xl shadow-[0_8px_24px_rgba(16,24,40,0.06)] dark:shadow-none overflow-hidden hover:scale-[1.02] transition-transform duration-200 cursor-pointer">
            <CardContent className="p-0 h-full flex flex-col">
              <div className="h-44 relative overflow-hidden group-hover:opacity-90 transition-opacity">
                <img
                  src="https://cdn.vocallabs.ai/landing_page/34f0e23d-daec-4e9f-8913-e5dd97a2d71e.png"
                  alt="Upload video illustration"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-6">
                <h3 className="font-semibold text-lg mb-2 dark:text-white">Upload a video</h3>
                <p className="text-sm text-[#6b7280] dark:text-gray-400">Upload a screen recording. Get a studio-style video.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="group bg-white dark:bg-[#151226]/80 dark:backdrop-blur-xl border border-[#efeff0] dark:border-white/5 rounded-2xl shadow-[0_8px_24px_rgba(16,24,40,0.06)] dark:shadow-none overflow-hidden hover:scale-[1.02] transition-transform duration-200 cursor-pointer">
            <CardContent className="p-0 h-full flex flex-col">
              <div className="h-44 relative overflow-hidden group-hover:opacity-90 transition-opacity">
                <img
                  src="https://cdn.vocallabs.ai/landing_page/8214f0c9-8779-4409-9836-430ac421d176.png"
                  alt="Upload slide deck illustration"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-6">
                <h3 className="font-semibold text-lg mb-2 dark:text-white">Upload a slide deck</h3>
                <p className="text-sm text-[#6b7280] dark:text-gray-400">Turn any PDF or PPT into a narrated video.</p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* AI Tools Section */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-[#4b5563] dark:text-gray-400 uppercase tracking-wider">AI tools</h4>
            <span className="text-[10px] font-bold text-[#9ca3af] dark:text-purple-400 bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded-full">NEW</span>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white dark:bg-[#151226] border border-[#efeff0] dark:border-white/5 rounded-xl px-4 py-4 flex items-center gap-4 shadow-sm dark:shadow-none hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer">
              <div className="w-10 h-10 rounded-lg bg-[#efe7ff] dark:bg-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-300">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" /></svg>
              </div>
              <div>
                <div className="font-medium text-sm text-[#131920] dark:text-gray-200">Cuts</div>
                <div className="text-xs text-[#6b7280] dark:text-gray-500">Break down a long video</div>
              </div>
            </div>

            <div className="bg-white dark:bg-[#151226] border border-[#efeff0] dark:border-white/5 rounded-xl px-4 py-4 flex items-center gap-4 shadow-sm dark:shadow-none hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer">
              <div className="w-10 h-10 rounded-lg bg-[#e0f1ff] dark:bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-300">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              </div>
              <div>
                <div className="font-medium text-sm text-[#131920] dark:text-gray-200">Auto-update</div>
                <div className="text-xs text-[#6b7280] dark:text-gray-500">Update content automatically</div>
              </div>
            </div>

            <div className="bg-white dark:bg-[#151226] border border-[#efeff0] dark:border-white/5 rounded-xl px-4 py-4 flex items-center gap-4 shadow-sm dark:shadow-none hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer">
              <div className="w-10 h-10 rounded-lg bg-[#ffefe5] dark:bg-orange-500/20 flex items-center justify-center text-orange-600 dark:text-orange-300">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" /></svg>
              </div>
              <div>
                <div className="font-medium text-sm text-[#131920] dark:text-gray-200">Translator</div>
                <div className="text-xs text-[#6b7280] dark:text-gray-500">Dub into +37 languages</div>
              </div>
            </div>
          </div>
        </section>

        {/* Empty State / Projects */}
        <section>
          <div className="rounded-2xl border border-[#efeff0] dark:border-white/5 h-64 flex items-center justify-center text-[#6b7280] relative overflow-hidden bg-gray-50/50 dark:bg-white/[0.02]">
            <div className="text-center z-10 p-6">
              <div className="w-16 h-16 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <PlusIcon className="w-6 h-6 text-gray-400 dark:text-gray-500" />
              </div>
              <div className="text-lg font-semibold mb-2 dark:text-gray-300">No projects found</div>
              <div className="text-sm text-[#6b7280] dark:text-gray-500">Choose an option above to create your first project.</div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};
