local M = {}

M.BASE_EFFORT_FRACTION = 0.30
M.COMPREHENSION_FRACTION = 0.70
M.STREAK_BONUS_CAP = 0.15

M.ANSWER_SCORES = {
	correct       = 1.00,
	almost_right  = 0.75,
	reasonable    = 0.40,
	wrong         = 0.15,
}

M.FEEDBACK = {
	correct      = "Excellent! Full recovery!",
	almost_right = "So close! Great effort!",
	reasonable   = "Not quite, but good try!",
	wrong        = "Keep reading! You'll get it!",
}

--- Calculate HP recovery from a reading comprehension answer.
--- @param max_recovery number Maximum HP that could be recovered
--- @param answer_quality string One of: "correct", "almost_right", "reasonable", "wrong"
--- @param streak_count number Consecutive good answers (correct or almost_right)
--- @return number healed, string feedback
function M.calculate(max_recovery, answer_quality, streak_count)
	local score = M.ANSWER_SCORES[answer_quality] or M.ANSWER_SCORES.wrong
	streak_count = streak_count or 0

	local base = max_recovery * M.BASE_EFFORT_FRACTION
	local comprehension = max_recovery * M.COMPREHENSION_FRACTION * score
	local streak_bonus = max_recovery * math.min(streak_count * 0.03, M.STREAK_BONUS_CAP)

	local total = math.floor(math.min(base + comprehension + streak_bonus, max_recovery))
	local feedback = M.FEEDBACK[answer_quality] or M.FEEDBACK.wrong

	return total, feedback
end

--- Calculate the base (automatic) recovery between waves (no question).
--- @param max_recovery number
--- @return number
function M.base_recovery(max_recovery)
	return math.floor(max_recovery * M.BASE_EFFORT_FRACTION)
end

return M
