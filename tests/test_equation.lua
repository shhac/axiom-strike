require("tests.defold_shim")
local equation = require("modules.equation")

describe("equation.evaluate", function()
	it("evaluates simple addition", function()
		assert.are.equal(8, equation.evaluate({3, "+", 5}))
	end)

	it("evaluates simple subtraction", function()
		assert.are.equal(7, equation.evaluate({10, "-", 3}))
	end)

	it("evaluates multiplication with x", function()
		assert.are.equal(15, equation.evaluate({3, "x", 5}))
	end)

	it("evaluates multiplication with *", function()
		assert.are.equal(15, equation.evaluate({3, "*", 5}))
	end)

	it("evaluates division", function()
		assert.are.equal(4, equation.evaluate({20, "/", 5}))
	end)

	it("evaluates left-to-right (no precedence)", function()
		-- 2+3=5, 5x2=10
		assert.are.equal(10, equation.evaluate({2, "+", 3, "x", 2}))
	end)

	it("returns nil for empty input", function()
		local result, err = equation.evaluate({})
		assert.is_nil(result)
		assert.are.equal("empty", err)
	end)

	it("returns nil for nil input", function()
		local result, err = equation.evaluate(nil)
		assert.is_nil(result)
		assert.are.equal("empty", err)
	end)

	it("returns nil for incomplete expression", function()
		local result, err = equation.evaluate({3, "+"})
		assert.is_nil(result)
		assert.are.equal("incomplete", err)
	end)

	it("handles division by zero", function()
		local result, err = equation.evaluate({10, "/", 0})
		assert.is_nil(result)
		assert.are.equal("division by zero", err)
	end)

	it("handles single number", function()
		assert.are.equal(42, equation.evaluate({42}))
	end)

	it("returns non-integer for non-clean division", function()
		local result = equation.evaluate({10, "/", 3})
		assert.is_near(3.333, result, 0.01)
	end)
end)

describe("equation.is_valid", function()
	it("accepts valid sequences", function()
		assert.is_true(equation.is_valid({3, "+", 5}))
		assert.is_true(equation.is_valid({42}))
		assert.is_true(equation.is_valid({1, "+", 2, "x", 3}))
	end)

	it("rejects empty", function()
		assert.is_false(equation.is_valid({}))
		assert.is_false(equation.is_valid(nil))
	end)

	it("rejects even-length", function()
		assert.is_false(equation.is_valid({3, "+"}))
	end)

	it("rejects wrong types", function()
		assert.is_false(equation.is_valid({"+", 3, 5}))
		assert.is_false(equation.is_valid({3, 5, "+"}))
	end)
end)

describe("equation.to_string", function()
	it("formats tokens", function()
		assert.are.equal("3 + 5", equation.to_string({3, "+", 5}))
	end)

	it("returns empty for nil", function()
		assert.are.equal("", equation.to_string(nil))
	end)
end)
