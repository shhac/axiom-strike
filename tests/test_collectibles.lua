require("tests.defold_shim")
local collectibles = require("modules.collectibles")

describe("collectibles.total_stars", function()
	it("returns 0 for empty stars table", function()
		assert.are.equal(0, collectibles.total_stars({stars = {}}))
	end)

	it("returns 0 when stars field is nil", function()
		assert.are.equal(0, collectibles.total_stars({}))
	end)

	it("sums populated star counts", function()
		local save = {stars = {add_1 = 3, add_2 = 2, sub_1 = 1}}
		assert.are.equal(6, collectibles.total_stars(save))
	end)

	it("handles single entry", function()
		assert.are.equal(5, collectibles.total_stars({stars = {add_1 = 5}}))
	end)
end)

describe("collectibles.get_unlocked", function()
	it("returns nothing unlocked at 0 stars", function()
		local unlocked, locked = collectibles.get_unlocked({stars = {}})
		assert.are.equal(0, #unlocked)
		assert.are.equal(#collectibles.ITEMS, #locked)
	end)

	it("unlocks item_time_10 at exactly 2 stars (boundary)", function()
		local unlocked, locked = collectibles.get_unlocked({stars = {add_1 = 2}})
		local found = false
		for _, item in ipairs(unlocked) do
			if item.id == "item_time_10" then found = true end
		end
		assert.is_true(found)
	end)

	it("does not unlock item at stars - 1 (below boundary)", function()
		local unlocked = collectibles.get_unlocked({stars = {add_1 = 1}})
		local found = false
		for _, item in ipairs(unlocked) do
			if item.id == "item_time_10" then found = true end
		end
		assert.is_false(found)
	end)

	it("unlocks all items at 30+ stars", function()
		local unlocked, locked = collectibles.get_unlocked({stars = {add_1 = 30}})
		assert.are.equal(#collectibles.ITEMS, #unlocked)
		assert.are.equal(0, #locked)
	end)

	it("unlocked + locked always equals total items", function()
		local unlocked, locked = collectibles.get_unlocked({stars = {add_1 = 10}})
		assert.are.equal(#collectibles.ITEMS, #unlocked + #locked)
	end)
end)

describe("collectibles.equip", function()
	it("equips a valid effect item", function()
		local save = {stars = {}}
		collectibles.equip(save, "effect_fire")
		assert.are.equal("effect_fire", save.equipped.effect)
	end)

	it("equips a valid hero_color item", function()
		local save = {stars = {}}
		collectibles.equip(save, "hero_red")
		assert.are.equal("hero_red", save.equipped.hero_color)
	end)

	it("replaces previously equipped item in same category", function()
		local save = {stars = {}}
		collectibles.equip(save, "effect_fire")
		collectibles.equip(save, "effect_ice")
		assert.are.equal("effect_ice", save.equipped.effect)
	end)

	it("does not set category for unknown item ID", function()
		local save = {stars = {}}
		collectibles.equip(save, "nonexistent_item")
		-- equipped table gets created but no category is set
		assert.is_nil(next(save.equipped))
	end)

	it("creates equipped table if missing", function()
		local save = {}
		collectibles.equip(save, "effect_fire")
		assert.is_table(save.equipped)
		assert.are.equal("effect_fire", save.equipped.effect)
	end)

	it("equips consumable category", function()
		local save = {}
		collectibles.equip(save, "item_time_10")
		assert.are.equal("item_time_10", save.equipped.consumable)
	end)
end)

describe("collectibles.get_equipped", function()
	it("returns empty table on fresh save", function()
		local equipped = collectibles.get_equipped({})
		assert.is_table(equipped)
		assert.is_nil(next(equipped))
	end)

	it("returns equipped data when present", function()
		local save = {equipped = {effect = "effect_fire", hero_color = "hero_red"}}
		local equipped = collectibles.get_equipped(save)
		assert.are.equal("effect_fire", equipped.effect)
		assert.are.equal("hero_red", equipped.hero_color)
	end)
end)
