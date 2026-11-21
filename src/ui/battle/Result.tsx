import type { BattleState } from "../../engine/battle";
import { findLevel, nextLevel } from "../../engine/levels";
import { icon } from "../assets";
import { MapButton } from "../common";
import { enterBattle, goTo } from "../nav";
import { press } from "../press";
import { save } from "../save";

export const Result = ({ state }: { state: BattleState }) => {
  if (state.phase === "player") return null;
  const won = state.phase === "won";
  const next = nextLevel(state.level);
  // The level on screen may carry tuned numbers; replaying starts again from the level as designed.
  const level = findLevel(state.level.id);
  return (
    <div class="overlay" data-result={state.phase}>
      <div class="result">
        <h1>{won ? "Victory!" : "So close!"}</h1>
        {won ? (
          <div class="stars" aria-label={`${state.stars} of 3 stars`}>
            {[1, 2, 3].map((n) => (
              <img
                src={icon(n <= state.stars ? "star" : "star_empty")}
                alt=""
                style={{ animationDelay: `${n * 180}ms` }}
              />
            ))}
          </div>
        ) : (
          <p>The monsters won this round. You can beat them!</p>
        )}
        <div class="result-buttons">
          <MapButton />
          {won && save.value.stories > 0 && (
            <button class="btn btn-wide btn-fire" data-action="campfire" onClick={press(() => goTo("campfire"))}>
              <img src={icon("campfire")} alt="" />
              Story
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
