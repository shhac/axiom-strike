import { useMemo, useState } from "preact/hooks";
import type { Passage } from "../../content/passages";
import { answersFor, finishReading, rewardFor, wasRead, type Answer, type Reward } from "../../engine/campfire";
import { createRng } from "../../engine/rng";
import { icon } from "../assets";
import { playSfx } from "../audio";
import { MapButton, Prizes } from "../common";
import { save, updateSave } from "../save";
import { useReadingClock } from "./readingClock";

type Progress = { phase: "read" } | { phase: "ask" } | { phase: "done"; picked: Answer; reward: Reward };

const HEADLINES: Record<Answer["kind"], string> = {
  correct: "Spot on!",
  almost: "So close!",
  other: "Not quite",
};

const WHY: Record<Answer["kind"], string> = {
  correct: "Your prize for the right answer:",
  almost: "Your prize for a near answer:",
  other: "Your prize for reading carefully:",
};

const RewardLine = ({ reward, kind }: { reward: Reward; kind: Answer["kind"] }) => {
  if (reward.potions + reward.scrolls === 0) {
    return <p class="reward-none">No prize this time. Take your time with the next story and there will be one.</p>;
  }
  return (
    <div class="reward">
      <span class="reward-why">{WHY[kind]}</span>
      <div class="reward-items" data-reward={`${reward.potions}-${reward.scrolls}`}>
        {reward.potions > 0 && (
          <span>
            <img src={icon("potion")} alt="" />
            <b>+1 Potion</b>
            <small>heals you in battle</small>
          </span>
        )}
        {reward.scrolls > 0 && (
          <span>
            <img src={icon("hint")} alt="" />
            <b>+1 Hint scroll</b>
            <small>shows you an answer</small>
          </span>
        )}
      </div>
    </div>
  );
};

/** Longer stories are set a little smaller, in two steps, so each fits the card on a phone without scrolling. */
const textSize = (text: string) => {
  if (text.length > 520) return "is-longest";
  return text.length > 400 ? "is-long" : "";
};

const ReadCard = ({ passage, done }: { passage: Passage; done: () => void }) => (
  <div class="scroll-card" data-phase="read">
    <div class="scroll-top">
      <span class="scroll-subject">{passage.subject}</span>
      <Prizes lead="Read, then answer to win" />
    </div>
    <p class={`scroll-text ${textSize(passage.text)}`}>{passage.text}</p>
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
    <div class="scroll-top">
      <p class="scroll-question">{props.passage.question}</p>
      <Prizes lead="Win" />
    </div>
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
    <RewardLine reward={props.reward} kind={props.picked.kind} />
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
    const reward = rewardFor(picked.kind, wasRead(passage, spent));
    const items = reward.potions + reward.scrolls;
    playSfx(items > 0 ? "reward" : "tile_undo");
    // A second chime as the second prize pops in.
    if (items > 1) setTimeout(() => playSfx("star"), 260);
    setProgress({ phase: "done", picked, reward });
  };

  if (progress.phase === "read") return <ReadCard passage={passage} done={() => turn("ask")} />;
  if (progress.phase === "ask") {
    return <AskCard passage={passage} answers={answers} answer={answer} back={() => turn("read")} />;
  }
  return <DoneCard passage={passage} picked={progress.picked} reward={progress.reward} another={another} />;
};
