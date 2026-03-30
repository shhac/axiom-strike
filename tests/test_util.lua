require("tests.defold_shim")
local util = require("modules.util")

describe("util.normalize_op", function()
	it("maps + to +", function()
		assert.are.equal("+", util.normalize_op("+"))
	end)

	it("maps - to -", function()
		assert.are.equal("-", util.normalize_op("-"))
	end)

	it("maps x to x", function()
		assert.are.equal("x", util.normalize_op("x"))
	end)

	it("maps * to x", function()
		assert.are.equal("x", util.normalize_op("*"))
	end)

	it("maps / to /", function()
		assert.are.equal("/", util.normalize_op("/"))
	end)

	it("returns unmapped operator as-is", function()
		assert.are.equal("%", util.normalize_op("%"))
		assert.are.equal("^", util.normalize_op("^"))
	end)
end)

describe("util.find_factor_pairs", function()
	it("returns single pair for prime number (prime, 1)", function()
		-- 7: i=7, 7%7==0, 7/7=1 <=10 -> {7,1}
		local pairs = util.find_factor_pairs(7, 10)
		assert.are.equal(1, #pairs)
		assert.are.same({7, 1}, pairs[1])
	end)

	it("returns empty for prime when max_operand < prime", function()
		local pairs = util.find_factor_pairs(7, 6)
		assert.are.equal(0, #pairs)
	end)

	it("finds factor pairs for composite number", function()
		local pairs = util.find_factor_pairs(12, 12)
		-- 2*6, 3*4, 4*3, 6*2 — but only i from 2..min(12,12)
		-- i=2: 12%2==0, 12/2=6 <=12 -> {2,6}
		-- i=3: 12%3==0, 12/3=4 <=12 -> {3,4}
		-- i=4: 12%4==0, 12/4=3 <=12 -> {4,3}
		-- i=6: 12%6==0, 12/6=2 <=12 -> {6,2}
		-- i=12: 12%12==0, 12/12=1 <=12 -> {12,1}
		assert.is_true(#pairs >= 2)
		assert.are.same({2, 6}, pairs[1])
		assert.are.same({3, 4}, pairs[2])
	end)

	it("respects max_operand constraint", function()
		-- 12 = 2*6, 3*4, 4*3 — but max_operand=4 means 6 is too large
		-- i=2: 12/2=6 > 4, skip
		-- i=3: 12/3=4 <= 4, ok -> {3,4}
		-- i=4: 12/4=3 <= 4, ok -> {4,3}
		local pairs = util.find_factor_pairs(12, 4)
		assert.are.equal(2, #pairs)
		assert.are.same({3, 4}, pairs[1])
		assert.are.same({4, 3}, pairs[2])
	end)

	it("returns empty when max_operand is 1", function()
		-- loop starts at i=2, min(1, target) = 1, so loop doesn't execute
		local pairs = util.find_factor_pairs(6, 1)
		assert.are.equal(0, #pairs)
	end)

	it("handles target = 4 with max_operand = 10", function()
		-- i=2: 4%2==0, 4/2=2 <=10 -> {2,2}
		-- i=4: 4%4==0, 4/4=1 <=10 -> {4,1}
		local pairs = util.find_factor_pairs(4, 10)
		assert.are.equal(2, #pairs)
		assert.are.same({2, 2}, pairs[1])
	end)
end)

describe("util.has_factor_pair", function()
	it("returns true for composite within range", function()
		assert.is_true(util.has_factor_pair(12, 12))
	end)

	it("returns true for prime within max_operand", function()
		-- 7: i=7, 7%7==0, 7/7=1 <=10
		assert.is_true(util.has_factor_pair(7, 10))
	end)

	it("returns false for prime when max_operand < prime", function()
		assert.is_false(util.has_factor_pair(7, 6))
	end)

	it("returns false when max_operand too small", function()
		assert.is_false(util.has_factor_pair(12, 1))
	end)

	it("returns true at boundary", function()
		-- 6 = 2*3, both <= 3
		assert.is_true(util.has_factor_pair(6, 3))
	end)
end)

describe("util.shuffle", function()
	it("preserves all elements", function()
		local t = {1, 2, 3, 4, 5}
		util.shuffle(t)
		table.sort(t)
		assert.are.same({1, 2, 3, 4, 5}, t)
	end)

	it("returns the same table reference", function()
		local t = {1, 2, 3}
		local result = util.shuffle(t)
		assert.are.equal(t, result)
	end)

	it("handles single-element array", function()
		local t = {42}
		util.shuffle(t)
		assert.are.same({42}, t)
	end)

	it("handles empty array", function()
		local t = {}
		util.shuffle(t)
		assert.are.same({}, t)
	end)

	it("preserves length", function()
		local t = {10, 20, 30, 40}
		util.shuffle(t)
		assert.are.equal(4, #t)
	end)
end)
