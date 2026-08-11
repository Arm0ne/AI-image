import { useEffect, useRef } from "react";
import Typewriter from "typewriter-effect/dist/core";

type TypewriterTextProps = {
    strings: string[];
    className?: string;
};

export function TypewriterText({ strings, className = "" }: TypewriterTextProps) {
    const containerRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        const typewriter = new Typewriter(containerRef.current, {
            strings,
            autoStart: true,
            loop: true,
            delay: 75,
            deleteSpeed: 30,
            pauseFor: 2000,
        });

        return () => {
            typewriter.stop();
        };
    }, [strings]);

    return <span ref={containerRef} className={className} />;
}
