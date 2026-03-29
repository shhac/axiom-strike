local M = {}

--- Evaluate a token array left-to-right (no operator precedence).
--- Tokens alternate: number, operator, number, operator, number...
--- @param tokens table Array of numbers and operator strings
--- @return number|nil result, string|nil error
function M.evaluate(tokens)
	if not tokens or #tokens == 0 then
		return nil, "empty"
	end
	if #tokens % 2 == 0 then
		return nil, "incomplete"
	end

	local result = tokens[1]
	if type(result) ~= "number" then
		return nil, "must start with number"
	end

	for i = 2, #tokens, 2 do
		local op = tokens[i]
		local operand = tokens[i + 1]
		if type(op) ~= "string" then
			return nil, "expected operator at position " .. i
		end
		if type(operand) ~= "number" then
			return nil, "expected number at position " .. (i + 1)
		end

		if op == "+" then
			result = result + operand
		elseif op == "-" then
			result = result - operand
		elseif op == "x" or op == "*" then
			result = result * operand
		elseif op == "/" then
			if operand == 0 then
				return nil, "division by zero"
			end
			result = result / operand
		else
			return nil, "unknown operator: " .. op
		end
	end

	return result, nil
end

--- Check if a token sequence is valid (alternating number/operator, starts and ends with number).
--- @param tokens table
--- @return boolean
function M.is_valid(tokens)
	if not tokens or #tokens == 0 then
		return false
	end
	if #tokens % 2 == 0 then
		return false
	end
	for i = 1, #tokens do
		if i % 2 == 1 then
			if type(tokens[i]) ~= "number" then return false end
		else
			if type(tokens[i]) ~= "string" then return false end
		end
	end
	return true
end

--- Format tokens as a display string.
--- @param tokens table
--- @return string
function M.to_string(tokens)
	if not tokens or #tokens == 0 then
		return ""
	end
	local parts = {}
	for _, token in ipairs(tokens) do
		parts[#parts + 1] = tostring(token)
	end
	return table.concat(parts, " ")
end

return M
