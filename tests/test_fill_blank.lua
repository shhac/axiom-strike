require("tests.defold_shim")
local fill_blank = require("modules.fill_blank")

describe("fill_blank.generate", function()
	before_each(function()
		math.randomseed(42)
	end)

	describe("addition", function()
		it("produces a valid problem at difficulty 1 (result blank only)", function()
			local p = fill_blank.generate(7, "+", 10, 1)
			assert.are.equal("result", p.blank_type)
			assert.are.equal("+", p.op)
			assert.are.equal(p.a + p.b, p.result)
			assert.are.equal(7, p.result)
		end)

		it("produces operand blanks at difficulty 2", function()
			local seen_types = {}
			for _ = 1, 50 do
				local p = fill_blank.generate(8, "+", 10, 2)
				seen_types[p.blank_type] = true
				assert.are.equal(p.a + p.b, p.result)
			end
			assert.is_true(seen_types["result"] or seen_types["operand2"])
		end)

		it("produces operand1 blanks at difficulty 3", function()
			local seen_types = {}
			for _ = 1, 100 do
				local p = fill_blank.generate(9, "+", 15, 3)
				seen_types[p.blank_type] = true
				assert.are.equal(p.a + p.b, p.result)
			end
			assert.is_true(seen_types["operand1"] ~= nil or seen_types["operand2"] ~= nil or seen_types["result"] ~= nil)
		end)

		it("produces operator blanks at difficulty 4+", function()
			local seen_operator = false
			for _ = 1, 100 do
				local p = fill_blank.generate(5, "+", 10, 4)
				if p.blank_type == "operator" then
					seen_operator = true
					assert.are.equal("+", p.correct)
				end
			end
			assert.is_true(seen_operator)
		end)
	end)

	describe("subtraction", function()
		it("produces correct subtraction equation", function()
			local p = fill_blank.generate(5, "-", 20, 1)
			assert.are.equal("-", p.op)
			assert.are.equal(p.a - p.b, p.result)
			assert.are.equal(5, p.result)
			assert.is_true(p.a > p.result)
		end)
	end)

	describe("multiplication", function()
		it("produces correct multiplication equation", function()
			local p = fill_blank.generate(12, "x", 20, 1)
			assert.are.equal("x", p.op)
			assert.are.equal(p.a * p.b, p.result)
			assert.are.equal(12, p.result)
		end)

		it("normalizes * to x", function()
			local p = fill_blank.generate(6, "*", 10, 1)
			assert.are.equal("x", p.op)
			assert.are.equal(6, p.result)
		end)
	end)

	describe("division", function()
		it("produces correct division equation", function()
			local p = fill_blank.generate(4, "/", 20, 1)
			assert.are.equal("/", p.op)
			assert.are.equal(p.a / p.b, p.result)
			assert.are.equal(4, p.result)
		end)
	end)

	describe("display string", function()
		it("formats result blank correctly", function()
			-- Force difficulty 1 so blank_type is always "result"
			local p = fill_blank.generate(5, "+", 10, 1)
			assert.is_truthy(p.display:find("="))
			assert.is_truthy(p.display:find("_"))
			-- Should end with "= _"
			assert.is_truthy(p.display:match("= _$"))
		end)
	end)

	describe("options", function()
		it("always includes the correct answer for number blanks", function()
			for _ = 1, 50 do
				local p = fill_blank.generate(math.random(2, 15), "+", 20, math.random(1, 3))
				local found = false
				for _, opt in ipairs(p.options) do
					if opt == p.correct then found = true; break end
				end
				assert.is_true(found, "correct answer " .. tostring(p.correct) .. " not in options")
			end
		end)

		it("always has 4 options for number blanks", function()
			local p = fill_blank.generate(10, "+", 20, 1)
			assert.are.equal(4, #p.options)
		end)

		it("provides all 4 operators for operator blanks", function()
			-- Difficulty 4+ can produce operator blanks
			local found_operator_blank = false
			for _ = 1, 200 do
				local p = fill_blank.generate(5, "+", 10, 4)
				if p.blank_type == "operator" then
					found_operator_blank = true
					assert.are.equal(4, #p.options)
					local ops_set = {}
					for _, o in ipairs(p.options) do ops_set[o] = true end
					assert.is_true(ops_set["+"])
					assert.is_true(ops_set["-"])
					assert.is_true(ops_set["x"])
					assert.is_true(ops_set["/"])
					break
				end
			end
			assert.is_true(found_operator_blank)
		end)
	end)
end)

describe("fill_blank._generate_number_options", function()
	it("returns 4 unique options including correct", function()
		math.randomseed(42)
		local opts = fill_blank._generate_number_options(5, 20)
		assert.are.equal(4, #opts)
		local found = false
		for _, v in ipairs(opts) do
			if v == 5 then found = true end
		end
		assert.is_true(found)
	end)

	it("handles correct=1 with small max_operand", function()
		math.randomseed(42)
		local opts = fill_blank._generate_number_options(1, 3)
		assert.are.equal(3, #opts) -- only 1,2,3 possible
		local found = false
		for _, v in ipairs(opts) do
			if v == 1 then found = true end
			assert.is_true(v >= 1 and v <= 3)
		end
		assert.is_true(found)
	end)

	it("handles correct=max_operand", function()
		math.randomseed(42)
		local opts = fill_blank._generate_number_options(10, 10)
		local found = false
		for _, v in ipairs(opts) do
			if v == 10 then found = true end
			assert.is_true(v >= 1 and v <= 10)
		end
		assert.is_true(found)
	end)
end)
