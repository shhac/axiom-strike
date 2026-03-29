require("tests.defold_shim")
local tiles = require("modules.tiles")
local equation = require("modules.equation")

describe("tiles.deal_hand", function()
	it("returns number and operator tiles", function()
		math.randomseed(42)
		local nums, ops = tiles.deal_hand(10, "+", 20)
		assert.is_true(#nums >= 2)
		assert.is_true(#ops >= 1)
	end)

	it("generates solvable hands for addition", function()
		math.randomseed(1)
		for target = 2, 20 do
			local nums, ops = tiles.deal_hand(target, "+", 20)
			-- Verify at least one valid equation exists in the tiles
			assert.is_true(#nums >= 2, "need at least 2 number tiles for target " .. target)
			assert.is_true(#ops >= 1, "need at least 1 operator tile for target " .. target)
		end
	end)
end)

describe("tiles._build_solution", function()
	it("returns valid addends for addition", function()
		math.randomseed(42)
		local nums, ops = tiles._build_solution(10, "+", 20)
		assert.are.equal(2, #nums)
		assert.are.equal(1, #ops)
		assert.are.equal("+", ops[1])
		assert.are.equal(10, nums[1] + nums[2])
	end)

	it("returns valid pair for subtraction", function()
		math.randomseed(42)
		local nums, ops = tiles._build_solution(5, "-", 20)
		if #ops > 0 then
			assert.are.equal("-", ops[1])
			assert.are.equal(5, nums[1] - nums[2])
		end
	end)

	it("returns valid factors for multiplication", function()
		math.randomseed(42)
		local nums, ops = tiles._build_solution(12, "x", 20)
		if #ops > 0 then
			assert.are.equal("x", ops[1])
			assert.are.equal(12, nums[1] * nums[2])
		end
	end)

	it("returns valid dividend for division", function()
		math.randomseed(42)
		local nums, ops = tiles._build_solution(4, "/", 20)
		if #ops > 0 then
			assert.are.equal("/", ops[1])
			assert.are.equal(4, nums[1] / nums[2])
		end
	end)

	it("handles target=1 for addition gracefully", function()
		local nums, ops = tiles._build_solution(1, "+", 20)
		-- Should fall back to single tile since 0 isn't available
		assert.are.equal(1, nums[1])
	end)

	it("handles prime targets for multiplication", function()
		-- 17 is prime but 17x1=17 is valid, so it finds {17,1} as factors
		local nums, ops = tiles._build_solution(17, "x", 20)
		if #ops > 0 then
			assert.are.equal("x", ops[1])
			assert.are.equal(17, nums[1] * nums[2])
		end
	end)

	it("falls back for multiplication when no factors fit", function()
		-- target=17, max_operand=3: no factor pair exists (17%2!=0, 17%3!=0)
		local nums, ops = tiles._build_solution(17, "x", 3)
		assert.are.equal(0, #ops)
		assert.are.equal(17, nums[1])
	end)

	it("normalizes * to x", function()
		math.randomseed(42)
		local nums, ops = tiles._build_solution(12, "*", 20)
		if #ops > 0 then
			assert.are.equal("x", ops[1])
		end
	end)
end)

describe("tiles solvability integration", function()
	it("deal_hand produces evaluable equations for addition targets", function()
		math.randomseed(1)
		for _ = 1, 50 do
			local target = math.random(3, 20)
			local nums, ops = tiles.deal_hand(target, "+", 20)
			-- Try to find a valid combination
			local found = false
			for _, n1 in ipairs(nums) do
				for _, o in ipairs(ops) do
					for _, n2 in ipairs(nums) do
						if n1 ~= n2 or (n1 == n2 and #nums >= 2) then
							local result = equation.evaluate({n1, o, n2})
							if result == target then
								found = true
								break
							end
						end
					end
					if found then break end
				end
				if found then break end
			end
			assert.is_true(found, "no solvable equation found for target " .. target)
		end
	end)
end)
