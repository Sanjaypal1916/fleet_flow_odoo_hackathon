'use client'

import { useEffect, useMemo, useState } from "react"
import axios from "axios"
import { Layout } from "@/components/layout"
import { KPICard } from "@/components/kpi-card"
import { DataTable } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { Truck, TrendingUp, MapPin, Wrench } from "lucide-react"

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

const columns = [
  { key: "vehicle_number", header: "Vehicle ID" },
  { key: "vehicle_type", header: "Type" },
  { key: "model", header: "Model" },
  {
    key: "status",
    header: "Status",
    render: (value) => {
      const colorClass = value === "AVAILABLE" ? "bg-green-600 hover:bg-green-700" : 
                        value === "ON_TRIP" ? "bg-blue-600 hover:bg-blue-700" : "bg-red-600 hover:bg-red-700"
      return <Badge className={colorClass}>{value}</Badge>
    }
  },
  { key: "odometer", header: "Odometer", render: (value) => `${Number(value || 0).toLocaleString()} km` },
]

const filterOptions = [
  { value: "available", label: "Available", filterFn: (row) => row.status === "AVAILABLE" },
  { value: "on_trip", label: "On Trip", filterFn: (row) => row.status === "ON_TRIP" },
  { value: "maintenance", label: "Maintenance", filterFn: (row) => row.status === "IN_SHOP" },
]

const sortOptions = [
  { value: "vehicle_number", label: "Vehicle ID", sortFn: (a, b) => String(a.vehicle_number).localeCompare(String(b.vehicle_number)) },
  { value: "odometer", label: "Odometer", sortFn: (a, b) => Number(a.odometer) - Number(b.odometer) },
]

const groupOptions = [
  { value: "vehicle_type", label: "Type", groupFn: (a, b) => String(a.vehicle_type).localeCompare(String(b.vehicle_type)) },
  { value: "status", label: "Status", groupFn: (a, b) => String(a.status).localeCompare(String(b.status)) },
]

export default function DashboardPage() {
  const [vehicles, setVehicles] = useState([])
  const [trips, setTrips] = useState([])
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

  useEffect(() => {
    fetchVehicles()
    fetchTrips()
  }, [])

  const kpis = useMemo(() => ({
    totalVehicles: vehicles.length,
    activeVehicles: vehicles.filter(v => v.status === "AVAILABLE").length,
    tripsRunning: trips.filter(t => t.status === "DISPATCHED").length,
    maintenanceDue: vehicles.filter(v => v.status === "IN_SHOP").length,
  }), [vehicles, trips])

  const handleEdit = (row) => {
    console.log("Editing:", row)
  }

  const handleDelete = (row) => {
    console.log("Deleting:", row)
  }

  return (
    <Layout title="Fleet Overview">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <KPICard title="Total Vehicles" value={kpis.totalVehicles} icon={Truck} />
          <KPICard title="Available Vehicles" value={kpis.activeVehicles} icon={TrendingUp} />
          <KPICard title="Trips Running" value={kpis.tripsRunning} icon={MapPin} />
          <KPICard title="In Maintenance" value={kpis.maintenanceDue} icon={Wrench} />
        </div>

        <DataTable 
          columns={columns}
          data={vehicles}
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
