# Recovery Mechanic Balancing

Research-backed proposal for the reading comprehension recovery mechanic.

---

## Core Problem

Tying HP recovery to reading comprehension means weak readers get punished with lower HP, creating a negative feedback loop. The mechanic must reward effort, not just correctness.

## Key Research Findings

- **Self-Determination Theory (Deci & Ryan):** If a child reads for 30-60s and gets zero reward, it thwarts their sense of competence, leading toward learned helplessness.
- **Productive Failure (Kapur):** Failure leads to better long-term learning, but only when it's *productive* — the child still gets something from the attempt.
- **Growth Mindset (Moser et al.):** Children show enhanced attention to mistakes, but only if mistakes don't feel catastrophic.
- **NSF study:** Reading ability in math software leads to "unexpected and inequitable outcomes" when skills are coupled.

---

## Proposed Model: Effort + Comprehension

Split recovery into base reward (for engaging) and comprehension bonus:

```
total_recovery = base_recovery + comprehension_bonus

base_recovery       = 30% of max_recovery  (awarded for reading the passage)
comprehension_bonus = answer_quality * 70% of max_recovery
```

### Answer Quality Scores

| Answer Quality | Description | Score | Recovery (of 100 HP) |
|---|---|---|---|
| Correct | Right answer | 1.00 | 100 HP |
| Almost right | Close distractor | 0.75 | 82 HP |
| Reasonable | Plausible but wrong | 0.40 | 58 HP |
| Wrong | Clearly incorrect | 0.15 | 40 HP |
| Wrong | Clearly incorrect | 0.15 | 40 HP |

5-option breakdown: 1 correct, 1 almost-right, 1 reasonable-but-wrong, 2 clearly-wrong.

### Streak Bonus

Consecutive correct/almost-right answers earn +3% per streak, capped at +15% (5 in a row). Rewards improvement trajectory, not single events.

---

## Adaptive Timer

```
reading_time = base_time * reading_speed_multiplier

base_time: 30s (for age-appropriate text)
multiplier: starts at 1.0
  - Correct with time remaining: -0.1 (min 0.8x)
  - Wrong and used all time: +0.1 (max 2.0x)
```

Present as a **progress bar that fills up** ("keep reading!"), not a countdown. Player can tap "I'm ready" early.

---

## Implementation (Lua)

```lua
BASE_EFFORT_FRACTION = 0.30
COMPREHENSION_FRACTION = 0.70
STREAK_BONUS_CAP = 0.15

ANSWER_SCORES = {
  correct       = 1.00,
  almost_right  = 0.75,
  reasonable    = 0.40,
  wrong         = 0.15,
}

function calculate_recovery(max_recovery, answer_quality, streak_count)
  local score = ANSWER_SCORES[answer_quality]
  local base = max_recovery * BASE_EFFORT_FRACTION
  local comprehension = max_recovery * COMPREHENSION_FRACTION * score
  local streak = max_recovery * math.min(streak_count * 0.03, STREAK_BONUS_CAP)
  return math.floor(math.min(base + comprehension + streak, max_recovery))
end
```

---

## Failure Framing (UI)

- **Wrong:** Character says "Hmm, not quite! It was actually [X]. Good effort reading!" + 40% recovery animation
- **Almost right:** "So close! The answer was [X]. Sharp thinking!" + 82% recovery animation
- **Correct:** Character celebrates + full recovery animation
- **Never show "0 HP recovered."** Minimum animation always shows some healing.

---

## Additional Recommendation

Make between-waves recovery **automatic with no question** — just the base 30% for free. This way the reading mechanic is framed as a *bonus opportunity* rather than a survival requirement. The in-wave recovery (1x per wave, player-initiated) is where the full mechanic plays out.
