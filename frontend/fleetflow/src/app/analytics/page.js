'use client'

import { useEffect, useMemo, useState } from "react"
import axios from "axios"
import { Layout } from "@/components/layout"
import { KPICard } from "@/components/kpi-card"
import { DataTable } from "@/components/data-table"
import { Activity, DollarSign, TrendingDown, TrendingUp } from "lucide-react"
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

const columns = [
  { key: "vehicle_number", header: "Vehicle" },
  { key: "totalTrips", header: "Trips", render: (value) => value || 0 },
  { key: "totalDistance", header: "Distance", render: (value) => `${(value || 0).toLocaleString()} km` },
  { key: "totalCost", header: "Total Cost", render: (value) => `$${(value || 0).toFixed(2)}` },
]

const getMessageFromResponse = (data) => {
  if (!data) return ""
  if (typeof data.message === "string") return data.message
  if (typeof data.detail === "string") return data.detail
  if (Array.isArray(data.detail)) {
    const messages = data.detail.map((item) => (typeof item?.msg === "string" ? item.msg : null)).filter(Boolean)
    return messages.join(", ")
  }
  return ""
}

const filterOptions = [
  { value: "active", label: "Active Vehicles", filterFn: (row) => (row.totalTrips || 0) > 0 },
  { value: "idle", label: "Idle Vehicles", filterFn: (row) => (row.totalTrips || 0) === 0 },
]

const sortOptions = [
  { value: "totalCost", label: "Total Cost", sortFn: (a, b) => (b.totalCost || 0) - (a.totalCost || 0) },
  { value: "totalDistance", label: "Distance", sortFn: (a, b) => (b.totalDistance || 0) - (a.totalDistance || 0) },
]

const groupOptions = [
  { value: "vehicle_number", label: "Vehicle", groupFn: (a, b) => String(a.vehicle_number || "").localeCompare(String(b.vehicle_number || "")) },
]

