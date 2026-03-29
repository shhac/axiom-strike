local M = {}

-- All available collectibles
M.ITEMS = {
	-- Equation effects (visual flair when attacking)
	{id = "effect_fire",      category = "effect",  name = "Fire Equations",     unlock_stars = 3,  color = {1, 0.4, 0.15}},
	{id = "effect_ice",       category = "effect",  name = "Ice Equations",      unlock_stars = 6,  color = {0.3, 0.7, 1.0}},
	{id = "effect_lightning", category = "effect",  name = "Lightning Equations", unlock_stars = 10, color = {1, 1, 0.3}},
	{id = "effect_nature",    category = "effect",  name = "Nature Equations",   unlock_stars = 15, color = {0.3, 0.9, 0.4}},
	{id = "effect_cosmic",    category = "effect",  name = "Cosmic Equations",   unlock_stars = 25, color = {0.7, 0.3, 1.0}},

	-- Hero colors
	{id = "hero_red",    category = "hero_color", name = "Red Warrior",    unlock_stars = 5,  color = {0.9, 0.3, 0.25}},
	{id = "hero_green",  category = "hero_color", name = "Green Warrior",  unlock_stars = 8,  color = {0.25, 0.8, 0.35}},
	{id = "hero_gold",   category = "hero_color", name = "Gold Warrior",   unlock_stars = 12, color = {1, 0.8, 0.2}},
	{id = "hero_purple", category = "hero_color", name = "Purple Warrior", unlock_stars = 18, color = {0.6, 0.3, 0.9}},
	{id = "hero_shadow", category = "hero_color", name = "Shadow Warrior", unlock_stars = 30, color = {0.2, 0.2, 0.25}},

	-- Consumables
	{id = "item_time_10",  category = "consumable", name = "+10 Seconds",    unlock_stars = 2},
	{id = "item_heal_20",  category = "consumable", name = "Small Heal (+20)", unlock_stars = 4},
	{id = "item_shield",   category = "consumable", name = "Shield (1 hit)", unlock_stars = 9},
}

--- Get total stars earned across all completed nodes.
--- @param save_data table
--- @return number total
function M.total_stars(save_data)
	local total = 0
	if save_data.stars then
		for _, count in pairs(save_data.stars) do
			total = total + count
		end
	end
	return total
end

--- Get list of unlocked items based on total stars.
--- @param save_data table
--- @return table unlocked, table locked
function M.get_unlocked(save_data)
	local total = M.total_stars(save_data)
	local unlocked = {}
	local locked = {}

	for _, item in ipairs(M.ITEMS) do
		if total >= item.unlock_stars then
			unlocked[#unlocked + 1] = item
		else
			locked[#locked + 1] = item
		end
	end

	return unlocked, locked
end

--- Get the currently equipped items from save data.
--- @param save_data table
--- @return table equipped {effect = id, hero_color = id}
function M.get_equipped(save_data)
	return save_data.equipped or {}
end

--- Equip an item.
--- @param save_data table
--- @param item_id string
function M.equip(save_data, item_id)
	if not save_data.equipped then save_data.equipped = {} end
	for _, item in ipairs(M.ITEMS) do
		if item.id == item_id then
			save_data.equipped[item.category] = item_id
			return
		end
	end
end

return M
