local M = {}

local passage_data = require("data.passages")
local util = require("modules.util")

--- Get a random passage, optionally filtered by grade range.
--- @param min_grade number|nil
--- @param max_grade number|nil
--- @return table passage
function M.get_random(min_grade, max_grade)
	min_grade = min_grade or 1
	max_grade = max_grade or 7

	local candidates = {}
	for _, p in ipairs(passage_data.passages) do
		if p.grade >= min_grade and p.grade <= max_grade then
			candidates[#candidates + 1] = p
		end
	end

	if #candidates == 0 then
		candidates = passage_data.passages
	end

	return candidates[math.random(1, #candidates)]
end

--- Build the 5 answer options from a passage, shuffled.
--- @param passage table
--- @return table answers Array of {text, quality}, number correct_index
function M.build_answers(passage)
	local answers = {
		{text = passage.correct, quality = "correct"},
		{text = passage.almost_right, quality = "almost_right"},
		{text = passage.reasonable, quality = "reasonable"},
		{text = passage.wrong[1], quality = "wrong"},
		{text = passage.wrong[2], quality = "wrong"},
	}

	util.shuffle(answers)

	local correct_index = 0
	for i, a in ipairs(answers) do
		if a.quality == "correct" then
			correct_index = i
			break
		end
	end

	return answers, correct_index
end

return M
