local M = {}

-- Default Elo for a new player
M.DEFAULT_ELO = 1000

-- K-factor controls update speed
M.K_INITIAL = 80
M.K_STEADY = 16
M.K_DECAY = 0.05

-- Target success rate (ZPD sweet spot)
M.TARGET_SUCCESS_RATE = 0.70

-- Cross-session decay
M.DAILY_DECAY_RATE = 0.95
M.MAX_DECAY_DAYS = 30

-- Age-based starting Elo priors
M.AGE_PRIORS = {
	[6]  = 600,
	[7]  = 700,
	[8]  = 800,
	[9]  = 900,
	[10] = 1000,
	[11] = 1100,
	[12] = 1200,
}

--- Calculate expected probability of correct answer.
--- @param player_elo number
--- @param question_elo number
--- @return number probability 0-1
function M.expected(player_elo, question_elo)
	return 1 / (1 + 10 ^( (question_elo - player_elo) / 400))
end

--- Calculate K-factor based on number of attempts (decreases with experience).
--- @param attempts number
--- @return number k
function M.k_factor(attempts)
	return M.K_INITIAL / (1 + M.K_DECAY * attempts)
end

--- Update player Elo after an answer.
--- @param player_elo number Current player Elo
--- @param question_elo number Difficulty of the question
--- @param correct boolean Whether the answer was correct
--- @param time_taken number|nil Seconds taken (optional, modifies K)
--- @param attempts number Total attempts for this skill
--- @return number new_elo, number elo_change
function M.update(player_elo, question_elo, correct, time_taken, attempts)
	local expected = M.expected(player_elo, question_elo)
	local outcome = correct and 1 or 0
	local k = M.k_factor(attempts or 0)

	-- Time modifier: fast + correct = stronger signal, slow + correct = weaker
	if time_taken then
		if correct and time_taken < 10 then
			k = k * 1.2
		elseif correct and time_taken > 30 then
			k = k * 0.8
		elseif not correct and time_taken < 5 then
			-- Very fast wrong answer = probably guessing, smaller penalty
			k = k * 0.7
		end
	end

	local change = k * (outcome - expected)
	local new_elo = player_elo + change

	-- Clamp to reasonable range
	new_elo = math.max(200, math.min(2000, new_elo))

	return new_elo, change
end

--- Select a target question Elo that gives ~70% success rate.
--- @param player_elo number
--- @return number target_elo
function M.select_difficulty(player_elo)
	-- Solve for question_elo where expected = TARGET_SUCCESS_RATE
	-- 0.70 = 1 / (1 + 10^((q - p) / 400))
	-- 10^((q - p)/400) = 1/0.70 - 1 = 0.4286
	-- (q - p)/400 = log10(0.4286) = -0.368
	-- q - p = -147.2
	local offset = 400 * math.log((1 / M.TARGET_SUCCESS_RATE) - 1, 10)
	return math.floor(player_elo + offset)
end

--- Apply cross-session decay to bring Elo back toward baseline.
--- @param player_elo number
--- @param days_since_last number Days since last play
--- @return number decayed_elo
function M.apply_session_decay(player_elo, days_since_last)
	if days_since_last <= 0 then return player_elo end
	days_since_last = math.min(days_since_last, M.MAX_DECAY_DAYS)

	local decay = M.DAILY_DECAY_RATE ^ days_since_last
	local baseline = M.DEFAULT_ELO
	return math.floor(baseline + (player_elo - baseline) * decay)
end

--- Get initial Elo for a given age.
--- @param age number
--- @return number elo
function M.cold_start(age)
	age = math.max(6, math.min(12, age or 10))
	return M.AGE_PRIORS[age] or M.DEFAULT_ELO
end

--- Get initial Elo for a new skill based on a known skill's Elo.
--- New skills start 200 points below the known skill.
--- @param known_elo number
--- @return number
function M.transfer_prior(known_elo)
	return math.max(400, known_elo - 200)
end

return M
