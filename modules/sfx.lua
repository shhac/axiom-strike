local M = {}

--- Play a sound effect by name.
--- Sounds are hosted on the "sounds" game object in the main collection.
--- @param name string Sound component ID (e.g. "tile_tap", "attack_hit")
--- @param gain number|nil Optional volume (0-1, default 1)
function M.play(name, gain)
	local url = "main:/sounds#" .. name
	local ok, err = pcall(sound.play, url, {gain = gain or 1.0})
	if not ok then
		-- Sound might not be loaded yet (e.g. during collection transitions)
		-- Silently ignore — game must work without sound
	end
end

return M
