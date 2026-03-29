local M = {}

local CONSTANTS = require("modules.constants")

-- Region definitions: each region is an operation type with themed nodes
M.regions = {
	{
		id = "addition",
		name = "Addition Grove",
		skill = CONSTANTS.OP_ADD,
		color = {0.2, 0.733, 0.4},
		nodes = {
			{id = "add_1", name = "Sprout Path",    difficulty = 1, x = 200, y = 500, prereq = nil},
			{id = "add_2", name = "Leaf Trail",      difficulty = 1, x = 320, y = 460, prereq = "add_1"},
			{id = "add_3", name = "Branch Climb",    difficulty = 2, x = 440, y = 490, prereq = "add_2"},
			{id = "add_4", name = "Canopy Reach",    difficulty = 2, x = 540, y = 440, prereq = "add_3"},
			{id = "add_5", name = "Grove Guardian",  difficulty = 3, x = 650, y = 470, prereq = "add_4"},
		},
	},
	{
		id = "subtraction",
		name = "Subtraction Peaks",
		skill = CONSTANTS.OP_SUB,
		color = {1.0, 0.4, 0.267},
		nodes = {
			{id = "sub_1", name = "Ember Foothills", difficulty = 1, x = 200, y = 300, prereq = nil},
			{id = "sub_2", name = "Ash Slope",       difficulty = 2, x = 320, y = 260, prereq = "sub_1"},
			{id = "sub_3", name = "Lava Ridge",      difficulty = 2, x = 440, y = 290, prereq = "sub_2"},
			{id = "sub_4", name = "Cinder Pass",     difficulty = 3, x = 540, y = 240, prereq = "sub_3"},
			{id = "sub_5", name = "Peak Warden",     difficulty = 3, x = 650, y = 270, prereq = "sub_4"},
		},
	},
	{
		id = "multiplication",
		name = "Multiplication Caverns",
		skill = CONSTANTS.OP_MUL,
		color = {0.733, 0.467, 1.0},
		nodes = {
			{id = "mul_1", name = "Crystal Entry",   difficulty = 2, x = 850, y = 500, prereq = "add_5"},
			{id = "mul_2", name = "Gem Tunnel",       difficulty = 2, x = 950, y = 460, prereq = "mul_1"},
			{id = "mul_3", name = "Prism Hall",       difficulty = 3, x = 1060, y = 490, prereq = "mul_2"},
			{id = "mul_4", name = "Echo Chamber",     difficulty = 3, x = 1060, y = 400, prereq = "mul_3"},
			{id = "mul_5", name = "Cavern King",      difficulty = 4, x = 1160, y = 440, prereq = "mul_4"},
		},
	},
	{
		id = "division",
		name = "Division Depths",
		skill = CONSTANTS.OP_DIV,
		color = {0.267, 0.667, 1.0},
		nodes = {
			{id = "div_1", name = "Tide Pools",       difficulty = 2, x = 850, y = 300, prereq = "sub_5"},
			{id = "div_2", name = "Current Stream",    difficulty = 3, x = 950, y = 260, prereq = "div_1"},
			{id = "div_3", name = "Whirlpool Basin",   difficulty = 3, x = 1060, y = 290, prereq = "div_2"},
			{id = "div_4", name = "Abyssal Trench",    difficulty = 4, x = 1060, y = 200, prereq = "div_3"},
			{id = "div_5", name = "Depth Guardian",    difficulty = 5, x = 1160, y = 240, prereq = "div_4"},
		},
	},
}

--- Find a node by ID across all regions.
function M.find_node(node_id)
	for _, region in ipairs(M.regions) do
		for _, node in ipairs(region.nodes) do
			if node.id == node_id then
				return node, region
			end
		end
	end
	return nil, nil
end

--- Get all nodes as a flat list with their region info attached.
function M.all_nodes()
	local result = {}
	for _, region in ipairs(M.regions) do
		for _, node in ipairs(region.nodes) do
			result[#result + 1] = {node = node, region = region}
		end
	end
	return result
end

--- Check if a node is unlocked given a set of completed node IDs.
function M.is_unlocked(node, completed)
	if not node.prereq then return true end
	return completed[node.prereq] == true
end

return M
