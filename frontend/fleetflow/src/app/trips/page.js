'use client'

import { useEffect, useMemo, useState } from "react"
import axios from "axios"
import { Layout } from "@/components/layout"
import { KPICard } from "@/components/kpi-card"
import { DataTable } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Route, TrendingUp, CheckCircle, DollarSign, Plus } from "lucide-react"

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
  { key: "id", header: "Trip ID" },
  { key: "vehicle_number", header: "Vehicle" },
  { key: "driver_name", header: "Driver" },
  { key: "origin_city", header: "Origin" },
  { key: "destination_city", header: "Destination" },
  { 
    key: "status", 
    header: "Status",
    render: (value) => {
      const colorClass = value === "DISPATCHED" ? "bg-green-600 hover:bg-green-700" : 
                        value === "COMPLETED" ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-600 hover:bg-gray-700"
      return <Badge className={colorClass}>{value}</Badge>
    }
  },
]

const filterOptions = [
  { value: "dispatched", label: "Dispatched", filterFn: (row) => row.status === "DISPATCHED" },
  { value: "completed", label: "Completed", filterFn: (row) => row.status === "COMPLETED" },
  { value: "draft", label: "Draft", filterFn: (row) => row.status === "DRAFT" },
]

const sortOptions = [
  { value: "id", label: "Trip ID", sortFn: (a, b) => a.id - b.id },
  { value: "total_distance", label: "Distance", sortFn: (a, b) => (a.total_distance || 0) - (b.total_distance || 0) },
]

const groupOptions = [
  { value: "status", label: "Status", groupFn: (a, b) => String(a.status).localeCompare(String(b.status)) },
]

const emptyForm = {
  vehicle_id: "",
  driver_id: "",
  cargo_weight: "",
  origin_city: "",
  destination_city: "",
  status: "DRAFT"
}

