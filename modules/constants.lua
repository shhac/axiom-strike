local M = {}

-- Hero
M.HERO_MAX_HP = 100
M.HERO_START_HP = 100

-- Enemy defaults
M.ENEMY_BASE_HP = 30
M.ENEMY_BASE_ATTACK = 10

-- Damage
M.BASE_DAMAGE = 15
M.MIN_DAMAGE = 1
M.EXACT_MATCH_MULTIPLIER = 2.0
M.DAMAGE_FALLOFF_PER_POINT = 0.5

-- Tiles
M.NUM_NUMBER_TILES = 6
M.NUM_OPERATOR_TILES = 3
M.MAX_OPERAND_PHASE1 = 20

-- Operations
M.OP_ADD = "+"
M.OP_SUB = "-"
M.OP_MUL = "x"
M.OP_DIV = "/"

-- Battle phases
M.PHASE_PLAYER_ATTACK = "player_attack"
M.PHASE_ANIMATE_ATTACK = "animate_attack"
M.PHASE_ENEMY_ATTACK = "enemy_attack"
M.PHASE_PLAYER_DEFEND = "player_defend"
M.PHASE_ANIMATE_DEFEND = "animate_defend"
M.PHASE_WAVE_COMPLETE = "wave_complete"
M.PHASE_BATTLE_WON = "battle_won"
M.PHASE_BATTLE_LOST = "battle_lost"

-- Timing
M.ANIMATION_DURATION = 0.8
M.BETWEEN_WAVE_DELAY = 1.5

-- Colors (as hex for gui node tinting)
M.COLOR_NUMBER_TILE = vmath.vector4(0.13, 0.27, 0.40, 1)     -- #224466
M.COLOR_OPERATOR_TILE = vmath.vector4(0.27, 0.20, 0.13, 1)   -- #443322
M.COLOR_TILE_USED = vmath.vector4(0.10, 0.10, 0.17, 1)       -- #1a1a2a
M.COLOR_TILE_BORDER_NUM = vmath.vector4(0.20, 0.53, 0.80, 1) -- #3388cc
M.COLOR_TILE_BORDER_OP = vmath.vector4(0.80, 0.53, 0.20, 1)  -- #cc8833
M.COLOR_HP_HERO = vmath.vector4(0.27, 0.80, 0.40, 1)         -- #44cc66
M.COLOR_HP_ENEMY = vmath.vector4(1.0, 0.40, 0.27, 1)         -- #ff6644
M.COLOR_WEAKNESS = vmath.vector4(1.0, 0.27, 0.27, 1)         -- #ff4444
M.COLOR_EXACT_MATCH = vmath.vector4(0.27, 0.80, 0.40, 1)     -- #44cc66
M.COLOR_CLOSE = vmath.vector4(1.0, 0.87, 0.27, 1)            -- #ffdd44
M.COLOR_FAR = vmath.vector4(1.0, 0.40, 0.27, 1)              -- #ff6644

return M
