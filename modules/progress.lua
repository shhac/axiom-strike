local M = {}

local SAVE_FILE = "axiom_strike"
local SAVE_KEY = "progress"

local default_data = {
	completed_nodes = {},
	stars = {},
	player_elo = {
		addition = 1000,
		subtraction = 1000,
		multiplication = 1000,
		division = 1000,
		reading = 1000,
	},
	elo_attempts = {
		addition = 0,
		subtraction = 0,
		multiplication = 0,
		division = 0,
		reading = 0,
	},
	last_played = 0,
}

function M.load()
	local path = sys.get_save_file(SAVE_FILE, SAVE_KEY)
	local data = sys.load(path)
	if not data or not data.completed_nodes then
		data = M._deep_copy(default_data)
	end
	-- Ensure all fields exist (forward compat)
	for k, v in pairs(default_data) do
		if data[k] == nil then
			data[k] = M._deep_copy(v)
		end
	end
	return data
end

function M.save(data)
	local path = sys.get_save_file(SAVE_FILE, SAVE_KEY)
	sys.save(path, data)
end

function M.mark_completed(data, node_id, stars)
	data.completed_nodes[node_id] = true
	local existing = data.stars[node_id] or 0
	data.stars[node_id] = math.max(existing, stars or 1)
	M.save(data)
end

function M.reset()
	M.save(M._deep_copy(default_data))
end

function M._deep_copy(t)
	if type(t) ~= "table" then return t end
	local copy = {}
	for k, v in pairs(t) do
		copy[k] = M._deep_copy(v)
	end
	return copy
end

return M
