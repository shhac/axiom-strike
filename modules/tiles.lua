local M = {}

local CONSTANTS = require("modules.constants")
local util = require("modules.util")
local shuffle = util.shuffle

--- Generate a solvable tile hand for a given target number.
--- Builds the solution first, then adds distractor tiles.
--- @param target number The number to reach
--- @param op string The operation type ("+", "-", "x", "/")
--- @param max_operand number Maximum value for number tiles
--- @return table number_tiles, table operator_tiles
function M.deal_hand(target, op, max_operand)
	max_operand = max_operand or CONSTANTS.MAX_OPERAND_PHASE1
	op = op or CONSTANTS.OP_ADD

	-- Build the solution
	local solution_nums, solution_ops = M._build_solution(target, op, max_operand)

	-- Start with solution tiles
	local number_tiles = {}
	for _, n in ipairs(solution_nums) do
		number_tiles[#number_tiles + 1] = n
	end

	-- Add distractor number tiles to reach desired hand size
	local distractors_needed = CONSTANTS.NUM_NUMBER_TILES - #number_tiles
	for _ = 1, distractors_needed do
		number_tiles[#number_tiles + 1] = math.random(1, max_operand)
	end

	-- Build operator tiles: include solution ops + extras
	local operator_tiles = {}
	for _, o in ipairs(solution_ops) do
		operator_tiles[#operator_tiles + 1] = o
	end
	local extra_ops = {CONSTANTS.OP_ADD, CONSTANTS.OP_SUB}
	while #operator_tiles < CONSTANTS.NUM_OPERATOR_TILES do
		operator_tiles[#operator_tiles + 1] = extra_ops[math.random(1, #extra_ops)]
	end

	-- Shuffle both
	shuffle(number_tiles)
	shuffle(operator_tiles)

	return number_tiles, operator_tiles
end

--- Build a valid solution that reaches the target.
--- Returns the numbers and operators needed.
--- @param target number
--- @param op string
--- @param max_operand number
--- @return table numbers, table operators
local SOLUTION_BUILDERS = {
	["+"] = function(target, max_operand)
		local a = math.random(1, math.max(1, target - 1))
		local b = target - a
		if b < 1 then return {target}, {} end
		return {a, b}, {"+"}
	end,

	["-"] = function(target, max_operand)
		local b = math.random(1, math.min(max_operand, max_operand - target))
		local a = target + b
		if a > max_operand then
			a = max_operand
			b = a - target
		end
		if b < 1 then return {target}, {} end
		return {a, b}, {"-"}
	end,

	["x"] = function(target, max_operand)
		local factors = {}
		for i = 2, math.min(max_operand, target) do
			if target % i == 0 and target / i <= max_operand then
				factors[#factors + 1] = {i, target / i}
			end
		end
		if #factors > 0 then
			local pair = factors[math.random(1, #factors)]
			return {pair[1], pair[2]}, {"x"}
		end
		return {target}, {}
	end,

	["/"] = function(target, max_operand)
		local b = math.random(2, math.min(10, math.floor(max_operand / math.max(1, target))))
		local a = target * b
		if a > max_operand or b < 2 then return {target}, {} end
		return {a, b}, {"/"}
	end,
}

function M._build_solution(target, op, max_operand)
	local builder = SOLUTION_BUILDERS[util.normalize_op(op)]
	if builder then
		return builder(target, max_operand)
	end
	return {target}, {}
end

return M
