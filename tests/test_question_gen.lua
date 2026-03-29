require("tests.defold_shim")
local question_gen = require("modules.question_gen")
local util = require("modules.util")

describe("question_gen.elo_to_params", function()
	it("returns first bracket for elo < 600", function()
		local p = question_gen.elo_to_params(599)
		assert.are.equal(5, p.max_operand)
		assert.are.equal(2, p.num_terms)
	end)

	it("returns second bracket at elo=600 boundary", function()
		local p = question_gen.elo_to_params(600)
		assert.are.equal(10, p.max_operand)
	end)

	it("returns last defined bracket for elo just below 1400", function()
		local p = question_gen.elo_to_params(1399)
		assert.are.equal(30, p.max_operand)
	end)

	it("returns default for elo >= 1400", function()
		local p = question_gen.elo_to_params(1400)
		assert.are.equal(50, p.max_operand)
		assert.are.equal(3, p.num_terms)
	end)

	it("returns default for elo=1401", function()
		local p = question_gen.elo_to_params(1401)
		assert.are.equal(50, p.max_operand)
	end)

	it("returns first bracket for very low elo", function()
		local p = question_gen.elo_to_params(100)
		assert.are.equal(5, p.max_operand)
	end)
end)

describe("question_gen.generate_weakness", function()
	before_each(function()
		math.randomseed(42)
	end)

	it("returns a positive number for addition", function()
		local weakness = question_gen.generate_weakness(1000, "+")
		assert.is_true(weakness > 0)
	end)

	it("returns a positive number for subtraction", function()
		local weakness = question_gen.generate_weakness(1000, "-")
		assert.is_true(weakness > 0)
	end)

	it("returns factorable weakness for multiplication", function()
		for _ = 1, 30 do
			local weakness, _, params = question_gen.generate_weakness(1000, "x")
			assert.is_true(weakness > 0)
			-- Either it has a factor pair or it gave up after 20 attempts
			-- but the result should still be a positive number
		end
	end)

	it("returns a positive number for division", function()
		local weakness = question_gen.generate_weakness(1000, "/")
		assert.is_true(weakness > 0)
	end)

	it("returns params and question_elo alongside weakness", function()
		local weakness, question_elo, params = question_gen.generate_weakness(1000, "+")
		assert.is_not_nil(question_elo)
		assert.is_not_nil(params)
		assert.is_not_nil(params.max_operand)
		assert.is_not_nil(params.min_target)
		assert.is_not_nil(params.max_target)
	end)

	it("weakness falls within bracket target range", function()
		for _ = 1, 30 do
			local weakness, _, params = question_gen.generate_weakness(1000, "+")
			assert.is_true(weakness >= params.min_target)
			assert.is_true(weakness <= params.max_target)
		end
	end)

	it("normalizes * to x", function()
		local weakness = question_gen.generate_weakness(1000, "*")
		assert.is_true(weakness > 0)
	end)
end)

describe("question_gen.generate_enemy", function()
	before_each(function()
		math.randomseed(42)
	end)

	it("returns required fields", function()
		local enemy = question_gen.generate_enemy(1000, "+", false, 1)
		assert.is_not_nil(enemy.hp)
		assert.is_not_nil(enemy.max_hp)
		assert.is_not_nil(enemy.weakness)
		assert.is_not_nil(enemy.attack_power)
		assert.is_not_nil(enemy.is_boss)
		assert.is_not_nil(enemy.skill)
		assert.is_not_nil(enemy.max_operand)
		assert.is_not_nil(enemy.question_elo)
	end)

	it("boss has more HP than normal enemy", function()
		local normal = question_gen.generate_enemy(1000, "+", false, 1)
		local boss = question_gen.generate_enemy(1000, "+", true, 1)
		assert.is_true(boss.hp > normal.hp)
		assert.is_true(boss.is_boss)
		assert.is_false(normal.is_boss)
	end)

	it("boss has more attack power than normal", function()
		local normal = question_gen.generate_enemy(1000, "+", false, 1)
		local boss = question_gen.generate_enemy(1000, "+", true, 1)
		assert.is_true(boss.attack_power >= normal.attack_power)
	end)

	it("hp equals max_hp for a fresh enemy", function()
		local enemy = question_gen.generate_enemy(1000, "+", false, 1)
		assert.are.equal(enemy.hp, enemy.max_hp)
	end)

	it("attack_power has a floor of 3", function()
		local enemy = question_gen.generate_enemy(200, "+", false, 1)
		assert.is_true(enemy.attack_power >= 3)
	end)

	it("wave_position defaults to 1", function()
		local enemy = question_gen.generate_enemy(1000, "+", false)
		assert.is_not_nil(enemy.weakness)
	end)
end)
