'use client'

import { useEffect, useMemo, useState } from "react"
import axios from "axios"
import { Layout } from "@/components/layout"
import { KPICard } from "@/components/kpi-card"
import { DataTable } from "@/components/data-table"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Fuel, TrendingUp, Plus, Edit2, Trash2 } from "lucide-react"

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
  { key: "id", header: "Log ID" },
  { key: "trip_id", header: "Trip" },
  { key: "vehicle_number", header: "Vehicle" },
  { key: "liters", header: "Liters", render: (value) => `${Number(value || 0).toFixed(2)} L` },
  { key: "fuel_cost", header: "Cost / Liter", render: (value) => `$${Number(value || 0).toFixed(2)}` },
  { key: "total_cost", header: "Total Cost", render: (value) => `$${Number(value || 0).toFixed(2)}` },
]

const filterOptions = [
  { value: "high", label: "High Cost", filterFn: (row) => (row.total_cost || 0) > 100 },
  { value: "medium", label: "Medium Cost", filterFn: (row) => (row.total_cost || 0) >= 50 && (row.total_cost || 0) <= 100 },
  { value: "low", label: "Low Cost", filterFn: (row) => (row.total_cost || 0) < 50 },
]

const sortOptions = [
  { value: "total_cost", label: "Total Cost", sortFn: (a, b) => (a.total_cost || 0) - (b.total_cost || 0) },
  { value: "liters", label: "Liters", sortFn: (a, b) => (a.liters || 0) - (b.liters || 0) },
  { value: "trip_id", label: "Trip ID", sortFn: (a, b) => (a.trip_id || 0) - (b.trip_id || 0) },
]

const groupOptions = [
  { value: "vehicle_id", label: "Vehicle", groupFn: (a, b) => String(a.vehicle_number || "").localeCompare(String(b.vehicle_number || "")) },
]

const emptyFuelForm = {
  trip_id: "",
  vehicle_id: "",
  liters: "",
  fuel_cost: "",
}

