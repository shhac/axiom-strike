require("tests.defold_shim")
local tutorial = require("modules.tutorial")

describe("tutorial.is_first_battle", function()
	it("returns true with nil save_data", function()
		assert.is_true(tutorial.is_first_battle(nil))
	end)

	it("returns true with missing completed_nodes", function()
		assert.is_true(tutorial.is_first_battle({}))
	end)

	it("returns true with empty completed_nodes", function()
		assert.is_true(tutorial.is_first_battle({completed_nodes = {}}))
	end)

	it("returns false with non-empty completed_nodes", function()
		assert.is_false(tutorial.is_first_battle({completed_nodes = {add_1 = true}}))
	end)

	it("returns false with multiple completed nodes", function()
		assert.is_false(tutorial.is_first_battle({completed_nodes = {add_1 = true, add_2 = true}}))
	end)
end)

describe("tutorial.generate_tutorial_level", function()
	it("returns one wave", function()
		local waves = tutorial.generate_tutorial_level()
		assert.are.equal(1, #waves)
	end)

	it("wave has one enemy", function()
		local waves = tutorial.generate_tutorial_level()
		assert.are.equal(1, #waves[1])
	end)

	it("enemy has weakness of 5", function()
		local waves = tutorial.generate_tutorial_level()
		local enemy = waves[1][1]
		assert.are.equal(5, enemy.weakness)
	end)

	it("enemy is not a boss", function()
		local waves = tutorial.generate_tutorial_level()
		local enemy = waves[1][1]
		assert.is_false(enemy.is_boss)
	end)

	it("enemy has expected stats", function()
		local waves = tutorial.generate_tutorial_level()
		local enemy = waves[1][1]
		assert.are.equal(20, enemy.hp)
		assert.are.equal(20, enemy.max_hp)
		assert.are.equal(3, enemy.attack_power)
		assert.are.equal("+", enemy.skill)
	end)
end)

describe("tutorial.tutorial_tiles", function()
	it("returns numbers and operators", function()
		local nums, ops = tutorial.tutorial_tiles()
		assert.is_table(nums)
		assert.is_table(ops)
	end)

	it("returns exactly {2, 3} and {+}", function()
		local nums, ops = tutorial.tutorial_tiles()
		assert.are.same({2, 3}, nums)
		assert.are.same({"+"}, ops)
	end)

	it("tiles can only form 2+3=5", function()
		local nums, ops = tutorial.tutorial_tiles()
		local equation = require("modules.equation")
		local result = equation.evaluate({nums[1], ops[1], nums[2]})
		assert.are.equal(5, result)
	end)
end)
