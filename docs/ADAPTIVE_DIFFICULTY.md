# Adaptive Difficulty System -- Research & Proposal

Research into adaptive difficulty algorithms for Axiom Strike, an educational math fighting game targeting ages 6-12.

---

## 1. Algorithm Landscape

### Elo Rating System (Recommended Foundation)

Originally from chess, the Elo system treats each student-vs-question interaction as a "match." Both the student's ability rating and the question's difficulty rating update after each attempt.

**Core formula:**

```
P(correct) = 1 / (1 + 10^((difficulty - ability) / 400))

-- After an attempt:
ability    += K_student * (outcome - P(correct))
difficulty += K_item    * (P(correct) - outcome)
```

Where `outcome` is 1 (correct) or 0 (incorrect), and `K` controls update speed.

**Why Elo for Axiom Strike:**
- Simple to implement in Lua with no external dependencies
- Works online (updates after every single answer, no batch processing)
- Minimal parameters to tune
- Battle-tested in large-scale educational systems (Klinkenberg et al., 2011; Pelanek, 2016)
- Naturally extends to multiple skill dimensions (one Elo rating per operation type)

**Key extension -- uncertainty-based K:** New players should have a high K (fast adjustment), decaying as confidence grows. Pelanek's uncertainty function:

```
K(n) = K_initial / (1 + c * n)
```

Where `n` is the number of attempts for that skill and `c` is a decay constant (typically 0.05-0.1).

### Bayesian Knowledge Tracing (BKT)

A hidden Markov model with four parameters per skill:
- `P(L0)` -- prior probability the student already knows the skill
- `P(T)` -- probability of learning the skill on each opportunity
- `P(S)` -- probability of a correct answer despite not knowing (slip)
- `P(G)` -- probability of an incorrect answer despite knowing (guess)

BKT is the gold standard in intelligent tutoring systems (Corbett & Anderson, 1994). It explicitly models whether a student has "learned" a skill, which is useful for mastery gating. However, it requires pre-calibrated parameters per skill and is less responsive to continuous difficulty gradients than Elo.

**Verdict:** Too heavy for v1. Consider for future mastery-gating features.

### SPARFA (Sparse Factor Analysis)

Estimates latent concept knowledge from response patterns. Discovers hidden relationships between questions and underlying concepts. Powerful for content analytics but requires batch processing and a substantial data corpus.

**Verdict:** Not suitable for real-time in-game adaptation. Useful post-launch for analysing question quality and discovering skill prerequisites.

### Item Response Theory (IRT)

The psychometric foundation underlying most of these approaches. A 1-parameter IRT model is mathematically equivalent to Elo at equilibrium. IRT is typically used for offline calibration of item banks rather than real-time adaptation.

### Duolingo's Half-Life Regression (HLR)

Models memory decay with a personalised half-life per item. Primarily designed for spaced repetition of factual recall. Less relevant for Axiom Strike's turn-by-turn combat, but the decay concept applies to cross-session skill estimation.

---

## 2. Signals to Track

### Primary Signals

| Signal | What it tells us | How to use it |
|--------|-----------------|---------------|
| **Accuracy** (correct/incorrect) | Core competency signal | Drives Elo updates |
| **Response time** | Fluency vs. effortful computation | Fast + correct = mastered; slow + correct = learning; fast + wrong = careless/guessing |
| **Consecutive failures** (streak) | Frustration risk | Trigger difficulty reduction after 3+ failures |
| **Consecutive successes** (streak) | Boredom risk / ready to advance | Trigger difficulty increase after 5+ successes |
| **Equation optimality** | Depth of understanding | Player who finds the exact match vs. "close enough" is more proficient |
| **Tile usage efficiency** | Strategic thinking | Using fewer tiles to reach the answer suggests stronger number sense |

### Secondary Signals

