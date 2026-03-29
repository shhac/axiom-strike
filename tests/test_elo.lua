require("tests.defold_shim")
local elo = require("modules.elo")

describe("elo.expected", function()
	it("returns 0.5 for equal ratings", function()
		assert.is_near(0.5, elo.expected(1000, 1000), 0.001)
	end)

	it("returns higher probability when player is stronger", function()
		local p = elo.expected(1200, 1000)
		assert.is_true(p > 0.5)
	end)

	it("returns lower probability when player is weaker", function()
		local p = elo.expected(800, 1000)
		assert.is_true(p < 0.5)
	end)
end)

describe("elo.update", function()
	it("increases Elo on correct answer", function()
		local new_elo, change = elo.update(1000, 1000, true, nil, 10)
		assert.is_true(new_elo > 1000)
		assert.is_true(change > 0)
	end)

	it("decreases Elo on wrong answer", function()
		local new_elo, change = elo.update(1000, 1000, false, nil, 10)
		assert.is_true(new_elo < 1000)
		assert.is_true(change < 0)
	end)

	it("converges toward floor after many wrong answers", function()
		local current = 1000
		for _ = 1, 500 do
			current = elo.update(current, 1000, false, nil, 0)
		end
		assert.is_true(current <= 250)
		assert.is_true(current >= 200)
	end)

	it("converges toward ceiling after many correct answers", function()
		local current = 1000
		for _ = 1, 500 do
			current = elo.update(current, 1000, true, nil, 0)
		end
		assert.is_true(current >= 1750)
		assert.is_true(current <= 2000)
	end)

	it("handles nil time_taken", function()
		local new_elo = elo.update(1000, 1000, true, nil, 5)
		assert.is_true(new_elo > 1000)
	end)

	it("handles zero time_taken", function()
		local new_elo = elo.update(1000, 1000, true, 0, 5)
		assert.is_true(new_elo > 1000)
	end)
end)

describe("elo.select_difficulty", function()
	it("returns target that gives ~70% success", function()
		local target = elo.select_difficulty(1000)
		local expected = elo.expected(1000, target)
		assert.is_near(0.70, expected, 0.05)
	end)
end)

describe("elo.apply_session_decay", function()
	it("does not decay for 0 days", function()
		assert.are.equal(1200, elo.apply_session_decay(1200, 0))
	end)

	it("decays toward baseline over time", function()
		local decayed = elo.apply_session_decay(1400, 10)
		assert.is_true(decayed < 1400)
		assert.is_true(decayed > 1000) -- shouldn't overshoot baseline
	end)

	it("caps decay at MAX_DECAY_DAYS", function()
		local d30 = elo.apply_session_decay(1400, 30)
		local d100 = elo.apply_session_decay(1400, 100)
		assert.are.equal(d30, d100)
	end)
end)

describe("elo.cold_start", function()
	it("returns age-appropriate Elo", function()
		assert.are.equal(600, elo.cold_start(6))
		assert.are.equal(1000, elo.cold_start(10))
		assert.are.equal(1200, elo.cold_start(12))
	end)

	it("clamps out-of-range ages", function()
		assert.are.equal(600, elo.cold_start(3))
		assert.are.equal(1200, elo.cold_start(20))
	end)
end)
