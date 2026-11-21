import { useMemo, useState } from "preact/hooks";
import type { Passage } from "../../content/passages";
import { answersFor, finishReading, rewardFor, wasRead, type Answer, type Reward } from "../../engine/campfire";
import { createRng } from "../../engine/rng";
import { icon } from "../assets";
import { playSfx } from "../audio";
import { MapButton } from "../common";
import { save, updateSave } from "../save";
import { useReadingClock } from "./readingClock";

type Progress = { phase: "read" } | { phase: "ask" } | { phase: "done"; picked: Answer; reward: Reward };

const HEADLINES: Record<Answer["kind"], string> = {
  correct: "Spot on!",
  almost: "So close!",
  other: "Not quite",
};

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

const ReadCard = ({ passage, done }: { passage: Passage; done: () => void }) => (
  <div class="scroll-card" data-phase="read">
    <span class="scroll-subject">{passage.subject}</span>
    <p class="scroll-text">{passage.text}</p>
    <button class="btn btn-wide btn-go" data-action="read-done" onClick={done}>
      I have read it
    </button>
  </div>
);

const AskCard = (props: {
  passage: Passage;
  answers: readonly Answer[];
  answer: (choice: Answer) => void;
  back: () => void;
}) => (
  <div class="scroll-card" data-phase="ask">
    <p class="scroll-question">{props.passage.question}</p>
    <div class="answers">
      {props.answers.map((choice) => (
        <button class="btn answer" data-answer={choice.kind} onClick={() => props.answer(choice)}>
          {choice.text}
        </button>
      ))}
      <button class="btn answer answer-back" data-action="read-again" onClick={props.back}>
        <img src={icon("book")} alt="" />
        Read it again
      </button>
    </div>
  </div>
);

const DoneCard = (props: { passage: Passage; picked: Answer; reward: Reward; another: () => void }) => (
  <div class="scroll-card scroll-done" data-phase="done" data-outcome={props.picked.kind}>
    <h1>{HEADLINES[props.picked.kind]}</h1>
    <p class="scroll-answer">
      {props.passage.question} <b>{props.passage.correct}</b>
    </p>
    <RewardLine reward={props.reward} />
    <div class="result-buttons">
      <MapButton />
      {save.value.stories > 0 && (
        <button class="btn btn-wide btn-go" data-action="another" onClick={props.another}>
          Another story
        </button>
      )}
    </div>
  </div>
);

type StoryProps = { passage: Passage; passageId: number; seed: number; another: () => void };

export const Story = ({ passage, passageId, seed, another }: StoryProps) => {
  const [progress, setProgress] = useState<Progress>({ phase: "read" });
  const answers = useMemo(() => answersFor(passage, createRng(seed)), [passage, seed]);
  const readMs = useReadingClock(progress.phase === "read");

  const turn = (phase: "read" | "ask") => {
    playSfx("page");
    setProgress({ phase });
  };

  const answer = (picked: Answer) => {
    const spent = readMs();
    updateSave((current) => finishReading(current, passageId, picked.kind, spent));
    playSfx(picked.kind === "other" ? "tile_undo" : "reward");
    setProgress({ phase: "done", picked, reward: rewardFor(picked.kind, wasRead(passage, spent)) });
  };

  if (progress.phase === "read") return <ReadCard passage={passage} done={() => turn("ask")} />;
  if (progress.phase === "ask") {
    return <AskCard passage={passage} answers={answers} answer={answer} back={() => turn("read")} />;
  }
  return <DoneCard passage={passage} picked={progress.picked} reward={progress.reward} another={another} />;
};
