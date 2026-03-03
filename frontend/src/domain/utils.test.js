import { describe, it, expect } from 'vitest'
import { formatCounts, hasData } from './utils.js'

describe('formatCounts', () => {
  it('formats zero counts', () => {
    expect(formatCounts({ races: [], plannedWorkouts: [], workoutLogs: [] }))
      .toBe('Races: 0 | Planned: 0 | Logs: 0')
  })
  it('formats non-zero counts', () => {
    expect(formatCounts({ races: [1], plannedWorkouts: [1, 2], workoutLogs: [1] }))
      .toBe('Races: 1 | Planned: 2 | Logs: 1')
  })
})

describe('hasData', () => {
  it('returns false when all empty', () => {
    expect(hasData({ races: [], plannedWorkouts: [], workoutLogs: [] })).toBe(false)
  })
  it('returns true when races has data', () => {
    expect(hasData({ races: [1], plannedWorkouts: [], workoutLogs: [] })).toBe(true)
  })
})
