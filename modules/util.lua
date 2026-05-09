local M = {}

--- Fisher-Yates shuffle (in-place).
--- @param t table Array to shuffle
--- @return table The same table, shuffled
function M.shuffle(t)
	for i = #t, 2, -1 do
		local j = math.random(1, i)
		t[i], t[j] = t[j], t[i]
	end
	return t
end

--- Canonical operator form. Normalizes "*" to "x" for display consistency.
local OP_CANONICAL = {
	["+"] = "+",
	["-"] = "-",
	["x"] = "x",
	["*"] = "x",
	["/"] = "/",
}

--- Normalize an operator string to its canonical form.
--- @param op string
--- @return string
function M.normalize_op(op)
	return OP_CANONICAL[op] or op
end

--- Find all factor pairs of target where both factors <= max_operand.
--- @param target number
--- @param max_operand number
--- @return table Array of {a, b} pairs, may be empty
function M.find_factor_pairs(target, max_operand)
	local factors = {}
	for i = 2, math.min(max_operand, target) do
		if target % i == 0 and target / i <= max_operand then
			factors[#factors + 1] = {i, target / i}
		end
	end
	return factors
end

--- Check whether target has at least one factor pair within max_operand.
--- @param target number
--- @param max_operand number
--- @return boolean
function M.has_factor_pair(target, max_operand)
	for i = 2, math.min(max_operand, target) do
		if target % i == 0 and target / i <= max_operand then
			return true
		end
	end
	return false
end

return M