| Signal | What it tells us |
|--------|-----------------|
| **Session length / quit timing** | Quitting mid-wave suggests frustration; long sessions suggest engagement |
| **Recovery mechanic usage** | Frequent recovery attempts may indicate combat is too hard |
| **Time-of-day patterns** | Performance often dips late in the day for young children |
| **Retry rate** | Replaying completed levels suggests enjoyment or completionism |

### Response Time Thresholds (Calibration Needed)

For a single-digit addition problem, approximate baselines by age:
- Age 6-7: < 8s = fluent, 8-15s = working, > 15s = struggling
- Age 8-9: < 5s = fluent, 5-10s = working, > 10s = struggling
- Age 10-12: < 3s = fluent, 3-7s = working, > 7s = struggling

These need playtesting calibration. The key insight: response time should be a *modifier* on the Elo update, not a separate system.

```
time_factor = clamp(1.0 + (expected_time - actual_time) / expected_time, 0.5, 1.5)
effective_outcome = outcome * time_factor  -- boosts fast correct, penalises slow correct
```

---

## 3. How Existing Games Handle This

### Prodigy Math
- Uses a **placement test** at onboarding to seed initial difficulty
- Maintains students in their **Zone of Proximal Development (ZPD)**
- Drops back to prerequisite skills when students struggle in a specific area
- Difficulty is invisible to the player -- embedded in the RPG combat
- Key lesson: *prerequisite fallback is essential* (if a player struggles with multiplication, check if addition fluency is the real gap)

### Khan Academy
- **Mastery levels:** Attempted -> Familiar -> Proficient -> Mastered
- Mastery Challenges review 3 skills with 2 questions each: 2/2 correct = level up, 0/2 = level down, 1/2 = hold
- Spaced repetition: skills decay from Mastered back to Proficient if not reviewed
- Key lesson: *simple, transparent mastery levels work well for motivation*

### IXL (SmartScore)
- Score 0-100, with 80 = proficient, 90 = excellent, 100 = mastered
- **Asymmetric scoring:** wrong answers at high scores are heavily penalised (losing 8-12 points vs. gaining 2-4 for correct answers above 90)
- "Challenge Zone" at 90+ with harder questions to confirm mastery
- Key lesson: *asymmetric penalties prevent lucky streaks from inflating ability estimates*

### Duolingo
- Half-life regression for spaced repetition scheduling
- A/B tested extensively; 9.5% increase in retention with personalised scheduling
- Key lesson: *cross-session decay matters* -- a player returning after a week should face slightly easier content initially

---

## 4. Adaptation Window

### Within-Session: Exponential Moving Average (last ~8 answers)

A sliding window is too rigid. An exponential moving average (EMA) naturally weights recent answers more heavily:

```
-- After each answer:
running_accuracy = alpha * outcome + (1 - alpha) * running_accuracy
```

With `alpha = 0.2`, the effective window is ~5 answers (the last 5 contribute ~67% of the signal). With `alpha = 0.125`, it is ~8 answers.

**Recommendation:** `alpha = 0.15` (effective window of ~6-7 answers). This is responsive enough to catch frustration spirals but stable enough to avoid whiplash from a single mistake.

### Cross-Session: Elo with Time Decay

Between sessions, ability estimates should decay slightly toward a neutral point, modelling the forgetting curve:

```
days_since_last = (now - last_session_time) / 86400
decay_factor = 0.95 ^ min(days_since_last, 30)  -- caps at 30 days
effective_ability = global_mean + (stored_ability - global_mean) * decay_factor
```

This means:
- 1 day gap: 95% of ability retained (negligible)
- 7 day gap: ~70% retained (noticeable easing)
- 30+ day gap: ~21% retained (near-reset, gentle reintroduction)

### Streak-Based Circuit Breakers

Regardless of what the Elo says, hard-coded guardrails prevent frustration/boredom:

- **3 consecutive failures on same difficulty:** immediately drop difficulty by one step
- **5 consecutive successes:** increase difficulty by one step
- **2 consecutive failures after a difficulty increase:** revert the increase (the jump was too aggressive)

These override the smooth Elo-based progression and act as safety valves.

