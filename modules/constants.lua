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

-- Elo correctness thresholds (distance from target to count as "correct" for Elo)
M.ELO_ATTACK_THRESHOLD = 3
M.ELO_DEFEND_THRESHOLD = 2

-- Timing
M.ANIMATION_DURATION = 0.8

return M
