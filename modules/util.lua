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

--- Convert a {r, g, b, a} table to vmath.vector4.
--- @param color table {r, g, b, a}
--- @return userdata vmath.vector4
function M.vec4(color)
	return vmath.vector4(color[1], color[2], color[3], color[4])
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

return M