---

## 5. Math-to-Reading Level Mapping

### The Research

Reading and math co-develop during elementary school, but the correlation is moderate (r ~ 0.5-0.7 depending on the study). Key findings:
- Reading ability promotes math achievement, but not strongly the reverse
- The correlation is strongest for word problems and conceptual understanding, weakest for pure computation
- Executive function (working memory, attention) is the shared underlying factor

### Proposed Mapping

Since Axiom Strike's math is pure computation (no word problems), the correlation is weaker. The reading mechanic (recovery phase) should use a **separate but linked** difficulty track:

```
-- Grade-equivalent mapping
math_grade = math_elo_to_grade(player.math_elo)
-- e.g., Elo 800 = Grade 1, 1000 = Grade 2, 1200 = Grade 3, etc.

-- Default: reading grade trails math grade by 0.5
reading_grade = math_grade - 0.5

-- Clamp to valid range
reading_grade = clamp(reading_grade, 1.0, 6.0)
```

**Why trail by 0.5 grades:** A child advanced in computation may not be equally advanced in reading. Defaulting slightly below avoids frustrating a "math brain" kid with hard text. The 0.5 offset is a starting assumption; the reading difficulty should independently adapt based on reading comprehension accuracy.

### Independent Reading Adaptation

Once the player has answered 3+ reading comprehension questions, the reading difficulty should track independently:

```
if reading_attempts >= 3 then
  -- Use reading-specific performance
  reading_grade = reading_elo_to_grade(player.reading_elo)
else
  -- Infer from math
  reading_grade = math_elo_to_grade(player.math_elo) - 0.5
end
```

### Grade-to-Lexile Approximate Mapping

| Grade | Age | Lexile Range | Text Characteristics |
|-------|-----|-------------|---------------------|
| 1 | 6-7 | 190-530L | Simple sentences, common words, 2-3 sentences |
| 2 | 7-8 | 420-650L | Short paragraphs, some compound sentences |
| 3 | 8-9 | 520-820L | Multiple paragraphs, varied vocabulary |
| 4 | 9-10 | 740-940L | Longer passages, inference required |
| 5 | 10-11 | 830-1010L | Complex sentence structure, domain vocabulary |
| 6 | 11-12 | 925-1070L | Abstract concepts, multi-paragraph reasoning |

---

## 6. Cold Start Problem

### Strategy: Lightweight Adaptive Placement (No Formal Test)

A formal placement test is boring and feels like school. Instead, use the first 2-3 combat encounters as a stealth assessment.

### Phase 1: Age-Based Prior (Before First Answer)

```
-- Player selects age or "school year" during character creation
-- This sets the Elo prior for all skills
age_priors = {
  [6]  = { add = 900,  sub = 800,  mul = 700,  div = 700  },
  [7]  = { add = 1000, sub = 900,  mul = 750,  div = 700  },
  [8]  = { add = 1100, sub = 1000, mul = 900,  div = 800  },
  [9]  = { add = 1200, sub = 1100, mul = 1000, div = 900  },
  [10] = { add = 1300, sub = 1200, mul = 1100, div = 1000 },
  [11] = { add = 1400, sub = 1300, mul = 1200, div = 1100 },
  [12] = { add = 1400, sub = 1400, mul = 1300, div = 1200 },
}
```

### Phase 2: High-K Calibration (First ~10 Answers per Skill)

During the first encounters, K is set high (K=80 vs. steady-state K=20-30) so the system converges quickly. The first world map region should use addition, so the player gets ~10 addition answers in before any consequential difficulty decisions.

### Phase 3: Skill Transfer Priors

When a player encounters multiplication for the first time, seed the Elo from their addition performance (with an offset):

```
function seed_new_skill(player, new_skill, base_skill, offset)
  player.elo[new_skill] = player.elo[base_skill] + offset
  player.attempts[new_skill] = 0  -- high K for new skill
end

-- When entering Multiplication Caves:
seed_new_skill(player, "mul", "add", -200)
```