export default function FuelLogsPage() {
  const [openDialog, setOpenDialog] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [fuelLogs, setFuelLogs] = useState([])
  const [trips, setTrips] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [form, setForm] = useState(emptyFuelForm)
  const [toast, setToast] = useState({ open: false, message: "", type: "success" })

  const showToast = (message, type = "success") => {
    if (!message) return
    setToast({ open: true, message, type })
    setTimeout(() => setToast((current) => ({ ...current, open: false })), 3000)
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

  const fetchTrips = async () => {
    const accessToken = localStorage.getItem("access_token")
    try {
      const { data } = await axios.get("http://localhost:8000/api/trips/all",
        accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined
      )
      setTrips(data?.data || [])
    } catch (error) {
      console.error("Failed to load trips")
    }
  }

  const fetchVehicles = async () => {
    const accessToken = localStorage.getItem("access_token")
    try {
      const { data } = await axios.get("http://localhost:8000/api/vehicles/all",
        accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined
      )
      setVehicles(data?.data || [])
    } catch (error) {
      console.error("Failed to load vehicles")
    }
  }

  useEffect(() => {
    fetchFuelLogs()
    fetchTrips()
    fetchVehicles()
  }, [])

  const mappedFuelLogs = useMemo(() => {
    return fuelLogs.map(f => {
      const vehicle = vehicles.find(v => v.id === f.vehicle_id)
      const trip = trips.find(t => t.id === f.trip_id)
      return {
        ...f,
        vehicle_number: vehicle?.vehicle_number || f.vehicle_id,
        trip_display: trip ? `${trip.id} - ${trip.origin_city} → ${trip.destination_city}` : f.trip_id
      }
    })
  }, [fuelLogs, vehicles, trips])

  const kpis = useMemo(() => {
    const totalCost = fuelLogs.reduce((sum, f) => sum + (Number(f.total_cost) || 0), 0)
    const totalLiters = fuelLogs.reduce((sum, f) => sum + (Number(f.liters) || 0), 0)
    const avgPerLog = fuelLogs.length ? Math.round(totalCost / fuelLogs.length) : 0
    
    return {
      totalCost: `$${totalCost.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`,
      totalLiters: `${totalLiters.toLocaleString(undefined, {minimumFractionDigits: 1, maximumFractionDigits: 1})} L`,
      avgPerLog: `$${avgPerLog.toLocaleString()}`,
      logCount: fuelLogs.length,
    }
  }, [fuelLogs])

  const handleCreate = async () => {
    const accessToken = localStorage.getItem("access_token")
    try {
      const { data } = await axios.post(
        "http://localhost:8000/api/fuel-logs/create",
        {
          trip_id: Number(form.trip_id),
          vehicle_id: Number(form.vehicle_id),
          liters: Number(form.liters),
          fuel_cost: Number(form.fuel_cost),
          date: new Date().toISOString(),
        },
        accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined
      )
      if (data?.success === false) {
        showToast(getMessageFromResponse(data) || "Fuel log creation failed.", "error")
        return
      }
      setOpenDialog(false)
      setForm(emptyFuelForm)
      fetchFuelLogs()
      showToast(getMessageFromResponse(data) || "Fuel log created.", "success")
    } catch (error) {
      const message = getMessageFromResponse(error?.response?.data) || "Fuel log creation failed."
      showToast(message, "error")
    }
  }

  const handleUpdate = async () => {
    const accessToken = localStorage.getItem("access_token")
    try {
      const { data } = await axios.put(
        `http://localhost:8000/api/fuel-logs/${editingId}`,
        {
          trip_id: Number(form.trip_id),
          vehicle_id: Number(form.vehicle_id),
          liters: Number(form.liters),
          fuel_cost: Number(form.fuel_cost),
        },
        accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined
      )
      if (data?.success === false) {
        showToast(getMessageFromResponse(data) || "Update failed.", "error")
        return
      }
      setOpenDialog(false)
      setEditingId(null)
      setForm(emptyFuelForm)
      fetchFuelLogs()
      showToast(getMessageFromResponse(data) || "Fuel log updated.", "success")
    } catch (error) {
      const message = getMessageFromResponse(error?.response?.data) || "Update failed."
      showToast(message, "error")
    }
  }

  const handleEdit = (row) => {
    setEditingId(row.id)
    setForm({
      trip_id: row.trip_id,
      vehicle_id: row.vehicle_id,
      liters: row.liters,
      fuel_cost: row.fuel_cost,
    })
    setOpenDialog(true)
  }

  const handleDelete = (row) => {
    if (confirm(`Delete fuel log #${row.id}?`)) {
      deleteLog(row.id)
    }
  }

  const deleteLog = async (id) => {
    const accessToken = localStorage.getItem("access_token")
    try {
      const { data } = await axios.delete(
        `http://localhost:8000/api/fuel-logs/${id}`,
        accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined
      )
      if (data?.success === false) {
        showToast(getMessageFromResponse(data) || "Deletion failed.", "error")
        return
      }
      fetchFuelLogs()
      showToast(getMessageFromResponse(data) || "Fuel log deleted.", "success")
    } catch (error) {
      const message = getMessageFromResponse(error?.response?.data) || "Deletion failed."
      showToast(message, "error")
    }
  }

  return (
    <Layout title="Fuel Logs">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <KPICard title="Total Cost" value={kpis.totalCost} icon={Fuel} />
          <KPICard title="Total Liters" value={kpis.totalLiters} icon={Fuel} />
          <KPICard title="Avg / Log" value={kpis.avgPerLog} icon={TrendingUp} />
          <KPICard title="Total Logs" value={kpis.logCount} />
        </div>

        <div className="flex items-center gap-4 mb-2">
          <Button 
            onClick={() => {
              setEditingId(null)
              setForm(emptyFuelForm)
              setOpenDialog(true)
            }}
            className="bg-[#D94002] hover:bg-[#C03902] text-white gap-2 shadow-lg hover:shadow-xl transition-all"
          >
            <Plus className="h-4 w-4" />
            Add Fuel Log
          </Button>
        </div>

        <DataTable 
          columns={columns}
          data={mappedFuelLogs}
          filterOptions={filterOptions}
          sortOptions={sortOptions}
          groupOptions={groupOptions}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />

        {/* Create/Edit Dialog */}
        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogContent onClose={() => setOpenDialog(false)} className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl">
                {editingId ? "Edit Fuel Log" : "Create Fuel Log"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-6">
              <div className="space-y-2">
                <Label>Trip</Label>
                <select
                  value={form.trip_id}
                  onChange={(e) => setForm({...form, trip_id: e.target.value})}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select a trip</option>
                  {trips.map((t) => (
                    <option key={t.id} value={t.id}>
                      Trip {t.id} - {t.origin_city} → {t.destination_city} [{t.status}]
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Vehicle</Label>
                <select
                  value={form.vehicle_id}
                  onChange={(e) => setForm({...form, vehicle_id: e.target.value})}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select a vehicle</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>{v.vehicle_number}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Liters</Label>
                <Input
                  type="number"
                  value={form.liters}
                  onChange={(e) => setForm({...form, liters: e.target.value})}
                  placeholder="10.5"
                  step="0.1"
                />
              </div>
              <div className="space-y-2">
                <Label>Cost per Liter ($)</Label>
                <Input
                  type="number"
                  value={form.fuel_cost}
                  onChange={(e) => setForm({...form, fuel_cost: e.target.value})}
                  placeholder="3.50"
                  step="0.01"
                />
              </div>
              <Button
                onClick={editingId ? handleUpdate : handleCreate}
                className="w-full bg-[#D94002] hover:bg-[#C03902] text-white font-semibold py-5 mt-6 shadow-lg hover:shadow-xl transition-all"
              >
                {editingId ? "Update Fuel Log" : "Add Fuel Log"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

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
