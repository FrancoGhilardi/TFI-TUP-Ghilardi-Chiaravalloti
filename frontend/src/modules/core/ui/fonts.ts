import { Caveat, Fraunces, Plus_Jakarta_Sans } from "next/font/google";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces" });
const caveat = Caveat({ subsets: ["latin"], variable: "--font-caveat" });

/** Class names that expose the fonts as the CSS variables used by the theme. */
export const fontVariables = [jakarta.variable, fraunces.variable, caveat.variable].join(" ");