### Phase 4: Region Selection as Implicit Placement

Players can jump to any region on the world map. If a player jumps straight to Multiplication Caves, they are implicitly signalling confidence. Seed their multiplication Elo slightly higher than the age-based default.

---

## 7. Proposed Algorithm -- Complete Pseudocode

### Data Structures

```lua
-- Per-player, per-skill state
PlayerSkill = {
  elo = 1000,           -- current ability estimate
  attempts = 0,         -- total attempts for this skill
  running_accuracy = 0.5, -- EMA of recent accuracy
  running_speed = 1.0,  -- EMA of speed factor (1.0 = expected)
  streak = 0,           -- positive = consecutive correct, negative = consecutive wrong
  last_played = os.time(),
}

-- Per-question difficulty (pre-calibrated, updated at runtime)
Question = {
  elo = 1000,           -- difficulty rating
  skill = "add",        -- which skill dimension
  number_range = {1, 20}, -- operand range
  operators = {"+"},    -- allowed operators
}
```

### Core Update Function

```lua
function update_after_answer(player, skill, question, correct, time_taken)
  local ps = player.skills[skill]

  -- 1. Apply cross-session decay if returning
  local days_away = (os.time() - ps.last_played) / 86400
  if days_away > 0.5 then
    local decay = math.pow(0.95, math.min(days_away, 30))
    ps.elo = 1000 + (ps.elo - 1000) * decay
  end

  -- 2. Calculate expected probability
  local expected = 1.0 / (1.0 + math.pow(10, (question.elo - ps.elo) / 400))

  -- 3. Compute outcome with time factor
  local expected_time = get_expected_time(skill, question.elo)
  local time_factor = clamp(1.0 + (expected_time - time_taken) / expected_time, 0.5, 1.5)
  local outcome = correct and 1 or 0
  local effective_outcome = outcome * time_factor

  -- 4. Uncertainty-based K
  local K = 80 / (1 + 0.05 * ps.attempts)  -- starts at 80, decays toward ~16
  K = math.max(K, 16)  -- floor

  -- 5. Update Elo
  ps.elo = ps.elo + K * (effective_outcome - expected)
  ps.elo = clamp(ps.elo, 400, 2000)  -- hard bounds

  -- 6. Update question difficulty (smaller K, slower drift)
  question.elo = question.elo + 4 * (expected - outcome)

  -- 7. Update running stats
  local alpha = 0.15
  ps.running_accuracy = alpha * outcome + (1 - alpha) * ps.running_accuracy
  ps.running_speed = alpha * time_factor + (1 - alpha) * ps.running_speed

  -- 8. Update streak
  if correct then
    ps.streak = math.max(ps.streak, 0) + 1
  else
    ps.streak = math.min(ps.streak, 0) - 1
  end

  -- 9. Bookkeeping
  ps.attempts = ps.attempts + 1
  ps.last_played = os.time()
end
```

### Question Selection

```lua
function select_next_question(player, skill, question_bank)
  local ps = player.skills[skill]
  local target_elo = ps.elo

  -- Apply circuit breakers
  if ps.streak <= -3 then
    -- Frustration: target easier questions
    target_elo = target_elo - 150
  elseif ps.streak >= 5 then
    -- Boredom: target harder questions
    target_elo = target_elo + 100
  end

  -- Target ~70% success rate (slightly above chance, in the ZPD)
  -- P(correct) = 0.70 => question.elo = player.elo - 74
  -- But we want variety, so target a range
  local ideal_difficulty = target_elo - 74  -- for ~70% success

  -- Score all questions in the skill bank
  local scored = {}
  for _, q in ipairs(question_bank[skill]) do
    local distance = math.abs(q.elo - ideal_difficulty)
    local recency_penalty = recently_seen(q) and 200 or 0
    table.insert(scored, { q = q, score = distance + recency_penalty })
  end

  -- Sort and pick from top 5 with some randomness
  table.sort(scored, function(a, b) return a.score < b.score end)
  local pick = math.random(1, math.min(5, #scored))
  return scored[pick].q
end
```

