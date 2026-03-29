local M = {}

local util = require("modules.util")

--- Problem types:
--- "result"   :  a + b = _
--- "operand1" :  _ + b = c
--- "operand2" :  a + _ = c
--- "operator" :  a _ b = c

local TYPES = {"result", "operand1", "operand2", "operator"}

--- Generate a fill-in-the-blank problem.
--- @param target number The target/answer number
--- @param op string Operation type
--- @param max_operand number Maximum operand value
--- @param difficulty number 1-5, controls which blank types are used
--- @return table problem {equation_parts, blank_index, correct_answer, options, display}
function M.generate(target, op, max_operand, difficulty)
	op = util.normalize_op(op or "+")
	max_operand = max_operand or 10
	difficulty = difficulty or 1

	-- Pick blank type based on difficulty
	local blank_type
	if difficulty <= 1 then
		blank_type = "result"  -- easiest: a + b = ?
	elseif difficulty <= 2 then
		local choices = {"result", "operand2"}
		blank_type = choices[math.random(1, #choices)]
	elseif difficulty <= 3 then
		local choices = {"result", "operand1", "operand2"}
		blank_type = choices[math.random(1, #choices)]
	else
		blank_type = TYPES[math.random(1, #TYPES)]
	end

	-- Generate the full equation
	local a, b, result
	if op == "+" then
		a = math.random(1, math.max(1, target - 1))
		b = target - a
		result = target
	elseif op == "-" then
		local max_a = math.min(max_operand, target + max_operand)
		a = math.random(target + 1, math.max(target + 1, max_a))
		b = a - target
		result = target
	elseif op == "x" then
		-- Find a factor pair
		local factors = {}
		for i = 2, math.min(max_operand, target) do
			if target % i == 0 and target / i <= max_operand then
				factors[#factors + 1] = {i, target / i}
			end
		end
		if #factors > 0 then
			local pair = factors[math.random(1, #factors)]
			a, b = pair[1], pair[2]
		else
			a, b = target, 1
		end
		result = target
	elseif op == "/" then
		b = math.random(2, math.min(10, max_operand))
		a = target * b
		if a > max_operand then a = target; b = 1 end
		result = target
	else
		a = math.random(1, math.max(1, target - 1))
		b = target - a
		result = target
	end

	-- Determine the blank and correct answer
	local correct, display_parts
	if blank_type == "result" then
		correct = result
		display_parts = {tostring(a), op, tostring(b), "=", "_"}
	elseif blank_type == "operand1" then
		correct = a
		display_parts = {"_", op, tostring(b), "=", tostring(result)}
	elseif blank_type == "operand2" then
		correct = b
		display_parts = {tostring(a), op, "_", "=", tostring(result)}
	elseif blank_type == "operator" then
		correct = op
		display_parts = {tostring(a), "_", tostring(b), "=", tostring(result)}
	end

	-- Generate wrong options
	local options
	if blank_type == "operator" then
		options = {"+", "-", "x", "/"}
	else
		options = M._generate_number_options(correct, max_operand)
	end

	return {
		display = table.concat(display_parts, " "),
		display_parts = display_parts,
		blank_type = blank_type,
		correct = correct,
		options = options,
		a = a,
		b = b,
		op = op,
		result = result,
	}
end

--- Generate 4 number options including the correct answer.
function M._generate_number_options(correct, max_operand)
	local opts = {correct}
	local used = {[correct] = true}

	-- Add close distractors
	local nearby = {correct - 1, correct + 1, correct - 2, correct + 2, correct * 2, math.floor(correct / 2)}
	util.shuffle(nearby)
	for _, v in ipairs(nearby) do
		if v >= 1 and v <= max_operand and not used[v] then
			opts[#opts + 1] = v
			used[v] = true
			if #opts >= 4 then break end
		end
	end

	-- Fill remaining with random
	while #opts < 4 do
		local v = math.random(1, max_operand)
		if not used[v] then
			opts[#opts + 1] = v
			used[v] = true
		end
	end

	util.shuffle(opts)
	return opts
end

return M
