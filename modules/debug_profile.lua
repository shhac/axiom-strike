-- Debug profiler controls. Call from on_input handlers:
--
--   if debug_profile.handle(action_id, action) then return true end
--
-- Triggers (debug builds only — ignored in release):
--   * F1 / 4-finger touch  → toggle the overlay
--   * F2                    → pause/resume the live readout (stops bar flicker)
--   * F3                    → cycle: run → peak-frame → record
--
-- Note: profiler.set_ui_mode is a no-op in release builds, so calling it
-- unconditionally is fine.

local M = {}

local TOGGLE_PROFILE = hash("toggle_profile")
local PROFILE_PAUSE  = hash("profile_pause")
local PROFILE_PEAK   = hash("profile_peak")
local TOUCH = hash("touch")

local paused = false
local mode_index = 1
local MODES = {
	"run",
	"pause",
	"peak",
	"record",
}

local function apply_mode(name)
	if not profiler or not profiler.set_ui_mode then return end
	if name == "run"    then profiler.set_ui_mode(profiler.MODE_RUN) end
	if name == "pause"  then profiler.set_ui_mode(profiler.MODE_PAUSE) end
	if name == "peak"   then profiler.set_ui_mode(profiler.MODE_SHOW_PEAK_FRAME) end
	if name == "record" then profiler.set_ui_mode(profiler.MODE_RECORD) end
end

function M.handle(action_id, action)
	if action_id == TOGGLE_PROFILE and action.pressed then
		msg.post("@system:", "toggle_profile")
		return true
	end
	if action_id == PROFILE_PAUSE and action.pressed then
		paused = not paused
		apply_mode(paused and "pause" or "run")
		return true
	end
	if action_id == PROFILE_PEAK and action.pressed then
		mode_index = (mode_index % #MODES) + 1
		apply_mode(MODES[mode_index])
		return true
	end
	if action_id == TOUCH and action.pressed and action.touch then
		local n = 0
		for _ in ipairs(action.touch) do n = n + 1 end
		if n >= 4 then
			msg.post("@system:", "toggle_profile")
			return true
		end
	end
	return false
end

return M