### Difficulty Dimensions & Question Generation

```lua
-- Instead of a fixed question bank, generate questions parametrically
function generate_question(skill, target_elo)
  local params = elo_to_params(skill, target_elo)
  -- Returns: operand ranges, operator set, number of terms, etc.

  return {
    elo = target_elo,
    skill = skill,
    weakness_number = generate_target(params),
    tiles = generate_solvable_hand(params),
  }
end

-- Elo-to-parameter mapping (the heart of difficulty scaling)
function elo_to_params(skill, elo)
  if skill == "add" then
    if elo < 800 then
      return { max_operand = 5, terms = 2, operators = {"+"} }
    elseif elo < 1000 then
      return { max_operand = 10, terms = 2, operators = {"+"} }
    elseif elo < 1200 then
      return { max_operand = 20, terms = 2, operators = {"+"} }
    elseif elo < 1400 then
      return { max_operand = 50, terms = 2, operators = {"+"} }
    else
      return { max_operand = 99, terms = 3, operators = {"+"} }
    end
  elseif skill == "sub" then
    -- Similar but offset: subtraction is harder
    if elo < 850 then
      return { max_operand = 5, terms = 2, operators = {"-"} }
    elseif elo < 1050 then
      return { max_operand = 10, terms = 2, operators = {"-"} }
    -- ...
    end
  elseif skill == "mul" then
    if elo < 900 then
      return { max_operand = 5, terms = 2, operators = {"*"} }
    elseif elo < 1100 then
      return { max_operand = 10, terms = 2, operators = {"*"} }
    elseif elo < 1300 then
      return { max_operand = 12, terms = 2, operators = {"*"} }
    else
      return { max_operand = 20, terms = 2, operators = {"*"} }
    end
  -- div, fractions, negatives follow similar patterns
  end
end
```

### Enemy Difficulty Assignment

```lua
function assign_enemy_difficulty(player, wave_index, region_skill)
  local ps = player.skills[region_skill]

  -- Base enemy difficulty tracks player ability
  local base_elo = ps.elo

  -- Slight ramp within a wave (enemies get harder)
  local ramp = wave_index * 30  -- +30 Elo per enemy in the wave

  -- Boss enemies are +150 Elo
  local boss_bonus = is_boss and 150 or 0

  local enemy_elo = base_elo + ramp + boss_bonus

  return {
    weakness = generate_question("attack", region_skill, enemy_elo),
    attack = generate_question("defend", region_skill, enemy_elo - 50),
    -- Defense (decomposition) is slightly easier than attack (construction)
    hp = scale_hp(enemy_elo),
  }
end
```

### Session Wrapper

```lua
function on_session_start(player)
  -- Apply cross-session decay to all skills
  for skill, ps in pairs(player.skills) do
    local days_away = (os.time() - ps.last_played) / 86400
    if days_away > 0.5 then
      local decay = math.pow(0.95, math.min(days_away, 30))
      ps.elo = 1000 + (ps.elo - 1000) * decay
      -- Also decay streak to zero (fresh start each session)
      ps.streak = 0
    end
  end
end

function on_session_end(player)
  -- Persist all skill states
  save_player(player)
end
```

---

## 8. Tuning Parameters Summary

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Initial Elo | 1000 (adjusted by age) | Standard Elo baseline |
| K initial | 80 | Fast convergence for new players |
| K floor | 16 | Prevents stagnation |
| K decay constant | 0.05 | ~15 attempts to halve from initial |
| EMA alpha | 0.15 | Effective window of ~6-7 answers |
| Cross-session decay | 0.95/day | Gentle reintroduction after absence |
| Target success rate | ~70% | Research-backed ZPD sweet spot |
| Frustration threshold | 3 consecutive failures | Immediate difficulty drop |
| Boredom threshold | 5 consecutive successes | Difficulty increase |
| Elo floor/ceiling | 400 / 2000 | Prevents runaway ratings |
| Reading grade offset | -0.5 from math grade | Conservative default |

