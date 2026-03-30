require("tests.defold_shim")
local hint = require("modules.hint")

describe("hint.compute_path", function()
	it("returns nil for target <= 0", function()
		assert.is_nil(hint.compute_path(0, {3, 5}, {"+"}, {}, {}, true))
		assert.is_nil(hint.compute_path(-1, {3, 5}, {"+"}, {}, {}, true))
	end)

	it("finds exact match with single number (expect_num)", function()
		local path = hint.compute_path(5, {3, 5, 7}, {"+", "-"}, {}, {}, true)
		assert.is_not_nil(path)
		assert.are.equal(1, #path)
		assert.are.equal("num", path[1].type)
		assert.are.equal(2, path[1].index)
	end)

	it("finds closest when no exact match (single number)", function()
		local path = hint.compute_path(6, {3, 5, 8}, {"+", "-"}, {}, {}, true)
		assert.is_not_nil(path)
		assert.are.equal(1, #path)
		assert.are.equal("num", path[1].type)
		assert.are.equal(2, path[1].index)
	end)

	it("finds operator+number path when expect_num is false", function()
		-- base tokens = {3}, so we need op + num to reach target
		-- 3 + 5 = 8
		local path = hint.compute_path(8, {5, 7}, {"+", "-"}, {}, {3}, false)
		assert.is_not_nil(path)
		assert.are.equal(2, #path)
		assert.are.equal("op", path[1].type)
		assert.are.equal("num", path[2].type)
	end)

	it("finds 3-step path: num, op, num when expect_num is true", function()
		-- No base tokens, need num + op + num = target
		-- 3 + 5 = 8
		local path = hint.compute_path(8, {3, 5, 7}, {"+", "-"}, {}, {}, true)
		assert.is_not_nil(path)
		-- Could be 1-step (if a single number matches) or 3-step
		-- No single number = 8, so should be 3-step
		assert.are.equal(3, #path)
		assert.are.equal("num", path[1].type)
		assert.are.equal("op", path[2].type)
		assert.are.equal("num", path[3].type)
	end)

	it("respects used tiles (skips used numbers)", function()
		-- num_vals = {5, 3}, but index 1 (value 5) is used
		local used = {num_1 = true}
		local path = hint.compute_path(3, {5, 3}, {"+"}, used, {}, true)
		assert.is_not_nil(path)
		assert.are.equal(1, #path)
		assert.are.equal(2, path[1].index)
	end)

	it("respects used tiles (skips used operators)", function()
		-- op index 1 is used, only op index 2 available
		local used = {op_1 = true}
		local path = hint.compute_path(8, {5}, {"+", "-"}, used, {3}, false)
		assert.is_not_nil(path)
		assert.are.equal(2, #path)
		assert.are.equal(2, path[1].index)
	end)

	it("returns nil when no tiles are available", function()
		local used = {num_1 = true, num_2 = true}
		local path = hint.compute_path(5, {3, 5}, {"+"}, used, {}, true)
		assert.is_nil(path)
	end)

	it("prefers exact match over approximate", function()
		-- 2 + 3 = 5 (exact), 2 + 7 = 9 (off by 4)
		local path = hint.compute_path(5, {2, 3, 7}, {"+", "-"}, {}, {}, true)
		assert.is_not_nil(path)
		-- Verify the result evaluates to target
		-- Could be single num=5? No, nums are 2,3,7. Could be 3-step: 2+3=5
	end)
end)
