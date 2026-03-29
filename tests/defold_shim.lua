-- Shim for Defold globals so pure Lua modules can be loaded outside the engine.
-- Only stubs what our modules actually reference at require-time.

if not vmath then
	vmath = {
		vector3 = function(x, y, z) return {x = x, y = y, z = z} end,
		vector4 = function(x, y, z, w) return {x = x, y = y, z = z, w = w} end,
	}
end

if not hash then
	hash = function(s) return s end
end

if not sys then
	sys = {
		get_save_file = function(app, name) return "/tmp/" .. app .. "_" .. name end,
		load = function(path) return {} end,
		save = function(path, data) return true end,
	}
end

-- Add project root to package path so require("modules.foo") works
local script_dir = debug.getinfo(1, "S").source:match("@(.*/)")
local project_root = script_dir .. "../"
package.path = project_root .. "?.lua;" .. project_root .. "?/init.lua;" .. package.path
