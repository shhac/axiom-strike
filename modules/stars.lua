local M = {}

--- Calculate star rating for a completed battle.
--- @param hero_hp number Remaining HP
--- @param hero_max_hp number Maximum HP
--- @param total_wrong number Total wrong answers during the battle
--- @param total_attempts number Total attempts
--- @return number stars (1-3)
function M.calculate(hero_hp, hero_max_hp, total_wrong, total_attempts)
	local hp_ratio = hero_hp / hero_max_hp
	local accuracy = total_attempts > 0 and (1 - total_wrong / total_attempts) or 1

	-- 3 stars: high HP and high accuracy
	if hp_ratio >= 0.7 and accuracy >= 0.8 then
		return 3
	end

	-- 2 stars: decent performance
	if hp_ratio >= 0.3 and accuracy >= 0.5 then
		return 2
	end

	-- 1 star: completed (always at least 1 for winning)
	return 1
end

--- Generate star display string.
--- @param count number
--- @return string
function M.display(count)
	local filled = string.rep("*", count)
	local empty = string.rep("-", 3 - count)
	return filled .. empty
end

return M
