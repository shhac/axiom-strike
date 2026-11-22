import { useState } from "preact/hooks";
import { LUCKY_FACT, MONSTER_FACTS } from "../../content/monsterFacts";
import { MONSTER_NAMES } from "../../content/taunts";
import { FAMILIES, type EnemyKind, type OpFamily } from "../../engine/levels";
import { bookKey, LUCKY_KEY, type Save } from "../../engine/progress";
import { enemyStrip } from "../assets";
import { CampButton, Sprite } from "../common";
import { press } from "../press";

const KINDS: readonly EnemyKind[] = ["minion", "standard", "boss"];
/** This many beaten puts a gold frame round a monster's page. */
const GOLD_AT = 10;

type Page = { key: string; name: string; fact: string; family: OpFamily; kind: EnemyKind; lucky: boolean };

export const PAGES: readonly Page[] = [
  ...FAMILIES.flatMap((family) =>
    KINDS.map((kind) => ({
      key: bookKey(family, kind),
      name: MONSTER_NAMES[family][kind],
      fact: MONSTER_FACTS[family][kind],
      family,
      kind,
      lucky: false,
    })),
  ),
  { key: LUCKY_KEY, name: "Lucky monster", fact: LUCKY_FACT, family: "add", kind: "minion", lucky: true },
];

/** Every monster in the game. One that has not been beaten yet is only a shadow. */
export const Book = ({ save, back }: { save: Save; back: () => void }) => {
  const count = (page: Page) => save.beaten[page.key] ?? 0;
  const [open, setOpen] = useState(() => PAGES.find((page) => count(page) > 0)?.key ?? null);
  const shown = PAGES.find((page) => page.key === open);
  return (
    <div class="camp-sheet" data-phase="book">
      <h1>Monster book</h1>
      <div class="book-grid">
        {PAGES.map((page) => {
          const beaten = count(page);
          return (
            <button
              class={`book-page kind-${page.kind} ${beaten > 0 ? "" : "is-unknown"} ${beaten >= GOLD_AT ? "is-gold" : ""} ${page.lucky ? "is-lucky" : ""} ${open === page.key ? "is-open" : ""}`}
              data-monster={page.key}
              aria-label={beaten > 0 ? `${page.name}, beaten ${beaten} times` : "A monster you have not beaten yet"}
              onClick={press(() => setOpen(page.key))}
            >
              <Sprite strip={enemyStrip(page.family, page.kind)} />
              {beaten > 0 && <b>{beaten}</b>}
            </button>
          );
        })}
      </div>
      <p class="book-fact" data-fact>
        {shown && count(shown) > 0 ? (
          <>
            <b>{shown.name}.</b> {shown.fact}
          </>
        ) : (
          "Beat a monster to fill in its page."
        )}
      </p>
      <div class="result-buttons">
        <CampButton back={back} />
      </div>
    </div>
  );
};
