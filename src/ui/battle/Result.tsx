import type { BattleState } from "../../engine/battle";
import { findLevel, nextLevel } from "../../engine/levels";
import { icon } from "../assets";
import { MapButton, Prizes, Stars } from "../common";
import { enterBattle, goToCamp } from "../nav";
import { press } from "../press";
import { save } from "../save";

export const Result = ({ state }: { state: BattleState }) => {
  if (state.phase === "player") return null;
  const won = state.phase === "won";
  const next = nextLevel(state.level);
  // The level on screen may carry tuned numbers; replaying starts again from the level as designed.
  const level = findLevel(state.level.id);
  const storyWaiting = won && save.value.stories > 0;
  return (
    <div class="overlay" data-result={state.phase}>
      <div class="result">
        <h1>{won ? "Victory!" : "So close!"}</h1>
        {won ? <Stars count={state.stars} label stagger /> : <p>The monsters won this round. You can beat them!</p>}
        {storyWaiting && <Prizes lead="A campfire story is waiting. Read it to win" />}
        <div class="result-buttons">
          <MapButton />
          {storyWaiting && (
            <button class="btn btn-wide btn-fire" data-action="campfire" onClick={press(() => goToCamp("story"))}>
              <img src={icon("campfire")} alt="" />
              Story time
            </button>
          )}
          {won && next ? (
            <button class="btn btn-wide btn-go" data-action="next" onClick={() => enterBattle(next)}>
              Next level
            </button>
          ) : (
            <button class="btn btn-wide btn-go" data-action="retry" onClick={() => enterBattle(level)}>
              {won ? "Play again" : "Try again"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
