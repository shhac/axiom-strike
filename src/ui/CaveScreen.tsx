import { useEffect, useState } from "preact/hooks";
import { caveId, caveLevel, caveRiddles, caveStars, CAVE_ROUNDS, isRight, type Riddle } from "../engine/cave";
import { writeSum } from "../engine/equation";
import { showNumber } from "../engine/fractions";
import { findRegion } from "../engine/levels";
import { recordCave } from "../engine/progress";
import { icon } from "./assets";
import { playMusic, playSfx } from "./audio";
import { MapButton, Num, Pips, Prizes, Stars } from "./common";
import { goTo, visiting } from "./nav";
import { press } from "./press";
import { save, updateSave } from "./save";
import { randomSeed } from "./seed";

type Said = { possible: boolean; right: boolean };

/** After an answer: whether it was right, and one way to make the number if there is one. */
const Verdict = ({ riddle, said, next, last }: { riddle: Riddle; said: Said; next: () => void; last: boolean }) => (
  <div class={`cave-verdict ${said.right ? "is-right" : "is-wrong"}`} data-verdict={said.right ? "right" : "wrong"}>
    <b>{said.right ? "Sharp eye!" : "Not this time"}</b>
    {riddle.answer ? (
      <span class="cave-way">
        It can be made:
        <Num
          value={`${writeSum(
            riddle.answer.tiles.map((index) => riddle.hand[index] ?? 0),
            riddle.answer.ops,
          )}=${showNumber(riddle.target)}`}
        />
      </span>
    ) : (
      <span class="cave-way">No sum of these makes {showNumber(riddle.target)}</span>
    )}
    <button class="btn btn-wide btn-go" data-action="next" onClick={press(next)}>
      {last ? "Finish" : "Next"}
    </button>
  </div>
);

const Finished = ({ right, firstClear, again }: { right: number; firstClear: boolean; again: () => void }) => {
  const stars = caveStars(right);
  return (
    <div class="overlay" data-result="cave">
      <div class="result">
        <h1>{stars > 0 ? "Cave cleared!" : "So close!"}</h1>
        <p>
          You got {right} of {CAVE_ROUNDS} right
        </p>
        <Stars count={stars} label stagger />
        {firstClear && stars > 0 && <Prizes lead="First clear! You win" />}
        <div class="result-buttons">
          <MapButton />
          <button class="btn btn-wide btn-go" data-action="retry" onClick={press(again)}>
            Play again
          </button>
        </div>
      </div>
    </div>
  );
};

export const CaveScreen = () => {
  useEffect(() => playMusic("music_calm"), []);
  const land = visiting.value;
  const region = findRegion(land);
  const level = caveLevel(land);
  const [riddles, setRiddles] = useState(() => caveRiddles(level, randomSeed()));
  const [round, setRound] = useState(0);
  const [right, setRight] = useState(0);
  const [said, setSaid] = useState<Said | null>(null);
  const [firstClear] = useState(() => !save.value.stars[caveId(land)]);
  const riddle = riddles[round];
  const finished = round >= riddles.length;

  const answer = (possible: boolean) => {
    if (!riddle || said) return;
    const correct = isRight(riddle, possible);
    playSfx(correct ? "reward" : "miss");
    setSaid({ possible, right: correct });
    if (correct) setRight(right + 1);
  };

  const next = () => {
    setSaid(null);
    setRound(round + 1);
    if (round + 1 < riddles.length) return;
    playSfx("jingle_victory");
    updateSave((current) => recordCave(current, caveId(land), caveStars(right)));
  };

  const again = () => {
    setRiddles(caveRiddles(level, randomSeed()));
    setRound(0);
    setRight(0);
  };

  return (
    <div class={`screen stage-${land} cave`} data-screen="cave">
      <button
        class="btn btn-icon lock-back"
        data-action="map"
        aria-label="Back to the map"
        onClick={press(() => goTo("map"))}
      >
        <img src={icon("undo")} alt="" />
      </button>
      <div class="cave-card">
        <header class="cave-head">
          <h1>{region.label} cave</h1>
          <Pips
            count={riddles.length}
            now={round}
            label={`Riddle ${Math.min(round + 1, CAVE_ROUNDS)} of ${CAVE_ROUNDS}`}
          />
        </header>
        {riddle && (
          <>
            <p class="cave-ask">
              Can these make
              <Num class="cave-target" value={riddle.target} />?
            </p>
            <div class="tiles cave-tiles" data-riddle={round}>
              {riddle.hand.map((value) => (
                <span class="tile">
                  <Num value={value} />
                </span>
              ))}
              <span class="cave-signs">
                with
                {level.ops.map((op) => (
                  <Num value={op} />
                ))}
              </span>
            </div>
            {said ? (
              <Verdict riddle={riddle} said={said} next={next} last={round + 1 >= riddles.length} />
            ) : (
              <div class="cave-answers">
                <button class="btn btn-wide btn-go" data-answer="yes" onClick={() => answer(true)}>
                  <img src={icon("check")} alt="" />
                  Yes!
                </button>
                <button class="btn btn-wide btn-no" data-answer="no" onClick={() => answer(false)}>
                  <img src={icon("cross")} alt="" />
                  Impossible!
                </button>
              </div>
            )}
          </>
        )}
      </div>
      {finished && <Finished right={right} firstClear={firstClear} again={again} />}
    </div>
  );
};
