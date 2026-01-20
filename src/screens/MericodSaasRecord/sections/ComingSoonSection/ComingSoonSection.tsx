
import { Construction } from "lucide-react";

interface ComingSoonSectionProps {
    pageName?: string;
}

export const ComingSoonSection = ({ pageName }: ComingSoonSectionProps): JSX.Element => {
    return (
        <div className="flex-1 w-full min-h-screen bg-neutral-50 dark:bg-[#0B0C15] text-neutral-900 dark:text-white p-10 font-[Inter] flex flex-col items-center justify-center overflow-hidden relative">
            {/* Background Gradients */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-purple-500/5 blur-3xl" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/5 blur-3xl" />
            </div>

            <div className="text-center space-y-8 max-w-lg mx-auto relative z-10">
                {/* Icon Container */}
                <div className="w-24 h-24 rounded-3xl mx-auto flex items-center justify-center bg-white/50 dark:bg-white/5 border border-purple-200 dark:border-white/10 backdrop-blur-sm relative group cursor-default shadow-lg dark:shadow-purple-900/10">
                    <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/10 to-blue-500/10 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <Construction className="w-10 h-10 text-purple-600 dark:text-purple-400 relative z-10" />

                    {/* Decoration particles */}
                    <div className="absolute -right-2 -top-2 w-3 h-3 bg-blue-400 rounded-full blur-[1px] animate-bounce delay-100" />
                    <div className="absolute -left-1 -bottom-1 w-2 h-2 bg-purple-400 rounded-full blur-[1px] animate-bounce delay-300" />
                </div>

                <div className="space-y-3">
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-600 dark:from-purple-400 dark:to-blue-400 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        Coming Soon
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 text-lg leading-relaxed animate-in fade-in slide-in-from-bottom-5 duration-700 delay-100">
                        The <span className="font-semibold text-gray-900 dark:text-gray-100">{pageName || "requested"}</span> page is currently under construction.
                        <br />
                        We are working hard to bring you this feature!
                    </p>
                </div>

                <div className="pt-4 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 text-sm font-medium border border-purple-200 dark:border-purple-800/50">
                        <span>✨ Stay tuned for updates</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
