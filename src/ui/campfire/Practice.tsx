import { useEffect, useRef, useState } from "preact/hooks";
import { tuneLevel } from "../../engine/levels";
import { newPractice, PRACTICE_SECONDS, shoot, skipTarget, type Practice } from "../../engine/practice";
import { heroSpot, recordPractice, tierFor } from "../../engine/progress";
import { icon } from "../assets";
import { playSfx } from "../audio";
import { press } from "../press";
import { localDay, save, updateSave } from "../save";
import { SumPanel } from "../sums/SumPanel";
import { useHint } from "../useHint";

const randomSeed = () => Math.floor(Math.random() * 2 ** 31);
const TICK_MS = 200;
const LAST_SECONDS = 5;

/** Numbers from wherever the hero is on the map, at the size the game would pick for a battle there. */
const practiceLevel = () => {
  const level = heroSpot(save.value);
  return level ? tuneLevel(level, tierFor(save.value, level)) : null;
};

/** Seconds left, counted from when `running` turned true; `done` fires once at zero. */
const useCountdown = (running: boolean, done: () => void) => {
  const [left, setLeft] = useState(PRACTICE_SECONDS);
  const finish = useRef(done);
  finish.current = done;
  useEffect(() => {
    if (!running) return;
    const endsAt = performance.now() + PRACTICE_SECONDS * 1000;
    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((endsAt - performance.now()) / 1000));
      setLeft((before) => {
        // The last few seconds tick, so the end does not come as a surprise.
        if (remaining !== before && remaining > 0 && remaining <= LAST_SECONDS) playSfx("tile_tap", 0.7);
        return remaining;
      });
      if (remaining > 0) return;
      clearInterval(timer);
      finish.current();
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [running]);
  return left;
};

type Phase = "ready" | "running" | "done";

const Ready = ({ start, back }: { start: () => void; back: () => void }) => (
  <div class="overlay" data-phase="practice-ready">
    <div class="result">
      <img class="chest-open" src={icon("target")} alt="" />
      <h1>Target practice</h1>
      <p>Make as many numbers as you can in {PRACTICE_SECONDS} seconds. Three numbers in a sum scores double!</p>
      <p class="practice-best">Best so far: {save.value.practiceBest}</p>
      <div class="result-buttons">
        <button class="btn btn-wide" data-action="camp" onClick={press(back)}>
          Camp
        </button>
        <button class="btn btn-wide btn-go" data-action="start" onClick={press(start)}>
          Start!
        </button>
      </div>
    </div>
  </div>
);

const Done = (props: { score: number; best: boolean; prize: boolean; again: () => void; back: () => void }) => (
  <div class="overlay" data-result="practice">
    <div class="result">
      <h1>{props.best ? "New best!" : "Time!"}</h1>
      <p class="practice-score">{props.score}</p>
      {props.prize && (
        <span class="prizes" data-prizes>
          Today's prize: +1
          <img src={icon("potion")} alt="potion" />
        </span>
      )}
      <div class="result-buttons">
        <button class="btn btn-wide" data-action="camp" onClick={press(props.back)}>
          Camp
        </button>
        <button class="btn btn-wide btn-go" data-action="retry" onClick={press(props.again)}>
          Again
        </button>
      </div>
    </div>
  </div>
);

export const PracticeGame = ({ back }: { back: () => void }) => {
  const [level] = useState(practiceLevel);
  const [phase, setPhase] = useState<Phase>("ready");
  const [practice, setPractice] = useState<Practice | null>(() => (level ? newPractice(level, randomSeed()) : null));
  const [outcome, setOutcome] = useState({ best: false, prize: false });
  const { hint, say } = useHint();
  const score = useRef(0);
  score.current = practice?.score ?? 0;

  const finish = () => {
    const before = save.value;
    updateSave((current) => recordPractice(current, score.current, localDay()));
    setOutcome({ best: score.current > before.practiceBest, prize: save.value.potions > before.potions });
    playSfx("jingle_victory");
    setPhase("done");
  };
  const left = useCountdown(phase === "running", finish);

  if (!level || !practice) return null;

  const fire = () => {
    const shot = shoot(practice);
    setPractice(shot.practice);
    if (shot.gained === 0) {
      playSfx("miss", 0.8);
      return say("Not quite. Try again or skip");
    }
    playSfx(shot.gained > 1 ? "combo" : "hit_light");
  };

  const again = () => {
    setPractice(newPractice(level, randomSeed()));
    setPhase("ready");
  };

  return (
    <div class={`screen stage-${level.region} practice`} data-screen="practice">
      <div class="practice-stage">
        <div class="practice-meter">
          <span class={`practice-clock ${left <= LAST_SECONDS ? "is-ending" : ""}`} data-clock={left}>
            <img src={icon("hourglass")} alt="" />
            {left}
          </span>
          <span class="practice-points" data-score={practice.score} key={practice.score}>
            <img src={icon("target")} alt="" />
            {practice.score}
          </span>
        </div>
        <button class="btn btn-icon lock-back" data-action="camp" aria-label="Back to camp" onClick={press(back)}>
          <img src={icon("undo")} alt="" />
        </button>
        <img class="practice-target" key={practice.made} src={icon("target")} alt="" />
        {hint && <div class="toast">{hint}</div>}
      </div>
      <SumPanel
        board={practice}
        level={level}
        target={practice.target}
        change={(next) => setPractice({ ...practice, ...next })}
        refuse={say}
        corner={
          <button class="btn btn-call" data-action="skip" onClick={press(() => setPractice(skipTarget(practice)))}>
            <img src={icon("hourglass")} alt="" />
            <span>Skip</span>
          </button>
        }
        cast={{ label: "SHOOT!", icon: "target", go: fire }}
      />
      {phase === "ready" && <Ready start={() => setPhase("running")} back={back} />}
      {phase === "done" && <Done score={practice.score} {...outcome} again={again} back={back} />}
    </div>
  );
};
