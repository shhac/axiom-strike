local M = {}

local CONSTANTS = require("modules.constants")

--- Generate a tutorial level: one enemy, tiles that can only form one correct equation.
--- @return table waves
function M.generate_tutorial_level()
	-- Single wave, single enemy, weakness = 5
	-- Only tiles: [2] [3] [+] — the only possible equation is 2+3=5
	local enemy = {
		hp = 20,
		max_hp = 20,
		weakness = 5,
		attack_power = 3,
		is_boss = false,
		skill = CONSTANTS.OP_ADD,
		max_operand = 10,
	}

	return {
		{enemy},  -- Wave 1: single enemy
	}
end

--- Generate tutorial tile hand: only one valid equation possible.
--- @return table numbers, table operators
function M.tutorial_tiles()
	return {2, 3}, {"+"}
end

--- Check if this is the player's first battle (no completed nodes).
--- @param save_data table
--- @return boolean
function M.is_first_battle(save_data)
	if not save_data or not save_data.completed_nodes then
		return true
	end
	for _ in pairs(save_data.completed_nodes) do
		return false
	end
	return true
end

return M