export default function AnalyticsPage() {
  const [vehicles, setVehicles] = useState([])
  const [trips, setTrips] = useState([])
  const [expenseLogs, setExpenseLogs] = useState([])
  const [fuelLogs, setFuelLogs] = useState([])
  const [maintenanceLogs, setMaintenanceLogs] = useState([])
  const [toast, setToast] = useState({ open: false, message: "", type: "success" })

  const showToast = (message, type = "success") => {
    if (!message) return
    setToast({ open: true, message, type })
    setTimeout(() => setToast((current) => ({ ...current, open: false })), 3000)
  }

  const fetchVehicles = async () => {
    const accessToken = localStorage.getItem("access_token")
    try {
      const { data } = await axios.get("http://localhost:8000/api/vehicles/all",
        accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined
      )
      if (data?.success === false) {
        showToast(getMessageFromResponse(data) || "Failed to load vehicles.", "error")
        return
      }
      setVehicles(data?.data || [])
      showToast(getMessageFromResponse(data) || "Vehicles loaded.", "success")
    } catch (error) {
      const message = getMessageFromResponse(error?.response?.data) || "Failed to load vehicles."
      showToast(message, "error")
    }
  }

  const fetchTrips = async () => {
    const accessToken = localStorage.getItem("access_token")
    try {
      const { data } = await axios.get("http://localhost:8000/api/trips/all",
        accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined
      )
      if (data?.success === false) {
        showToast(getMessageFromResponse(data) || "Failed to load trips.", "error")
        return
      }
      setTrips(data?.data || [])
      showToast(getMessageFromResponse(data) || "Trips loaded.", "success")
    } catch (error) {
      const message = getMessageFromResponse(error?.response?.data) || "Failed to load trips."
      showToast(message, "error")
    }
  }

  const fetchExpenseLogs = async () => {
    const accessToken = localStorage.getItem("access_token")
    try {
      const { data } = await axios.get("http://localhost:8000/api/expense-logs/all",
        accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined
      )
      if (data?.success === false) {
        showToast(getMessageFromResponse(data) || "Failed to load expense logs.", "error")
        return
      }
      setExpenseLogs(data?.data || [])
      showToast(getMessageFromResponse(data) || "Expense logs loaded.", "success")
    } catch (error) {
      const message = getMessageFromResponse(error?.response?.data) || "Failed to load expense logs."
      showToast(message, "error")
    }
  }

  const fetchFuelLogs = async () => {
    const accessToken = localStorage.getItem("access_token")
    try {
      const { data } = await axios.get("http://localhost:8000/api/fuel-logs/all",
        accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined
      )
      if (data?.success === false) {
        showToast(getMessageFromResponse(data) || "Failed to load fuel logs.", "error")
        return
      }
      setFuelLogs(data?.data || [])
      showToast(getMessageFromResponse(data) || "Fuel logs loaded.", "success")
    } catch (error) {
      const message = getMessageFromResponse(error?.response?.data) || "Failed to load fuel logs."
      showToast(message, "error")
    }
  }

  const fetchMaintenanceLogs = async () => {
    const accessToken = localStorage.getItem("access_token")
    try {
      const { data } = await axios.get("http://localhost:8000/api/maintenance/all",
        accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined
      )
      if (data?.success === false) {
        showToast(getMessageFromResponse(data) || "Failed to load maintenance logs.", "error")
        return
      }
      setMaintenanceLogs(data?.data || [])
      showToast(getMessageFromResponse(data) || "Maintenance logs loaded.", "success")
    } catch (error) {
      const message = getMessageFromResponse(error?.response?.data) || "Failed to load maintenance logs."
      showToast(message, "error")
    }
  }

  useEffect(() => {
    fetchVehicles()
    fetchTrips()
    fetchExpenseLogs()
    fetchFuelLogs()
    fetchMaintenanceLogs()
  }, [])

  const analyticsData = useMemo(() => {
    const data = vehicles.map((vehicle) => {
      const vehicleTrips = trips.filter((t) => t.vehicle_id === vehicle.id)
      const vehicleExpenses = expenseLogs.filter((e) => e.vehicle_id === vehicle.id)
      const vehicleFuelLogs = fuelLogs.filter((f) => f.vehicle_id === vehicle.id)
      
      const totalDistance = vehicleTrips.reduce((sum, t) => sum + (Number(t.total_distance) || 0), 0)
      const fuelCost = vehicleFuelLogs.reduce((sum, f) => sum + (Number(f.total_cost) || 0), 0)
      const expenseCost = vehicleExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
      const totalCost = fuelCost + expenseCost + (Number(vehicle.acquisition_cost) || 0)
      
      return {
        vehicle_id: vehicle.id,
        vehicle_number: vehicle.vehicle_number,
        totalTrips: vehicleTrips.length,
        totalDistance,
        totalCost,
      }
    })
    return data
  }, [vehicles, trips, expenseLogs, fuelLogs])

  const kpis = useMemo(() => {
    const totalTrips = trips.length
    const completedTrips = trips.filter(t => t.status === "COMPLETED").length
    const totalDistance = trips.reduce((sum, t) => sum + (Number(t.total_distance) || 0), 0)
    
    const totalCost = expenseLogs.reduce((sum, e) => sum + (Number(e.amount) || 0), 0) + 
                      fuelLogs.reduce((sum, f) => sum + (Number(f.total_cost) || 0), 0) +
                      maintenanceLogs.reduce((sum, m) => sum + (Number(m.cost) || 0), 0)
    
    const avgCostPerTrip = totalTrips ? Math.round(totalCost / totalTrips) : 0
    const utilization = vehicles.length ? ((trips.filter(t => t.status === "DISPATCHED" || t.status === "COMPLETED").length / vehicles.length) * 100).toFixed(1) : 0
    
    return {
      utilization: `${utilization}%`,
      revenue: `$${(totalTrips * 100).toLocaleString()}`, // Estimated based on trips
      cost: `$${totalCost.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`,
      profit: `$${Math.max(0, (totalTrips * 100) - totalCost).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`,
    }
  }, [trips, expenseLogs, fuelLogs, maintenanceLogs, vehicles])

  const handleEdit = (row) => {
    console.log("Editing:", row)
  }

  const handleDelete = (row) => {
    console.log("Deleting:", row)
  }

  const vehicleCostData = useMemo(() => {
    return analyticsData.map(v => ({
      vehicle: v.vehicle_number,
      cost: Math.round(v.totalCost),
      trips: v.totalTrips,
      distance: Math.round(v.totalDistance),
    }))
  }, [analyticsData])

  const tripStatusData = useMemo(() => {
    const statusBreakdown = {
      DRAFT: trips.filter(t => t.status === "DRAFT").length,
      DISPATCHED: trips.filter(t => t.status === "DISPATCHED").length,
      COMPLETED: trips.filter(t => t.status === "COMPLETED").length,
      CANCELLED: trips.filter(t => t.status === "CANCELLED").length,
    }
    return [
      { status: "Draft", count: statusBreakdown.DRAFT },
      { status: "Dispatched", count: statusBreakdown.DISPATCHED },
      { status: "Completed", count: statusBreakdown.COMPLETED },
      { status: "Cancelled", count: statusBreakdown.CANCELLED },
    ]
  }, [trips])

  return (
    <Layout title="Analytics / KPI">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <KPICard title="Utilization %" value={kpis.utilization} icon={Activity} />
          <KPICard title="Revenue" value={kpis.revenue} icon={TrendingUp} />
          <KPICard title="Cost" value={kpis.cost} icon={TrendingDown} />
          <KPICard title="Profit" value={kpis.profit} icon={DollarSign} />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Vehicle Cost Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={vehicleCostData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="vehicle" />
                <YAxis />
                <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                <Legend />
                <Bar dataKey="cost" fill="#D94002" name="Total Cost" />
                <Bar dataKey="distance" fill="#10b981" name="Distance (km)" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Trip Status Breakdown</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={tripStatusData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="status" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#3b82f6" name="Number of Trips" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <DataTable 
          columns={columns}
          data={analyticsData}
          filterOptions={filterOptions}
          sortOptions={sortOptions}
          groupOptions={groupOptions}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />

        {toast.open ? (
          <div
            className={`fixed bottom-6 left-1/2 z-50 w-[90%] max-w-sm -translate-x-1/2 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg ${
              toast.type === "error" ? "bg-red-600" : "bg-green-600"
            }`}
            role="status"
          >
            {toast.message}
          </div>
        ) : null}
      </div>
    </Layout>
  )
}
