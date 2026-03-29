local M = {}

-- Onboarding steps tracked by completed_count
-- Step 0: Tutorial battle (constrained tiles) — already handled by tutorial.lua
-- Step 1: First real battle — introduce defense ("Now the enemy attacks! Build the answer to block!")
-- Step 2: Second battle — introduce recovery ("You can rest between waves to recover HP!")
-- Step 3: Third battle — introduce targeting ("Tap an enemy to choose your target!")

M.MESSAGES = {
	[0] = {
		phase = "attack",
		text = "Tap the numbers and + to build the answer!",
	},
	[1] = {
		phase = "defend",
		text = "The enemy attacks! Solve the problem to block!",
	},
	[2] = {
		phase = "between_waves",
		text = "You can REST & READ between waves to heal!",
	},
	[3] = {
		phase = "attack_multi",
		text = "Tap an enemy to choose your target!",
	},
}

local PHASE_MAP = {
	attack = "attack",
	defend = "defend",
	between_waves = "between_waves",
	attack_multi = "attack",
}

--- Get the onboarding message for the current state, if any.
--- @param completed_count number How many battles the player has completed
--- @param phase string Current game phase
--- @return string|nil message to show, or nil if no onboarding needed
function M.get_message(completed_count, phase)
	if completed_count > 3 then return nil end

	local step = M.MESSAGES[completed_count]
	if not step then return nil end

	if PHASE_MAP[step.phase] == phase then
		return step.text
	end

	return nil
end

--- Count how many battles have been completed.
--- @param save_data table
--- @return number
function M.battles_completed(save_data)
	local count = 0
	if save_data and save_data.completed_nodes then
		for _ in pairs(save_data.completed_nodes) do
			count = count + 1
		end
	end
	return count
end

return M