export default function TripsPage() {
  const [openDialog, setOpenDialog] = useState(false)
  const [openEditDialog, setOpenEditDialog] = useState(false)
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false)
  const [trips, setTrips] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [drivers, setDrivers] = useState([])
  const [formData, setFormData] = useState(emptyForm)
  const [editForm, setEditForm] = useState(emptyForm)
  const [selectedTrip, setSelectedTrip] = useState(null)
  const [toast, setToast] = useState({ open: false, message: "", type: "success" })

  const showToast = (message, type = "success") => {
    if (!message) return
    setToast({ open: true, message, type })
    setTimeout(() => setToast((current) => ({ ...current, open: false })), 3000)
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

  const fetchDrivers = async () => {
    const accessToken = localStorage.getItem("access_token")
    try {
      const { data } = await axios.get("http://localhost:8000/api/drivers/all",
        accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined
      )
      setDrivers(data?.data || [])
    } catch (error) {
      console.error("Failed to load drivers")
    }
  }

  useEffect(() => {
    fetchTrips()
    fetchVehicles()
    fetchDrivers()
  }, [])

  const kpis = useMemo(() => {
    const dispatched = trips.filter(t => t.status === "DISPATCHED").length
    const completed = trips.filter(t => t.status === "COMPLETED").length
    const totalDistance = trips.reduce((sum, t) => sum + (Number(t.total_distance) || 0), 0)
    
    return {
      totalTrips: trips.length,
      activeTrips: dispatched,
      completed,
      totalDistance: `${totalDistance.toLocaleString()} km`,
    }
  }, [trips])

  const tripsWithNames = useMemo(() => {
    return trips.map(trip => {
      const vehicle = vehicles.find(v => v.id === trip.vehicle_id)
      const driver = drivers.find(d => d.id === trip.driver_id)
      return {
        ...trip,
        vehicle_number: vehicle?.vehicle_number || trip.vehicle_id,
        driver_name: driver?.name || trip.driver_id,
      }
    })
  }, [trips, vehicles, drivers])

  const handleCreate = async () => {
    const accessToken = localStorage.getItem("access_token")
    try {
      const { data } = await axios.post(
        "http://localhost:8000/api/trips/create",
        {
          vehicle_id: Number(formData.vehicle_id),
          driver_id: Number(formData.driver_id),
          cargo_weight: Number(formData.cargo_weight),
          origin_city: formData.origin_city,
          destination_city: formData.destination_city,
          status: formData.status,
        },
        accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined
      )
      if (data?.success === false) {
        showToast(getMessageFromResponse(data) || "Trip creation failed.", "error")
        return
      }
      setOpenDialog(false)
      setFormData(emptyForm)
      fetchTrips()
      showToast(getMessageFromResponse(data) || "Trip created.", "success")
    } catch (error) {
      const message = getMessageFromResponse(error?.response?.data) || "Trip creation failed."
      showToast(message, "error")
    }
  }

  const handleEdit = (row) => {
    setSelectedTrip(row)
    setEditForm({
      vehicle_id: row.vehicle_id || "",
      driver_id: row.driver_id || "",
      cargo_weight: row.cargo_weight || "",
      origin_city: row.origin_city || "",
      destination_city: row.destination_city || "",
      status: row.status || "DRAFT"
    })
    setOpenEditDialog(true)
  }

  const handleUpdate = async () => {
    if (!selectedTrip?.id) return

    const accessToken = localStorage.getItem("access_token")
    try {
      const { data } = await axios.put(
        `http://localhost:8000/api/trips/${selectedTrip.id}`,
        {
          vehicle_id: Number(editForm.vehicle_id),
          driver_id: Number(editForm.driver_id),
          cargo_weight: Number(editForm.cargo_weight),
          origin_city: editForm.origin_city,
          destination_city: editForm.destination_city,
          status: editForm.status,
        },
        accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined
      )
      if (data?.success === false) {
        showToast(getMessageFromResponse(data) || "Trip update failed.", "error")
        return
      }
      setOpenEditDialog(false)
      setSelectedTrip(null)
      fetchTrips()
      showToast(getMessageFromResponse(data) || "Trip updated.", "success")
    } catch (error) {
      const message = getMessageFromResponse(error?.response?.data) || "Trip update failed."
      showToast(message, "error")
    }
  }

  const handleDelete = (row) => {
    setSelectedTrip(row)
    setOpenDeleteDialog(true)
  }

  const handleConfirmDelete = async () => {
    if (!selectedTrip?.id) return

    const accessToken = localStorage.getItem("access_token")
    try {
      const { data } = await axios.delete(
        `http://localhost:8000/api/trips/${selectedTrip.id}`,
        accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined
      )
      if (data?.success === false) {
        showToast(getMessageFromResponse(data) || "Trip delete failed.", "error")
        return
      }
      setOpenDeleteDialog(false)
      setSelectedTrip(null)
      fetchTrips()
      showToast(getMessageFromResponse(data) || "Trip deleted.", "success")
    } catch (error) {
      const message = getMessageFromResponse(error?.response?.data) || "Trip delete failed."
      showToast(message, "error")
    }
  }

  return (
    <Layout title="Trip Management">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <KPICard title="Total Trips" value={kpis.totalTrips} icon={Route} />
          <KPICard title="Dispatched" value={kpis.activeTrips} icon={TrendingUp} />
          <KPICard title="Completed" value={kpis.completed} icon={CheckCircle} />
          <KPICard title="Total Distance" value={kpis.totalDistance} icon={DollarSign} />
        </div>

        <div className="flex items-center gap-4 mb-2">
          <Button 
            onClick={() => setOpenDialog(true)}
            className="bg-[#D94002] hover:bg-[#C03902] text-white gap-2 shadow-lg hover:shadow-xl transition-all"
          >
            <Plus className="h-4 w-4" />
            Create Trip
          </Button>
        </div>

        <DataTable 
          columns={columns}
          data={tripsWithNames}
          filterOptions={filterOptions}
          sortOptions={sortOptions}
          groupOptions={groupOptions}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />

        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogContent onClose={() => setOpenDialog(false)} className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl">Create New Trip</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-6">
              <div className="space-y-2">
                <Label>Vehicle</Label>
                <select
                  value={formData.vehicle_id}
                  onChange={(e) => setFormData({...formData, vehicle_id: e.target.value})}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select a vehicle</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>{v.vehicle_number} - {v.model}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Driver</Label>
                <select
                  value={formData.driver_id}
                  onChange={(e) => setFormData({...formData, driver_id: e.target.value})}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select a driver</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>{d.name} - {d.license_number}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Cargo Weight (kg)</Label>
                <Input 
                  type="number"
                  value={formData.cargo_weight}
                  onChange={(e) => setFormData({...formData, cargo_weight: e.target.value})}
                  placeholder="100"
                />
              </div>
              <div className="space-y-2">
                <Label>Origin City</Label>
                <Input 
                  value={formData.origin_city}
                  onChange={(e) => setFormData({...formData, origin_city: e.target.value})}
                  placeholder="New York"
                />
              </div>
              <div className="space-y-2">
                <Label>Destination City</Label>
                <Input 
                  value={formData.destination_city}
                  onChange={(e) => setFormData({...formData, destination_city: e.target.value})}
                  placeholder="Boston"
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <select 
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="DRAFT">DRAFT</option>
                  <option value="DISPATCHED">DISPATCHED</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>
              <Button 
                onClick={handleCreate}
                className="w-full bg-[#D94002] hover:bg-[#C03902] text-white font-semibold py-5 mt-6 shadow-lg hover:shadow-xl transition-all"
              >
                Create Trip
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={openEditDialog} onOpenChange={setOpenEditDialog}>
          <DialogContent onClose={() => setOpenEditDialog(false)} className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl">Edit Trip</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-6">
              <div className="space-y-2">
                <Label>Vehicle</Label>
                <select
                  value={editForm.vehicle_id}
                  onChange={(e) => setEditForm({...editForm, vehicle_id: e.target.value})}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select a vehicle</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>{v.vehicle_number} - {v.model}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Driver</Label>
                <select
                  value={editForm.driver_id}
                  onChange={(e) => setEditForm({...editForm, driver_id: e.target.value})}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select a driver</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>{d.name} - {d.license_number}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Cargo Weight (kg)</Label>
                <Input 
                  type="number"
                  value={editForm.cargo_weight}
                  onChange={(e) => setEditForm({...editForm, cargo_weight: e.target.value})}
                  placeholder="100"
                />
              </div>
              <div className="space-y-2">
                <Label>Origin City</Label>
                <Input 
                  value={editForm.origin_city}
                  onChange={(e) => setEditForm({...editForm, origin_city: e.target.value})}
                  placeholder="New York"
                />
              </div>
              <div className="space-y-2">
                <Label>Destination City</Label>
                <Input 
                  value={editForm.destination_city}
                  onChange={(e) => setEditForm({...editForm, destination_city: e.target.value})}
                  placeholder="Boston"
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <select 
                  value={editForm.status}
                  onChange={(e) => setEditForm({...editForm, status: e.target.value})}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="DRAFT">DRAFT</option>
                  <option value="DISPATCHED">DISPATCHED</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>
              <Button 
                onClick={handleUpdate}
                className="w-full bg-[#D94002] hover:bg-[#C03902] text-white font-semibold py-5 mt-6 shadow-lg hover:shadow-xl transition-all"
              >
                Update Trip
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={openDeleteDialog} onOpenChange={setOpenDeleteDialog}>
          <DialogContent onClose={() => setOpenDeleteDialog(false)} className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl">Delete Trip</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Are you sure you want to delete trip {selectedTrip?.id}?
              </p>
              <div className="flex gap-3">
                <Button
                  type="button"
                  onClick={() => setOpenDeleteDialog(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                >
                  Delete
                </Button>
              </div>
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
