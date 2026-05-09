local M = {}

-- URLs that have successfully played are cached. Once a sound component is
-- known to exist (and "main:/sounds" lives in the bootstrap collection so it's
-- never unloaded), subsequent plays skip the pcall — sfx.play is called on
-- every tile tap and every hit, and pcall sets up a protected-call frame each
-- time. Cold-path pcall absorbs the brief window during collection transitions.
local KNOWN_URLS = {}
local OPTS = {gain = 1.0}

--- Play a sound effect by name.
--- Sounds are hosted on the "sounds" game object in the main collection.
--- @param name string Sound component ID (e.g. "tile_tap", "attack_hit")
--- @param gain number|nil Optional volume (0-1, default 1)
function M.play(name, gain)
	OPTS.gain = gain or 1.0
	local known = KNOWN_URLS[name]
	if known then
		sound.play(known, OPTS)
		return
	end
	local url = "main:/sounds#" .. name
	local ok = pcall(sound.play, url, OPTS)
	if ok then
		KNOWN_URLS[name] = url
	end
end

return M