---

## 9. Implementation Priorities

### v1 (MVP)
1. Per-skill Elo with uncertainty-based K
2. Age-based cold start priors
3. Parametric question generation from Elo
4. Streak-based circuit breakers
5. Cross-session time decay
6. Reading level inferred from math Elo (with manual override setting)

### v2 (Post-Launch, Data-Driven)
1. Calibrate time thresholds from real player data
2. Independent reading Elo once enough data exists
3. Skill transfer priors (use addition performance to seed multiplication)
4. Question-level difficulty calibration from aggregate player data
5. Session-level analytics (quit prediction, engagement scoring)

### v3 (Future)
1. BKT-style mastery gating for prerequisite skills
2. SPARFA-style content analytics for question bank quality
3. Spaced repetition scheduling for cross-session skill review
4. A/B testing framework for parameter tuning

---

## Sources

- [Pelanek - Applications of the Elo Rating System in Adaptive Educational Systems (PDF)](https://www.fi.muni.cz/~xpelanek/publications/CAE-elo.pdf)
- [Elo Rating Algorithm for Measuring Task Difficulty in Online Learning](https://www.researchgate.net/publication/339667564_Elo_Rating_Algorithm_for_the_Purpose_of_Measuring_Task_Difficulty_in_Online_Learning_Environments)
- [Keeping Elo Alive: Evaluating Measurement Properties of Learning Systems](https://pmc.ncbi.nlm.nih.gov/articles/PMC12784335/)
- [Dynamic K Value Approach for Elo in Adaptive Learning](https://link.springer.com/article/10.1007/s11257-025-09439-z)
- [Duolingo - Half-Life Regression for Spaced Repetition](https://research.duolingo.com/papers/settles.acl16.pdf)
- [Duolingo - How We Learn How You Learn](https://blog.duolingo.com/how-we-learn-how-you-learn/)
- [SPARFA: Sparse Factor Analysis for Learning and Content Analytics](https://jmlr.org/papers/volume15/lan14a/lan14a.pdf)
- [Prodigy Math - Is Prodigy Math Adaptive? Our Algorithm Explained](https://www.prodigygame.com/main-en/blog/is-prodigy-math-adaptive)
- [Khan Academy - How Mastery Levels Work](https://support.khanacademy.org/hc/en-us/articles/5548760867853--How-do-Khan-Academy-s-Mastery-levels-work)
- [Khan Academy Efficacy Results 2024](https://blog.khanacademy.org/khan-academy-efficacy-results-november-2024/)
- [IXL SmartScore Guide (PDF)](https://www.ixl.com/materials/SmartScore_Guide.pdf)
- [IXL - How Does the SmartScore Work?](https://www.ixl.com/help-center/article/1272663/how_does_the_smartscore_work)
- [Flow Optimizer Framework for Serious Games (2026)](https://journals.sagepub.com/doi/10.1177/2161783X251414444)
- [Jenova Chen - Flow in Games (Thesis)](https://www.jenovachen.com/flowingames/Flow_in_games_final.pdf)
- [Gamified Solution to Cold-Start Problem in ITS](https://pmc.ncbi.nlm.nih.gov/articles/PMC7334724/)
- [Alleviating Cold Start with Data-Driven Difficulty Estimates](https://link.springer.com/article/10.1007/s42113-021-00101-6)
- [Developmental Dynamics Between Reading and Math in Elementary School](https://pmc.ncbi.nlm.nih.gov/articles/PMC7725923/)
- [Fairness of BKT for Math Learners of Different Reading Ability (EDM 2025)](https://educationaldatamining.org/EDM2025/proceedings/2025.EDM.long-papers.158/index.html)
- [Multivariate Elo-based Learner Model for Adaptive Educational Systems](https://files.eric.ed.gov/fulltext/ED599177.pdf)
