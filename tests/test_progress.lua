require("tests.defold_shim")
local progress = require("modules.progress")

describe("progress.load", function()
	it("returns default data when sys returns empty table", function()
		local data = progress.load()
		assert.is_table(data.completed_nodes)
		assert.is_table(data.stars)
		assert.is_table(data.player_elo)
		assert.is_table(data.elo_attempts)
		assert.are.equal(1000, data.player_elo.addition)
		assert.are.equal(0, data.elo_attempts.addition)
		assert.are.equal(0, data.last_played)
	end)

	it("fills missing fields for forward-compat", function()
		local original_load = sys.load
		sys.load = function()
			return {completed_nodes = {add_1 = true}, stars = {add_1 = 3}}
		end

		local data = progress.load()
		assert.is_true(data.completed_nodes.add_1)
		assert.are.equal(3, data.stars.add_1)
		assert.is_table(data.player_elo)
		assert.are.equal(1000, data.player_elo.addition)
		assert.is_table(data.elo_attempts)
		assert.are.equal(0, data.last_played)

		sys.load = original_load
	end)

	it("does not overwrite existing fields with defaults", function()
		local original_load = sys.load
		sys.load = function()
			return {
				completed_nodes = {add_1 = true},
				stars = {add_1 = 2},
				player_elo = {addition = 1500, subtraction = 1000, multiplication = 1000, division = 1000, reading = 1000},
				elo_attempts = {addition = 50, subtraction = 0, multiplication = 0, division = 0, reading = 0},
				last_played = 12345,
			}
		end

		local data = progress.load()
		assert.are.equal(1500, data.player_elo.addition)
		assert.are.equal(50, data.elo_attempts.addition)
		assert.are.equal(12345, data.last_played)

		sys.load = original_load
	end)
end)

describe("progress.mark_completed", function()
	it("marks a node as completed with stars", function()
		local data = progress.load()
		progress.mark_completed(data, "add_1", 2)
		assert.is_true(data.completed_nodes.add_1)
		assert.are.equal(2, data.stars.add_1)
	end)

	it("defaults to 1 star when stars is nil", function()
		local data = progress.load()
		progress.mark_completed(data, "add_1", nil)
		assert.are.equal(1, data.stars.add_1)
	end)

	it("keeps higher star count (math.max)", function()
		local data = progress.load()
		progress.mark_completed(data, "add_1", 3)
		assert.are.equal(3, data.stars.add_1)
		progress.mark_completed(data, "add_1", 1)
		assert.are.equal(3, data.stars.add_1)
	end)

	it("upgrades star count when new is higher", function()
		local data = progress.load()
		progress.mark_completed(data, "add_1", 1)
		assert.are.equal(1, data.stars.add_1)
		progress.mark_completed(data, "add_1", 3)
		assert.are.equal(3, data.stars.add_1)
	end)
end)

describe("progress._deep_copy", function()
	it("copies nested tables without sharing references", function()
		local original = {a = {b = {c = 42}}, d = "hello"}
		local copy = progress._deep_copy(original)
		assert.are.equal(42, copy.a.b.c)
		assert.are.equal("hello", copy.d)

		copy.a.b.c = 99
		assert.are.equal(42, original.a.b.c)
	end)

	it("handles non-table values", function()
		assert.are.equal(42, progress._deep_copy(42))
		assert.are.equal("hello", progress._deep_copy("hello"))
		assert.is_nil(progress._deep_copy(nil))
		assert.is_true(progress._deep_copy(true))
	end)

	it("copies arrays correctly", function()
		local original = {1, 2, {3, 4}}
		local copy = progress._deep_copy(original)
		assert.are.equal(3, #copy)
		assert.are.equal(2, #copy[3])
		copy[3][1] = 99
		assert.are.equal(3, original[3][1])
	end)

	it("handles empty table", function()
		local copy = progress._deep_copy({})
		assert.is_table(copy)
		assert.is_nil(next(copy))
	end)
end)

describe("progress.reset", function()
	it("restores default data", function()
		local data = progress.load()
		progress.mark_completed(data, "add_1", 3)
		progress.reset()

		local fresh = progress.load()
		assert.is_nil(next(fresh.completed_nodes))
		assert.is_nil(next(fresh.stars))
		assert.are.equal(1000, fresh.player_elo.addition)
	end)
end)
