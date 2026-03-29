require("tests.defold_shim")
local damage = require("modules.damage")

describe("damage.calculate_attack", function()
	it("gives max damage on exact match", function()
		local dmg, label = damage.calculate_attack(7, 7)
		assert.are.equal(30, dmg) -- BASE_DAMAGE * EXACT_MATCH_MULTIPLIER = 15 * 2
		assert.are.equal("EXACT MATCH!", label)
	end)

	it("gives minimum 1 damage for distant misses", function()
		local dmg, _ = damage.calculate_attack(100, 7)
		assert.are.equal(1, dmg)
	end)

	it("gives close label for small distance", function()
		local _, label = damage.calculate_attack(8, 7)
		assert.are.equal("Close!", label)
	end)

	it("gives way off label for large distance", function()
		local _, label = damage.calculate_attack(50, 7)
		assert.are.equal("Way off...", label)
	end)
end)

describe("damage.calculate_block", function()
	it("gives perfect block on exact match", function()
		local dmg, label = damage.calculate_block(10, 10, 8)
		assert.are.equal(0, dmg)
		assert.are.equal("PERFECT BLOCK!", label)
	end)

	it("handles attack_number = 0 without crashing", function()
		local dmg, label = damage.calculate_block(5, 0, 10)
		assert.are.equal(10, dmg)
		assert.are.equal("Missed block!", label)
	end)

	it("takes minimum 1 damage on close miss", function()
		local dmg, _ = damage.calculate_block(11, 10, 8)
		assert.is_true(dmg >= 1)
	end)

	it("gives deflected label for close distance", function()
		local _, label = damage.calculate_block(9, 10, 8)
		assert.are.equal("Deflected!", label)
	end)
end)
