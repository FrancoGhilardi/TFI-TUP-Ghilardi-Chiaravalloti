import { useState } from "react";

import { Eyebrow } from "@/modules/core/ui/Eyebrow";
import { ScriptWord } from "@/modules/core/ui/ScriptWord";

import { homeContent } from "../content/home";
import { firstNameOf } from "../domain/person-name";
import { formatToday } from "../domain/today";

interface HomeWelcomeProps {
  name: string;
}

export const HomeWelcome = ({ name }: HomeWelcomeProps) => {
  const [today] = useState(() => formatToday(new Date()));
  return (
    <header>
      <Eyebrow>{today}</Eyebrow>
      <h1 className="mt-1.5 text-[1.9rem] font-semibold">
        {homeContent.greeting} <ScriptWord>{firstNameOf(name)}</ScriptWord>!
      </h1>
      <p className="mt-1 text-ink-soft">{homeContent.lead}</p>
    </header>
  );
};
