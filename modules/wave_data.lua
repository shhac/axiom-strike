local M = {}

local CONSTANTS = require("modules.constants")
local question_gen = require("modules.question_gen")

-- Lookup tables replacing if/elseif chains
local WEAKNESS_RANGES = {
	{3, 10}, {5, 15}, {8, 25}, {10, 40}, {15, 50},
}

local MAX_OPERANDS = {10, 15, 20, 30, 50}

local WAVE_ENEMY_CAPS = {2, 4, 5}

local function lookup(tbl, difficulty)
	local idx = math.max(1, math.min(#tbl, difficulty))
	return tbl[idx]
end

--- Create an enemy using either Elo-based or difficulty-based generation.
local function create_enemy(player_elo, difficulty, skill, is_boss, position)
	if player_elo then
		return question_gen.generate_enemy(player_elo, skill, is_boss, position)
	end

	local range = lookup(WEAKNESS_RANGES, difficulty)
	local weakness = math.random(range[1], range[2])
	local max_operand = lookup(MAX_OPERANDS, difficulty)
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

local function create_boss_wave(player_elo, difficulty, skill)
	local enemies = {}
	enemies[1] = create_enemy(player_elo, difficulty, skill, true, 1)
	if difficulty >= 4 then
		local minion_diff = math.max(1, difficulty - 2)
		enemies[2] = create_enemy(player_elo, minion_diff, skill, false, 2)
		enemies[3] = create_enemy(player_elo, minion_diff, skill, false, 3)
	end
	return enemies
end

local function create_normal_wave(player_elo, difficulty, skill, wave_index)
	local cap = lookup(WAVE_ENEMY_CAPS, wave_index)
	local enemy_count = math.min(cap, 1 + math.floor(difficulty / 2) + (wave_index - 1))

	local enemies = {}
	for i = 1, enemy_count do
		enemies[i] = create_enemy(player_elo, difficulty, skill, false, i)
	end
	return enemies
end

--- Generate a level with 2-3 waves of enemies.
--- @param difficulty number 1-5 difficulty tier
--- @param skill string Operation type ("+", "-", "x", "/")
--- @param player_elo number|nil Optional player Elo for adaptive generation
--- @return table waves Array of wave tables
function M.generate_level(difficulty, skill, player_elo)
	difficulty = difficulty or 1
	skill = skill or CONSTANTS.OP_ADD

	local wave_count = difficulty <= 1 and 2 or 3
	local is_boss_level = difficulty >= 3 and math.random() > 0.5

	local waves = {}
	for w = 1, wave_count do
		if is_boss_level and w == wave_count then
			waves[w] = create_boss_wave(player_elo, difficulty, skill)
		else
			waves[w] = create_normal_wave(player_elo, difficulty, skill, w)
		end
	end

	return waves
end

return M
