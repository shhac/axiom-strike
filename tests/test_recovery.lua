require("tests.defold_shim")
local recovery = require("modules.recovery")

describe("recovery.calculate", function()
	it("gives full recovery on correct answer", function()
		local healed, feedback = recovery.calculate(100, "correct", 0)
		assert.are.equal(100, healed)
		assert.is_truthy(feedback:find("Excellent"))
	end)

	it("gives ~82 on almost_right", function()
		local healed = recovery.calculate(100, "almost_right", 0)
		assert.are.equal(82, healed)
	end)

	it("gives ~58 on reasonable", function()
		local healed = recovery.calculate(100, "reasonable", 0)
		assert.are.equal(58, healed)
	end)

	it("gives ~40 floor on wrong", function()
		local healed = recovery.calculate(100, "wrong", 0)
		assert.are.equal(40, healed)
	end)

	it("never exceeds max_recovery", function()
		local healed = recovery.calculate(50, "correct", 10)
		assert.is_true(healed <= 50)
	end)

	it("returns 0 when max_recovery is 0", function()
		local healed = recovery.calculate(0, "correct", 0)
		assert.are.equal(0, healed)
	end)

	it("adds streak bonus", function()
		local without_streak = recovery.calculate(100, "wrong", 0)
		local with_streak = recovery.calculate(100, "wrong", 5)
		assert.is_true(with_streak > without_streak)
	end)

	it("caps streak bonus", function()
		local at_5 = recovery.calculate(100, "wrong", 5)
		local at_100 = recovery.calculate(100, "wrong", 100)
		assert.are.equal(at_5, at_100)
	end)

	it("handles invalid quality gracefully", function()
		local healed = recovery.calculate(100, "nonsense", 0)
		assert.are.equal(40, healed) -- falls back to wrong score
	end)
end)

describe("recovery.base_recovery", function()
	it("returns 30% of max", function()
		assert.are.equal(30, recovery.base_recovery(100))
	end)

	it("returns 0 for 0 max", function()
		assert.are.equal(0, recovery.base_recovery(0))
	end)
end)
