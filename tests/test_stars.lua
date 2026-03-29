require("tests.defold_shim")
local stars = require("modules.stars")

describe("stars.calculate", function()
	it("awards 3 stars for full HP and no wrong answers", function()
		assert.are.equal(3, stars.calculate(100, 100, 0, 10))
	end)

	it("awards 3 stars at the boundary (70% HP, 80% accuracy)", function()
		assert.are.equal(3, stars.calculate(70, 100, 2, 10))
	end)

	it("awards 2 stars just below 3-star HP threshold", function()
		assert.are.equal(2, stars.calculate(69, 100, 0, 10))
	end)

	it("awards 2 stars just below 3-star accuracy threshold", function()
		-- accuracy = 1 - 3/10 = 0.7 < 0.8
		assert.are.equal(2, stars.calculate(100, 100, 3, 10))
	end)

	it("awards 2 stars at the boundary (30% HP, 50% accuracy)", function()
		assert.are.equal(2, stars.calculate(30, 100, 5, 10))
	end)

	it("awards 1 star just below 2-star HP threshold", function()
		assert.are.equal(1, stars.calculate(29, 100, 0, 10))
	end)

	it("awards 1 star just below 2-star accuracy threshold", function()
		-- accuracy = 1 - 6/10 = 0.4 < 0.5
		assert.are.equal(1, stars.calculate(100, 100, 6, 10))
	end)

	it("awards 1 star for low HP and many wrong answers", function()
		assert.are.equal(1, stars.calculate(5, 100, 8, 10))
	end)

	it("treats zero attempts as perfect accuracy", function()
		assert.are.equal(3, stars.calculate(100, 100, 0, 0))
	end)

	it("handles max_hp=0 without error", function()
		-- Guard against division by zero
		local ok, result = pcall(stars.calculate, 0, 0, 0, 0)
		assert.is_true(ok)
		assert.is_true(result >= 1 and result <= 3)
	end)
end)

describe("stars.display", function()
	it("shows 3 filled stars", function()
		assert.are.equal("***", stars.display(3))
	end)

	it("shows 2 filled and 1 empty", function()
		assert.are.equal("**-", stars.display(2))
	end)

	it("shows 1 filled and 2 empty", function()
		assert.are.equal("*--", stars.display(1))
	end)

	it("shows 0 filled and 3 empty", function()
		assert.are.equal("---", stars.display(0))
	end)
end)
