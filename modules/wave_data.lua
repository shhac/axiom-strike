local M = {}

local CONSTANTS = require("modules.constants")
local question_gen = require("modules.question_gen")

--- Generate a level with 3 waves of enemies.
--- @param difficulty number 1-5 difficulty tier
--- @param skill string Operation type ("+", "-", "x", "/")
--- @param player_elo number|nil Optional player Elo for adaptive generation
--- @return table waves Array of wave tables, each containing enemy arrays
function M.generate_level(difficulty, skill, player_elo)
	difficulty = difficulty or 1
	skill = skill or CONSTANTS.OP_ADD

	local waves = {}
	local wave_count = difficulty <= 1 and 2 or 3
	local is_boss_level = difficulty >= 3 and math.random() > 0.5

	for w = 1, wave_count do
		local enemies = {}
		local enemy_count

		if is_boss_level and w == wave_count then
			-- Boss wave
			if player_elo then
				enemies[1] = question_gen.generate_enemy(player_elo, skill, true, 1)
			else
				enemies[1] = M._make_enemy(difficulty, skill, true)
			end
			if difficulty >= 4 then
				if player_elo then
					enemies[2] = question_gen.generate_enemy(player_elo, skill, false, 2)
					enemies[3] = question_gen.generate_enemy(player_elo, skill, false, 3)
				else
					enemies[2] = M._make_enemy(math.max(1, difficulty - 2), skill, false)
					enemies[3] = M._make_enemy(math.max(1, difficulty - 2), skill, false)
				end
			end
		else
			if w == 1 then
				enemy_count = math.min(2, 1 + math.floor(difficulty / 2))
			elseif w == 2 then
				enemy_count = math.min(4, 2 + math.floor(difficulty / 2))
			else
				enemy_count = math.min(5, 2 + math.floor(difficulty / 2))
			end

			for i = 1, enemy_count do
				if player_elo then
					enemies[i] = question_gen.generate_enemy(player_elo, skill, false, i)
				else
					enemies[i] = M._make_enemy(difficulty, skill, false)
				end
			end
		end

		waves[w] = enemies
	end

	return waves
end

--- Create a single enemy with stats based on difficulty.
--- @param difficulty number
--- @param skill string
--- @param is_boss boolean
--- @return table enemy {hp, max_hp, weakness, attack_power, is_boss}
function M._make_enemy(difficulty, skill, is_boss)
	local max_operand = M._max_operand_for_difficulty(difficulty)

	-- Weakness number scales with difficulty
	local weakness
	if difficulty <= 1 then
		weakness = math.random(3, 10)
	elseif difficulty <= 2 then
		weakness = math.random(5, 15)
	elseif difficulty <= 3 then
		weakness = math.random(8, 25)
	elseif difficulty <= 4 then
		weakness = math.random(10, 40)
	else
		weakness = math.random(15, 50)
	end

	local base_hp = is_boss and (CONSTANTS.ENEMY_BASE_HP * 3) or CONSTANTS.ENEMY_BASE_HP
	local hp = base_hp + (difficulty - 1) * 10
	local attack = is_boss and (CONSTANTS.ENEMY_BASE_ATTACK + difficulty * 3) or (math.random(3, 6) + difficulty * 2)

	return {
		hp = hp,
		max_hp = hp,
		weakness = weakness,
		attack_power = attack,
		is_boss = is_boss,
		skill = skill,
		max_operand = max_operand,
	}
end

function M._max_operand_for_difficulty(difficulty)
	if difficulty <= 1 then return 10
	elseif difficulty <= 2 then return 15
	elseif difficulty <= 3 then return 20
	elseif difficulty <= 4 then return 30
	else return 50
	end
end

return M
