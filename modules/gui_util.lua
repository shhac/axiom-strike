local M = {}

function M.safe_delete(node)
	gui.cancel_animations(node)
	gui.delete_node(node)
end

function M.create_sprite(atlas, image, pos, size, opts)
	opts = opts or {}
	local node = gui.new_box_node(pos, size or vmath.vector3(16, 16, 0))
	gui.set_texture(node, atlas)
	gui.play_flipbook(node, hash(image))
	if opts.scale then gui.set_scale(node, vmath.vector3(opts.scale, opts.scale, 1)) end
	if opts.alpha then gui.set_alpha(node, opts.alpha) end
	if opts.color then gui.set_color(node, opts.color) end
	gui.set_size_mode(node, opts.size_mode or gui.SIZE_MODE_AUTO)
	if opts.size_mode == gui.SIZE_MODE_MANUAL and opts.manual_size then
		gui.set_size(node, opts.manual_size)
	end
	return node
end

function M.create_bg_layer(sprite_list, nodes_table, default_alpha)
	for _, t in ipairs(sprite_list) do
		local node = M.create_sprite("bg", t.img,
			vmath.vector3(t.x, t.y, 0), vmath.vector3(16, 16, 0),
			{scale = t.s, alpha = t.a or default_alpha})
		nodes_table[#nodes_table + 1] = node
	end
end

function M.pop(node, scale_factor, duration)
	scale_factor = scale_factor or 1.15
	duration = duration or 0.2
	gui.cancel_animation(node, gui.PROP_SCALE)
	local s = gui.get_scale(node)
	gui.set_scale(node, vmath.vector3(s.x * scale_factor, s.y * scale_factor, 1))
	gui.animate(node, gui.PROP_SCALE, s, gui.EASING_OUTBACK, duration)
end

function M.pop_in(node, target_scale, duration, delay)
	target_scale = target_scale or vmath.vector3(1, 1, 1)
	duration = duration or 0.3
	delay = delay or 0
	gui.set_scale(node, vmath.vector3(0, 0, 1))
	gui.animate(node, gui.PROP_SCALE, target_scale, gui.EASING_OUTBACK, duration, delay)
end

function M.fade_in(node, delay)
	gui.set_alpha(node, 0)
	gui.animate(node, "color.w", 1, gui.EASING_OUTQUAD, 0.2, delay or 0)
end

function M.destroy_nodes(nodes_table)
	for _, n in ipairs(nodes_table) do
		M.safe_delete(n)
	end
end

return M
