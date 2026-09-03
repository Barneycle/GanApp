import { useEffect, useState } from "react";

export const LoadingScreen = ({ onComplete }) => {
    const [text, setText] = useState("");
    const fullText = "GanApp";

    useEffect(() => {
        let index = 0;

        const interval = setInterval(() => {
            setText(fullText.substring(0, index));
            index++;

            if (index > fullText.length) {
                clearInterval(interval);

                setTimeout(() => {
                    onComplete();
                }, 1000);
            }
        }, 100);

        return () => clearInterval(interval);
    }, [onComplete]);

    return (
        <div className="app-shell fixed inset-0 z-50 flex flex-col items-center justify-center text-blue-900">
            <div className="mb-4 text-xl font-semibold tracking-tight sm:text-2xl md:text-3xl lg:text-4xl">
                {text}<span className="animate-blink ml-1">|</span>
            </div>

            <div className="relative h-[2px] w-[200px] overflow-hidden rounded bg-slate-200">
                <div className="h-full w-[40%] bg-blue-600 animate-loading-bar"></div>
            </div>
        </div>
    );
};
