import { useState, useEffect } from 'react'
import { loadAllData, seedSampleData } from './db/helpers.js'
import { formatCounts } from './domain/utils.js'
import './App.css'

function App() {
  const [data, setData] = useState({ races: [], plannedWorkouts: [], workoutLogs: [] })

  useEffect(() => {
    loadAllData().then(setData)
  }, [])

  const handleSeed = async () => {
    const updated = await seedSampleData()
    setData(updated)
  }

  return (
    <div className="app">
      <h1>Training Planner</h1>
      <p className="status">{formatCounts(data)}</p>
      <button onClick={handleSeed}>Seed sample data</button>
      <div className="debug">
        <span>Races: {data.races.length}</span>
        <span>Planned: {data.plannedWorkouts.length}</span>
        <span>Logs: {data.workoutLogs.length}</span>
      </div>
    </div>
  )
}

export default App
