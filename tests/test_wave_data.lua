require("tests.defold_shim")
local wave_data = require("modules.wave_data")

describe("wave_data.generate_level", function()
	before_each(function()
		math.randomseed(42)
	end)

	it("returns 2 waves at difficulty 1", function()
		local waves = wave_data.generate_level(1, "+")
		assert.are.equal(2, #waves)
	end)

	it("returns 3 waves at difficulty 2+", function()
		local waves = wave_data.generate_level(2, "+")
		assert.are.equal(3, #waves)
	end)

	it("returns 3 waves at difficulty 5", function()
		local waves = wave_data.generate_level(5, "x")
		assert.are.equal(3, #waves)
	end)

	it("each wave has at least one enemy", function()
		for d = 1, 5 do
			local waves = wave_data.generate_level(d, "+")
			for w, wave in ipairs(waves) do
				assert.is_true(#wave >= 1, "wave " .. w .. " at difficulty " .. d .. " has no enemies")
			end
		end
	end)

	it("enemies have required fields", function()
		local waves = wave_data.generate_level(3, "+")
		for _, wave in ipairs(waves) do
			for _, enemy in ipairs(wave) do
				assert.is_not_nil(enemy.hp)
				assert.is_not_nil(enemy.max_hp)
				assert.is_not_nil(enemy.weakness)
				assert.is_not_nil(enemy.attack_power)
				assert.is_not_nil(enemy.is_boss)
				assert.is_not_nil(enemy.skill)
				assert.is_not_nil(enemy.max_operand)
			end
		end
	end)

	it("boss appears in final wave when present", function()
		-- Run many times to catch boss levels (difficulty >= 3, 50% chance)
		local found_boss = false
		for _ = 1, 100 do
			local waves = wave_data.generate_level(5, "+")
			local final_wave = waves[#waves]
			for _, enemy in ipairs(final_wave) do
				if enemy.is_boss then
					found_boss = true
					break
				end
			end
			if found_boss then break end
		end
		assert.is_true(found_boss, "no boss found in 100 level generations at difficulty 5")
	end)

	it("non-final waves never contain bosses", function()
		for _ = 1, 50 do
			local waves = wave_data.generate_level(5, "+")
			for w = 1, #waves - 1 do
				for _, enemy in ipairs(waves[w]) do
					assert.is_false(enemy.is_boss, "boss found in non-final wave " .. w)
				end
			end
		end
	end)

	it("defaults to difficulty 1 and addition", function()
		local waves = wave_data.generate_level()
		assert.are.equal(2, #waves)
		for _, wave in ipairs(waves) do
			for _, enemy in ipairs(wave) do
				assert.are.equal("+", enemy.skill)
			end
		end
	end)

	it("supports Elo-based generation", function()
		local waves = wave_data.generate_level(3, "+", 1000)
		assert.is_true(#waves >= 2)
		for _, wave in ipairs(waves) do
			for _, enemy in ipairs(wave) do
				assert.is_not_nil(enemy.question_elo)
			end
		end
	end)
end)
