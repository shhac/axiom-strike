local equation = require("modules.equation")

local M = {}

local function free_indices(values, used, prefix)
	local free = {}
	for i = 1, #values do
		if not used[prefix .. i] then free[#free + 1] = i end
	end
	return free
end

local function try_candidate(base, extra_tokens, num_vals, op_vals, target, best_dist, best_path, path)
	local test = {unpack(base)}
	for _, tok in ipairs(extra_tokens) do test[#test + 1] = tok end
	local r = equation.evaluate(test)
	if not r then return best_dist, best_path end
	local d = math.abs(r - target)
	if d < best_dist or (d == best_dist and (not best_path or #path < #best_path)) then
		return d, path
	end
	return best_dist, best_path
end

function M.compute_path(target, num_vals, op_vals, used, tokens, expect_num)
	if target <= 0 then return nil end

	local best_path = nil
	local best_dist = math.huge

	local free_nums = free_indices(num_vals, used, "num_")
	local free_ops = free_indices(op_vals, used, "op_")

	local base = {}
	for _, t in ipairs(tokens) do base[#base + 1] = t end

	-- 1-step: place a single number
	if expect_num then
		for _, ni in ipairs(free_nums) do
			best_dist, best_path = try_candidate(base, {num_vals[ni]}, num_vals, op_vals, target, best_dist, best_path,
				{{type = "num", index = ni}})
		end
	end

	-- 2-step: operator then number
	if not expect_num then
		for _, oi in ipairs(free_ops) do
			for _, ni in ipairs(free_nums) do
				best_dist, best_path = try_candidate(base, {op_vals[oi], num_vals[ni]}, num_vals, op_vals, target, best_dist, best_path,
					{{type = "op", index = oi}, {type = "num", index = ni}})
			end
		end
	end

	-- 3-step: number, operator, number
	if expect_num then
		for _, n1 in ipairs(free_nums) do
			for _, oi in ipairs(free_ops) do
				for _, n2 in ipairs(free_nums) do
					if n1 ~= n2 then
						best_dist, best_path = try_candidate(base, {num_vals[n1], op_vals[oi], num_vals[n2]}, num_vals, op_vals, target, best_dist, best_path,
							{{type = "num", index = n1}, {type = "op", index = oi}, {type = "num", index = n2}})
					end
				end
			end
		end
	end

	return best_path
end

return M
