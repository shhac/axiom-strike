require("tests.defold_shim")
local map_data = require("modules.map_data")

describe("map_data.is_unlocked", function()
	it("returns true for nodes with no prereq", function()
		local node = {id = "add_1", prereq = nil}
		assert.is_true(map_data.is_unlocked(node, {}))
	end)

	it("returns true when prereq is met", function()
		local node = {id = "add_2", prereq = "add_1"}
		assert.is_true(map_data.is_unlocked(node, {add_1 = true}))
	end)

	it("returns false when prereq is not met", function()
		local node = {id = "add_2", prereq = "add_1"}
		assert.is_false(map_data.is_unlocked(node, {}))
	end)

	it("returns false when prereq key exists but is not true", function()
		local node = {id = "add_2", prereq = "add_1"}
		assert.is_false(map_data.is_unlocked(node, {add_1 = false}))
	end)
end)

describe("map_data.find_node", function()
	it("finds a valid node by ID", function()
		local node, region = map_data.find_node("add_1")
		assert.is_not_nil(node)
		assert.are.equal("add_1", node.id)
		assert.are.equal("Sprout Path", node.name)
		assert.are.equal("addition", region.id)
	end)

	it("finds nodes from different regions", function()
		local node, region = map_data.find_node("div_5")
		assert.is_not_nil(node)
		assert.are.equal("div_5", node.id)
		assert.are.equal("division", region.id)
	end)

	it("returns nil for invalid ID", function()
		local node, region = map_data.find_node("nonexistent")
		assert.is_nil(node)
		assert.is_nil(region)
	end)

	it("returns nil for nil ID", function()
		local node, region = map_data.find_node(nil)
		assert.is_nil(node)
		assert.is_nil(region)
	end)
end)

describe("map_data.all_nodes", function()
	it("returns all 20 nodes", function()
		local nodes = map_data.all_nodes()
		assert.are.equal(20, #nodes)
	end)

	it("each entry has node and region", function()
		local nodes = map_data.all_nodes()
		for _, entry in ipairs(nodes) do
			assert.is_table(entry.node)
			assert.is_table(entry.region)
			assert.is_string(entry.node.id)
			assert.is_string(entry.region.id)
		end
	end)

	it("contains nodes from all four regions", function()
		local nodes = map_data.all_nodes()
		local regions_seen = {}
		for _, entry in ipairs(nodes) do
			regions_seen[entry.region.id] = true
		end
		assert.is_true(regions_seen["addition"])
		assert.is_true(regions_seen["subtraction"])
		assert.is_true(regions_seen["multiplication"])
		assert.is_true(regions_seen["division"])
	end)
end)
