declare module "typewriter-effect/dist/core" {
    import type { Options, TypewriterClass } from "typewriter-effect";

    type CoreOptions = Options & { pauseFor?: number };
    const Typewriter: {
        new (container: string | HTMLElement, options: CoreOptions): TypewriterClass;
    };
    export default Typewriter;
}
