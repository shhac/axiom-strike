require("tests.defold_shim")
local onboarding = require("modules.onboarding")

describe("onboarding.get_message", function()
	it("returns attack message for completed_count=0 in attack phase", function()
		local msg = onboarding.get_message(0, "attack")
		assert.is_not_nil(msg)
		assert.is_truthy(msg:find("Tap"))
	end)

	it("returns nil for completed_count=0 in wrong phase", function()
		assert.is_nil(onboarding.get_message(0, "defend"))
		assert.is_nil(onboarding.get_message(0, "between_waves"))
	end)

	it("returns defend message for completed_count=1 in defend phase", function()
		local msg = onboarding.get_message(1, "defend")
		assert.is_not_nil(msg)
		assert.is_truthy(msg:find("block"))
	end)

	it("returns nil for completed_count=1 in attack phase", function()
		assert.is_nil(onboarding.get_message(1, "attack"))
	end)

	it("returns between_waves message for completed_count=2", function()
		local msg = onboarding.get_message(2, "between_waves")
		assert.is_not_nil(msg)
		assert.is_truthy(msg:find("REST"))
	end)

	it("returns nil for completed_count=2 in wrong phase", function()
		assert.is_nil(onboarding.get_message(2, "attack"))
	end)

	it("returns attack message for completed_count=3 (attack_multi maps to attack)", function()
		local msg = onboarding.get_message(3, "attack")
		assert.is_not_nil(msg)
		assert.is_truthy(msg:find("target"))
	end)

	it("returns nil for completed_count=3 in defend phase", function()
		assert.is_nil(onboarding.get_message(3, "defend"))
	end)

	it("returns nil for completed_count > 3", function()
		assert.is_nil(onboarding.get_message(4, "attack"))
		assert.is_nil(onboarding.get_message(10, "defend"))
		assert.is_nil(onboarding.get_message(100, "between_waves"))
	end)
end)

describe("onboarding.battles_completed", function()
	it("returns 0 for empty save data", function()
		assert.are.equal(0, onboarding.battles_completed({}))
	end)

	it("returns 0 for nil save data", function()
		assert.are.equal(0, onboarding.battles_completed(nil))
	end)

	it("returns 0 for empty completed_nodes", function()
		assert.are.equal(0, onboarding.battles_completed({completed_nodes = {}}))
	end)

	it("counts completed nodes correctly", function()
		local save = {completed_nodes = {node_1 = true, node_2 = true, node_3 = true}}
		assert.are.equal(3, onboarding.battles_completed(save))
	end)

	it("counts single completed node", function()
		local save = {completed_nodes = {node_1 = true}}
		assert.are.equal(1, onboarding.battles_completed(save))
	end)
end)
