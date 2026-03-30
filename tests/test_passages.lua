require("tests.defold_shim")
local passages = require("modules.passages")

describe("passages.get_random", function()
	it("returns a passage", function()
		local p = passages.get_random()
		assert.is_not_nil(p)
		assert.is_string(p.text)
		assert.is_string(p.question)
		assert.is_string(p.correct)
	end)

	it("returns a passage with grade filtering", function()
		local p = passages.get_random(1, 2)
		assert.is_not_nil(p)
		assert.is_true(p.grade >= 1)
		assert.is_true(p.grade <= 2)
	end)

	it("returns a passage when no matches (falls back to all)", function()
		local p = passages.get_random(99, 100)
		assert.is_not_nil(p)
	end)

	it("passage has required fields", function()
		local p = passages.get_random()
		assert.is_string(p.text)
		assert.is_string(p.question)
		assert.is_string(p.correct)
		assert.is_string(p.almost_right)
		assert.is_string(p.reasonable)
		assert.is_table(p.wrong)
		assert.are.equal(2, #p.wrong)
		assert.is_number(p.grade)
	end)
end)

describe("passages.build_answers", function()
	it("returns 5 answer entries", function()
		local p = passages.get_random()
		local answers, correct_index = passages.build_answers(p)
		assert.are.equal(5, #answers)
	end)

	it("sets correct_index to a valid position", function()
		local p = passages.get_random()
		local answers, correct_index = passages.build_answers(p)
		assert.is_true(correct_index >= 1)
		assert.is_true(correct_index <= 5)
	end)

	it("correct_index points to the correct answer", function()
		local p = passages.get_random()
		local answers, correct_index = passages.build_answers(p)
		assert.are.equal("correct", answers[correct_index].quality)
	end)

	it("contains all quality levels", function()
		local p = passages.get_random()
		local answers = passages.build_answers(p)
		local qualities = {}
		for _, a in ipairs(answers) do
			qualities[a.quality] = (qualities[a.quality] or 0) + 1
		end
		assert.are.equal(1, qualities["correct"])
		assert.are.equal(1, qualities["almost_right"])
		assert.are.equal(1, qualities["reasonable"])
		assert.are.equal(2, qualities["wrong"])
	end)

	it("each answer has text and quality fields", function()
		local p = passages.get_random()
		local answers = passages.build_answers(p)
		for _, a in ipairs(answers) do
			assert.is_string(a.text)
			assert.is_string(a.quality)
		end
	end)
end)
