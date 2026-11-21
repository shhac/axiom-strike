import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { PASSAGES } from "../content/passages";
import {
  answersFor,
  finishReading,
  pickPassage,
  rewardFor,
  wasRead,
  type Answer,
  type Reward,
} from "../engine/campfire";
import { createRng } from "../engine/rng";
import { icon } from "./assets";
import { playMusic, playSfx } from "./audio";
import { goTo } from "./nav";
import { save, updateSave } from "./save";

type Phase = "read" | "ask" | "done";

/** Time spent with the passage on screen and the app in view. Nothing shows it to the reader. */
const useReadingClock = (running: boolean) => {
  const clock = useRef({ total: 0, since: 0 });
  useEffect(() => {
    if (!running) return;
    const start = () => (clock.current.since = performance.now());
    const stop = () => {
      if (clock.current.since > 0) clock.current.total += performance.now() - clock.current.since;
      clock.current.since = 0;
    };
    const onVisibility = () => (document.hidden ? stop() : start());
    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [running]);
  return () => clock.current.total;
};

const Bag = () => (
  <div class="bag" aria-label={`${save.value.potions} potions, ${save.value.scrolls} hint scrolls`}>
    <span data-bag="potions">
      <img src={icon("potion")} alt="" />
      {save.value.potions}
    </span>
    <span data-bag="scrolls">
      <img src={icon("hint")} alt="" />
      {save.value.scrolls}
    </span>
  </div>
);

const MapButton = () => (
  <button
    class="btn btn-wide"
    data-action="map"
    onClick={() => {
      playSfx("button");
      goTo("map");
    }}
  >
    Map
  </button>
);

const RewardLine = ({ reward }: { reward: Reward }) => {
  if (reward.potions + reward.scrolls === 0) {
    return <p class="reward-none">Take your time with the next story and there will be a prize.</p>;
  }
  return (
    <div class="reward-items" data-reward={`${reward.potions}-${reward.scrolls}`}>
      {reward.potions > 0 && (
        <span>
          <img src={icon("potion")} alt="" />
          Potion
        </span>
      )}
      {reward.scrolls > 0 && (
        <span>
          <img src={icon("hint")} alt="" />
          Hint scroll
        </span>
      )}
    </div>
  );
};

const HEADLINES: Record<Answer["kind"], string> = {
  correct: "Spot on!",
  almost: "So close!",
  other: "Not quite",
};

const Story = ({ passageId, seed, another }: { passageId: number; seed: number; another: () => void }) => {
  const passage = PASSAGES[passageId];
  const [phase, setPhase] = useState<Phase>("read");
  const [picked, setPicked] = useState<Answer | null>(null);
  const [reward, setReward] = useState<Reward | null>(null);
  const answers = useMemo(() => (passage ? answersFor(passage, createRng(seed)) : []), [passage, seed]);
  const readMs = useReadingClock(phase === "read");
  if (!passage) return null;

  const turn = (next: Phase) => {
    playSfx("page");
    setPhase(next);
  };

  const answer = (choice: Answer) => {
    const spent = readMs();
    setPicked(choice);
    setReward(rewardFor(choice.kind, wasRead(passage, spent)));
    updateSave((current) => finishReading(current, passageId, choice.kind, spent));
    playSfx(choice.kind === "other" ? "tile_undo" : "reward");
    setPhase("done");
  };

  if (phase === "read") {
    return (
      <div class="scroll-card" data-phase="read">
        <span class="scroll-subject">{passage.subject}</span>
        <p class="scroll-text">{passage.text}</p>
        <button class="btn btn-wide btn-go" data-action="read-done" onClick={() => turn("ask")}>
          I have read it
        </button>
      </div>
    );
  }

  if (phase === "ask") {
    return (
      <div class="scroll-card" data-phase="ask">
        <p class="scroll-question">{passage.question}</p>
        <div class="answers">
          {answers.map((choice) => (
            <button class="btn answer" data-answer={choice.kind} onClick={() => answer(choice)}>
              {choice.text}
            </button>
          ))}
          <button class="btn answer answer-back" data-action="read-again" onClick={() => turn("read")}>
            <img src={icon("book")} alt="" />
            Read it again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div class="scroll-card scroll-done" data-phase="done" data-outcome={picked?.kind}>
      <h1>{HEADLINES[picked?.kind ?? "other"]}</h1>
      <p class="scroll-answer">
        {passage.question} <b>{passage.correct}</b>
      </p>
      {reward && <RewardLine reward={reward} />}
      <div class="result-buttons">
        <MapButton />
        {save.value.stories > 0 && (
          <button class="btn btn-wide btn-go" data-action="another" onClick={another}>
            Another story
          </button>
        )}
      </div>
    </div>
  );
};

const newStory = () => {
  const seed = Math.floor(Math.random() * 2 ** 31);
  return { seed, passageId: pickPassage(save.value, createRng(seed)) };
};

export const CampfireScreen = () => {
  useEffect(() => playMusic("music_calm"), []);
  const [story, setStory] = useState(() => (save.value.stories > 0 ? newStory() : null));
  return (
    <div class="screen campfire" data-screen="campfire">
      <div class="campfire-art" />
      <header class="campfire-head">
        <h1>Campfire</h1>
        <Bag />
      </header>
      {story ? (
        <Story
          key={story.seed}
          passageId={story.passageId}
          seed={story.seed}
          another={() => {
            playSfx("page");
            setStory(newStory());
          }}
        />
      ) : (
        <div class="scroll-card scroll-done" data-phase="empty">
          <h1>The fire is low</h1>
          <p class="scroll-answer">Win a level and a new story will be waiting here.</p>
          <div class="result-buttons">
            <MapButton />
          </div>
        </div>
      )}
    </div>
  );
};
