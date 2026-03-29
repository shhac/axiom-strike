# Reading Corpus Pipeline

How to source, chunk, level-tag, and generate questions for the recovery mechanic.

---

## Public Domain Sources

### Primary (safest for all 4 markets)

- **Project Gutenberg** (~70K+ ebooks) — children's literature, fables, fairy tales, science writing
- **Project Gutenberg Australia** — covers works PD under Australian law
- **Standard Ebooks** — beautifully formatted PD books, CC0 production
- **US Government** (NASA, USGS, NOAA, Smithsonian) — PD by default (17 USC §105)
- **Baldwin Project** (mainlesson.com) — curated PD children's literature
- **Wikisource** — proofread PD text transcriptions

### Best Content Seams (ages 6-12)

- Fables/fairy tales: Aesop, Grimm, Andersen, Lang's Fairy Books
- Classic children's novels: Treasure Island, Jungle Book, Peter Pan, Wind in the Willows
- Science/nature: Fabre's insect books, US government educational materials
- History: Early 20th century textbooks (many on Gutenberg)
- Poetry: Stevenson's *A Child's Garden of Verses*, Edward Lear, Lewis Carroll

---

## Legal Safety Rule

**Only use works where the author died before 1955.** This guarantees PD in all four jurisdictions (UK, Canada, Australia, USA) under life + 70 rules.

Tag every passage with `pd_confidence`:
- `"universal"` — author died before 1955, or CC0, or US government
- `"us_only"` — PD in US but not confirmed elsewhere
- `"needs_review"` — uncertain

**Ship only `"universal"` passages.**

---

## Reading Level System

**Use Flesch-Kincaid Grade Level as internal canonical measure**, with Dale-Chall as secondary (more reliable for children's text because it uses a familiar-word list).

| FK Grade | Age | US Grade | UK Year | Aus Year | CAN Grade |
|----------|-----|----------|---------|----------|-----------|
| 1 | 6-7 | 1st | Year 2 | Year 1 | Grade 1 |
| 2 | 7-8 | 2nd | Year 3 | Year 2 | Grade 2 |
| 3 | 8-9 | 3rd | Year 4 | Year 3 | Grade 3 |
| 4 | 9-10 | 4th | Year 5 | Year 4 | Grade 4 |
| 5 | 10-11 | 5th | Year 6 | Year 5 | Grade 5 |
| 6 | 11-12 | 6th | Year 7 | Year 6 | Grade 6 |

### Ensemble Scoring

```python
consensus_grade = weighted_average(
    flesch_kincaid_grade * 0.3,
    dale_chall_grade * 0.4,       # highest weight — best for children
    coleman_liau_index * 0.15,
    automated_readability_index * 0.15
)
```

**Tool:** `textstat` (Python, MIT licensed) implements all formulas.

---

## Passage Word Counts (for 45s average reading window)

| Difficulty Band | Target Words | Approx Grade |
|-----------------|-------------|--------------|
| Easy | 50-70 | 1-2 |
| Medium-Easy | 70-100 | 3-4 |
| Medium | 90-120 | 4-5 |
| Medium-Hard | 100-140 | 5-6 |
| Hard | 120-160 | 6-7 |

---

## Question Generation

### 5-Option Structure

1 correct, 1 almost-right, 1 reasonable-but-wrong, 2 clearly-wrong.

### Approach: LLM-Assisted (at build time, not runtime)

1. Feed passage + grade level to an LLM with structured prompt
2. Output: question stem, correct answer, almost-right distractor, 3 wrong distractors as JSON
3. Validate: correct answer must be extractable from passage, all options distinct
4. Second LLM pass reviews first LLM's output for quality
5. Human review of 10-20% sample + all flagged items

### Data Format

```json
{
  "id": "gutenberg-aesop-042-chunk-003",
  "text": "The passage text...",
  "word_count": 95,
  "grade_level": 3,
  "subject": "literature",
  "pd_confidence": "universal",
  "questions": [{
    "stem": "Why did the fox say the grapes were sour?",
    "correct": "Because he could not reach them",
    "almost_right": "Because he had already eaten too many",
    "wrong": ["Because grapes are always sour", "Because the farmer told him", "Because they were not ripe yet"]
  }]
}
```

---

## Pipeline Steps

| Phase | Effort | Description |
|-------|--------|-------------|
| 1. Source acquisition | 1-2 days | Script Gutenberg downloads, US gov scraping |
| 2. Pre-filter | 2-3 days | Strip headers, remove archaic/inappropriate content |
| 3. Chunk | 2-3 days | Paragraph-aligned, semantically complete chunks |
| 4. Level-tag | 1 day | Ensemble readability scoring via textstat |
| 5. Generate Q&A | 3-5 days | LLM batch generation + validation (~$50-150 API cost) |
| 6. Review | 5-10 days | Human review of flagged items (bottleneck) |
| 7. Package | 1 day | JSON serialization for Defold |
| **Total** | **~3-4 weeks** | Single person, parallelizable |

Target corpus: 2,000-5,000 passages with questions.
