local M = {}

local elo_module = require("modules.elo")
local CONSTANTS = require("modules.constants")

--- Map an Elo rating to concrete question parameters.
--- @param elo number Player's Elo for this skill
--- @return table params {max_operand, num_terms, min_target, max_target}
function M.elo_to_params(elo)
	if elo < 600 then
		return {max_operand = 5, num_terms = 2, min_target = 2, max_target = 10}
	elseif elo < 800 then
		return {max_operand = 10, num_terms = 2, min_target = 3, max_target = 15}
	elseif elo < 1000 then
		return {max_operand = 15, num_terms = 2, min_target = 5, max_target = 20}
	elseif elo < 1200 then
		return {max_operand = 20, num_terms = 2, min_target = 8, max_target = 30}
	elseif elo < 1400 then
		return {max_operand = 30, num_terms = 2, min_target = 10, max_target = 50}
	else
		return {max_operand = 50, num_terms = 3, min_target = 15, max_target = 80}
	end
end

--- Generate an enemy weakness number appropriate for the player's Elo.
--- @param player_elo number
--- @param skill string Operation type
--- @return number weakness, number question_elo, table params
function M.generate_weakness(player_elo, skill)
	local target_elo = elo_module.select_difficulty(player_elo)
	local params = M.elo_to_params(target_elo)

	local weakness = math.random(params.min_target, params.max_target)

	-- For multiplication, ensure the weakness has factors within max_operand
	if skill == CONSTANTS.OP_MUL or skill == "x" or skill == "*" then
		local attempts = 0
		while attempts < 20 do
			local has_factors = false
			for i = 2, math.min(params.max_operand, weakness) do
				if weakness % i == 0 and weakness / i <= params.max_operand then
					has_factors = true
					break
				end
			end
			if has_factors then break end
			weakness = math.random(params.min_target, params.max_target)
			attempts = attempts + 1
		end
	end

	-- For division, ensure the weakness is achievable
	if skill == CONSTANTS.OP_DIV or skill == "/" then
		-- Make weakness such that weakness * small_number <= max_operand
		local divisor = math.random(2, math.min(10, params.max_operand))
		weakness = math.random(1, math.floor(params.max_operand / divisor))
	end

	return weakness, target_elo, params
end

--- Generate enemy stats scaled by Elo.
--- @param player_elo number
--- @param skill string
--- @param is_boss boolean
--- @param wave_position number 1-based enemy index within wave
--- @return table enemy
function M.generate_enemy(player_elo, skill, is_boss, wave_position)
	wave_position = wave_position or 1
	local ramp = (wave_position - 1) * 30

	local weakness, question_elo, params = M.generate_weakness(player_elo + ramp, skill)

	local base_hp = is_boss and 90 or 30
	local elo_bonus = math.floor((player_elo - 800) / 100) * 5
	local hp = math.max(base_hp, base_hp + elo_bonus)

	local base_atk = is_boss and 15 or 8
	local atk = base_atk + math.floor((player_elo - 800) / 200) * 2

	return {
		hp = hp,
		max_hp = hp,
		weakness = weakness,
		attack_power = math.max(3, atk),
		is_boss = is_boss,
		skill = skill,
		max_operand = params.max_operand,
		question_elo = question_elo,
	}
end

return M
