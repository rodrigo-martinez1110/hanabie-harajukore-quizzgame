const PODIUM_CLASSES = {
  1: 'leaderboard-entry leaderboard-entry--podium leaderboard-entry--first',
  2: 'leaderboard-entry leaderboard-entry--podium leaderboard-entry--second',
  3: 'leaderboard-entry leaderboard-entry--podium leaderboard-entry--third'
};

const PODIUM_LABELS = {
  1: 'Fever Crown',
  2: 'Harajuku Star',
  3: 'Mosh Hero'
};

export function getLeaderboardEntryClasses(position) {
  return PODIUM_CLASSES[position] || 'leaderboard-entry';
}

export function getLeaderboardPositionLabel(position) {
  return PODIUM_LABELS[position] || `#${position}`;
}
