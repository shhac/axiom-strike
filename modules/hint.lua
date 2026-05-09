local equation = require("modules.equation")

local M = {}

-- Scratch buffers, reused across calls to compute_path. The 3-step branch can
-- evaluate ~90 candidates per call (6 nums × 3 ops × 5 nums) — without these,
-- every candidate allocated a fresh `test` array, a fresh path array, and N
-- {type, index} records. Now the search runs allocation-free; we only allocate
-- when a new best path is recorded (clone_path), at most a few times per call.
local SCRATCH_TEST = {}
local SCRATCH_PATH_3 = {{type = "num", index = 0}, {type = "op", index = 0}, {type = "num", index = 0}}
local SCRATCH_PATH_2 = {{type = "op",  index = 0}, {type = "num", index = 0}}
local SCRATCH_PATH_1 = {{type = "num", index = 0}}
local SCRATCH_NUMS  = {}
local SCRATCH_OPS   = {}

local function refill_indices(scratch, values, used, prefix)
	local n = 0
	for i = 1, #values do
		if not used[prefix .. i] then n = n + 1; scratch[n] = i end
	end
	for i = #scratch, n + 1, -1 do scratch[i] = nil end
	return scratch
end

-- Pre-fill SCRATCH_TEST with `tokens` (the immutable base). The trailing slots
-- are written per-candidate and the array length is set via final-nil cleanup.
local function prep_base(tokens)
	local n = #tokens
	for i = 1, n do SCRATCH_TEST[i] = tokens[i] end
	for i = #SCRATCH_TEST, n + 1, -1 do SCRATCH_TEST[i] = nil end
	return n
end

local function clone_path(scratch_path)
	local out = {}
	for i, rec in ipairs(scratch_path) do
		out[i] = {type = rec.type, index = rec.index}
	end
	return out
end

function M.compute_path(target, num_vals, op_vals, used, tokens, expect_num)
	if target <= 0 then return nil end

	local best_path = nil
	local best_dist = math.huge

	local free_nums = refill_indices(SCRATCH_NUMS, num_vals, used, "num_")
	local free_ops  = refill_indices(SCRATCH_OPS,  op_vals,  used, "op_")

	local base_len = prep_base(tokens)

	-- 1-step: place a single number
	if expect_num then
		for fi = 1, #free_nums do
			local ni = free_nums[fi]
			SCRATCH_TEST[base_len + 1] = num_vals[ni]
			local r = equation.evaluate(SCRATCH_TEST)
			SCRATCH_TEST[base_len + 1] = nil
			if r then
				local d = math.abs(r - target)
				if d < best_dist or (d == best_dist and (not best_path or 1 < #best_path)) then
					best_dist = d
					SCRATCH_PATH_1[1].index = ni
					best_path = clone_path(SCRATCH_PATH_1)
				end
			end
		end
	end

	-- 2-step: operator then number
	if not expect_num then
		for fo = 1, #free_ops do
			local oi = free_ops[fo]
			SCRATCH_TEST[base_len + 1] = op_vals[oi]
			for fi = 1, #free_nums do
				local ni = free_nums[fi]
				SCRATCH_TEST[base_len + 2] = num_vals[ni]
				local r = equation.evaluate(SCRATCH_TEST)
				if r then
					local d = math.abs(r - target)
					if d < best_dist or (d == best_dist and (not best_path or 2 < #best_path)) then
						best_dist = d
						SCRATCH_PATH_2[1].index = oi
						SCRATCH_PATH_2[2].index = ni
						best_path = clone_path(SCRATCH_PATH_2)
					end
				end
			end
			SCRATCH_TEST[base_len + 1] = nil
			SCRATCH_TEST[base_len + 2] = nil
		end
	end

	-- 3-step: number, operator, number
	if expect_num then
		for f1 = 1, #free_nums do
			local n1 = free_nums[f1]
			SCRATCH_TEST[base_len + 1] = num_vals[n1]
			for fo = 1, #free_ops do
				local oi = free_ops[fo]
				SCRATCH_TEST[base_len + 2] = op_vals[oi]
				for f2 = 1, #free_nums do
					local n2 = free_nums[f2]
					if n1 ~= n2 then
						SCRATCH_TEST[base_len + 3] = num_vals[n2]
						local r = equation.evaluate(SCRATCH_TEST)
						if r then
							local d = math.abs(r - target)
							if d < best_dist or (d == best_dist and (not best_path or 3 < #best_path)) then
								best_dist = d
								SCRATCH_PATH_3[1].index = n1
								SCRATCH_PATH_3[2].index = oi
								SCRATCH_PATH_3[3].index = n2
								best_path = clone_path(SCRATCH_PATH_3)
							end
						end
					end
				end
			end
		end
		SCRATCH_TEST[base_len + 1] = nil
		SCRATCH_TEST[base_len + 2] = nil
		SCRATCH_TEST[base_len + 3] = nil
	end

	return best_path
end

return M
