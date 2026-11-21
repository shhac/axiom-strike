import type { BattleState } from "../../engine/battle";
import { nextLevel } from "../../engine/levels";
import { icon } from "../assets";
import { playSfx } from "../audio";
import { goTo } from "../nav";
import { startBattle } from "../store";

const backToMap = () => {
  playSfx("button");
  goTo("map");
};

export const Result = ({ state }: { state: BattleState }) => {
  if (state.phase === "player") return null;
  const won = state.phase === "won";
  const next = nextLevel(state.level);
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
          <button class="btn btn-wide" data-action="map" onClick={backToMap}>
            Map
          </button>
          {(!won || !next) && (
            <button class="btn btn-wide btn-go" data-action="retry" onClick={() => startBattle(state.level)}>
              {won ? "Play again" : "Try again"}
            </button>
          )}
          {won && next && (
            <button class="btn btn-wide btn-go" data-action="next" onClick={() => startBattle(next)}>
              Next level
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
