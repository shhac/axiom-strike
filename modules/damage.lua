local M = {}

local CONSTANTS = require("modules.constants")

--- Calculate attack damage based on closeness to enemy weakness.
--- Exact match = BASE_DAMAGE * EXACT_MATCH_MULTIPLIER.
--- Each point of distance reduces damage by DAMAGE_FALLOFF_PER_POINT.
--- Minimum damage is always MIN_DAMAGE.
--- @param result number The player's equation result
--- @param weakness number The enemy's weakness number
--- @return number damage, string closeness_label
function M.calculate_attack(result, weakness)
	local distance = math.abs(result - weakness)

	if distance == 0 then
		local dmg = math.floor(CONSTANTS.BASE_DAMAGE * CONSTANTS.EXACT_MATCH_MULTIPLIER)
		return dmg, "EXACT MATCH!"
	end

	local dmg = CONSTANTS.BASE_DAMAGE - (distance * CONSTANTS.DAMAGE_FALLOFF_PER_POINT)
	dmg = math.floor(math.max(dmg, CONSTANTS.MIN_DAMAGE))

	if distance <= 3 then
		return dmg, "Close!"
	elseif distance <= 8 then
		return dmg, "Not bad"
	else
		return dmg, "Way off..."
	end
end

--- Calculate block quality for defense.
--- Exact match = full block (0 damage taken).
--- Distance from the target increases damage taken.
--- @param result number The player's equation result
--- @param attack_number number The enemy's attack number
--- @param enemy_attack_power number Base damage the enemy deals
--- @return number damage_taken, string block_label
function M.calculate_block(result, attack_number, enemy_attack_power)
	if attack_number == 0 then
		return enemy_attack_power, "Missed block!"
	end

	local distance = math.abs(result - attack_number)

	if distance == 0 then
		return 0, "PERFECT BLOCK!"
	end

	local block_quality = math.max(0, 1 - (distance / attack_number))
	local damage_taken = math.floor(enemy_attack_power * (1 - block_quality))
	damage_taken = math.max(CONSTANTS.MIN_DAMAGE, damage_taken)

	if distance <= 2 then
		return damage_taken, "Deflected!"
	elseif distance <= 5 then
		return damage_taken, "Grazed"
	else
		return damage_taken, "Missed block!"
	end
end

return M
