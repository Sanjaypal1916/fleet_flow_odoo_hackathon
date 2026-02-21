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
import { Truck, CheckCircle, XCircle, Gauge, Plus } from "lucide-react"

const getStatusClass = (status) => {
  if (status === "AVAILABLE") {
    return "bg-green-600 hover:bg-green-700"
  }
  if (status === "MAINTENANCE") {
    return "bg-yellow-600 hover:bg-yellow-700"
  }
  return "bg-red-600 hover:bg-red-700"
}

const getMessageFromResponse = (data) => {
  if (!data) {
    return ""
  }

  if (typeof data.message === "string") {
    return data.message
  }

  if (typeof data.detail === "string") {
    return data.detail
  }

  if (Array.isArray(data.detail)) {
    const messages = data.detail
      .map((item) => (typeof item?.msg === "string" ? item.msg : null))
      .filter(Boolean)
    return messages.join(", ")
  }

  return ""
}

const columns = [
  { key: "vehicle_number", header: "Vehicle No." },
  { key: "vehicle_type", header: "Type" },
  { key: "model", header: "Model" },
  {
    key: "max_load_capacity",
    header: "Max Load",
    render: (value) => `${Number(value || 0).toLocaleString()} kg`
  },
  {
    key: "odometer",
    header: "Odometer",
    render: (value) => `${Number(value || 0).toLocaleString()} km`
  },
  {
    key: "status",
    header: "Status",
    render: (value) => (
      <Badge className={getStatusClass(value)}>
        {value}
      </Badge>
    )
  },
  {
    key: "acquisition_cost",
    header: "Acq. Cost",
    render: (value) => `$${Number(value || 0).toLocaleString()}`
  }
]

const filterOptions = [
  { value: "available", label: "Available", filterFn: (row) => row.status === "AVAILABLE" },
  { value: "unavailable", label: "Unavailable", filterFn: (row) => row.status !== "AVAILABLE" },
  { value: "truck", label: "Trucks", filterFn: (row) => row.vehicle_type === "TRUCK" },
]

const sortOptions = [
  { value: "vehicle_number", label: "Vehicle No.", sortFn: (a, b) => String(a.vehicle_number).localeCompare(String(b.vehicle_number)) },
  { value: "odometer", label: "Odometer", sortFn: (a, b) => Number(a.odometer) - Number(b.odometer) },
]

const groupOptions = [
  { value: "vehicle_type", label: "Type", groupFn: (a, b) => String(a.vehicle_type).localeCompare(String(b.vehicle_type)) },
  { value: "status", label: "Status", groupFn: (a, b) => String(a.status).localeCompare(String(b.status)) },
]

const emptyForm = {
  vehicle_number: "",
  model: "",
  vehicle_type: "",
  max_load_capacity: "",
  odometer: "",
  status: "AVAILABLE",
  acquisition_cost: ""
}

const buildPayload = (data) => ({
  vehicle_number: data.vehicle_number,
  model: data.model,
  vehicle_type: data.vehicle_type,
  max_load_capacity: Number(data.max_load_capacity) || 0,
  odometer: Number(data.odometer) || 0,
  status: data.status,
  acquisition_cost: Number(data.acquisition_cost) || 0
})

export default function VehiclesPage() {
  const [openDialog, setOpenDialog] = useState(false)
  const [openEditDialog, setOpenEditDialog] = useState(false)
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false)
  const [vehicles, setVehicles] = useState([])
  const [formData, setFormData] = useState(emptyForm)
  const [editForm, setEditForm] = useState(emptyForm)
  const [selectedVehicle, setSelectedVehicle] = useState(null)
  const [toast, setToast] = useState({
    open: false,
    message: "",
    type: "success"
  })

  const showToast = (message, type = "success") => {
    if (!message) {
      return
    }
    setToast({ open: true, message, type })
    setTimeout(() => {
      setToast((current) => ({ ...current, open: false }))
    }, 3000)
  }

  const fetchVehicles = async () => {
    const accessToken = localStorage.getItem("access_token")
    try {
      const { data } = await axios.get("http://localhost:8000/api/vehicles/all",
        accessToken
          ? {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            }
          : undefined
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

  useEffect(() => {
    fetchVehicles()
  }, [])

  const kpis = useMemo(() => {
    const available = vehicles.filter((vehicle) => vehicle.status === "AVAILABLE").length
    const unavailable = vehicles.length - available
    const avgOdometer = vehicles.length
      ? Math.round(vehicles.reduce((sum, vehicle) => sum + Number(vehicle.odometer || 0), 0) / vehicles.length)
      : 0

    return {
      totalVehicles: vehicles.length,
      active: available,
      inactive: unavailable,
      avgOdometer: `${avgOdometer.toLocaleString()} km`,
    }
  }, [vehicles])

  const handleCreate = async () => {
    const accessToken = localStorage.getItem("access_token")
    try {
      const { data } = await axios.post(
        "http://localhost:8000/api/vehicles/create",
        buildPayload(formData),
        accessToken
          ? {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            }
          : undefined
      )
      if (data?.success === false) {
        showToast(getMessageFromResponse(data) || "Vehicle creation failed.", "error")
        return
      }
      setOpenDialog(false)
      setFormData(emptyForm)
      fetchVehicles()
      showToast(getMessageFromResponse(data) || "Vehicle created.", "success")
    } catch (error) {
      const message = getMessageFromResponse(error?.response?.data) || "Vehicle creation failed."
      showToast(message, "error")
    }
  }

  const handleEdit = (row) => {
    setSelectedVehicle(row)
    setEditForm({
      vehicle_number: row.vehicle_number || "",
      model: row.model || "",
      vehicle_type: row.vehicle_type || "",
      max_load_capacity: row.max_load_capacity ?? "",
      odometer: row.odometer ?? "",
      status: row.status || "AVAILABLE",
      acquisition_cost: row.acquisition_cost ?? ""
    })
    setOpenEditDialog(true)
  }

  const handleUpdate = async () => {
    if (!selectedVehicle?.id) {
      return
    }

    const accessToken = localStorage.getItem("access_token")
    try {
      const { data } = await axios.put(
        `http://localhost:8000/api/vehicles/${selectedVehicle.id}`,
        buildPayload(editForm),
        accessToken
          ? {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            }
          : undefined
      )
      if (data?.success === false) {
        showToast(getMessageFromResponse(data) || "Vehicle update failed.", "error")
        return
      }
      setOpenEditDialog(false)
      setSelectedVehicle(null)
      fetchVehicles()
      showToast(getMessageFromResponse(data) || "Vehicle updated.", "success")
    } catch (error) {
      const message = getMessageFromResponse(error?.response?.data) || "Vehicle update failed."
      showToast(message, "error")
    }
  }

  const handleDelete = (row) => {
    setSelectedVehicle(row)
    setOpenDeleteDialog(true)
  }

  const handleConfirmDelete = async () => {
    if (!selectedVehicle?.id) {
      return
    }

    const accessToken = localStorage.getItem("access_token")
    try {
      const { data } = await axios.delete(`http://localhost:8000/api/vehicles/${selectedVehicle.id}`,
        accessToken
          ? {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            }
          : undefined
      )
      if (data?.success === false) {
        showToast(getMessageFromResponse(data) || "Vehicle delete failed.", "error")
        return
      }
      setOpenDeleteDialog(false)
      setSelectedVehicle(null)
      fetchVehicles()
      showToast(getMessageFromResponse(data) || "Vehicle deleted.", "success")
    } catch (error) {
      const message = getMessageFromResponse(error?.response?.data) || "Vehicle delete failed."
      showToast(message, "error")
    }
  }

  return (
    <Layout title="Vehicle Registry">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <KPICard title="Total Vehicles" value={kpis.totalVehicles} icon={Truck} />
          <KPICard title="Available" value={kpis.active} icon={CheckCircle} />
          <KPICard title="Unavailable" value={kpis.inactive} icon={XCircle} />
          <KPICard title="Avg Odometer" value={kpis.avgOdometer} icon={Gauge} />
        </div>

        <div className="flex items-center gap-4 mb-2">
          <Button
            onClick={() => setOpenDialog(true)}
            className="bg-[#D94002] hover:bg-[#C03902] text-white gap-2 shadow-lg hover:shadow-xl transition-all"
          >
            <Plus className="h-4 w-4" />
            Create Vehicle
          </Button>
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

        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogContent onClose={() => setOpenDialog(false)} className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl">Create New Vehicle</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-6">
              <div className="space-y-2">
                <Label>Vehicle Number</Label>
                <Input
                  value={formData.vehicle_number}
                  onChange={(e) => setFormData({ ...formData, vehicle_number: e.target.value })}
                  placeholder="ABC-1234"
                />
              </div>
              <div className="space-y-2">
                <Label>Model</Label>
                <Input
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  placeholder="Ford F-150"
                />
              </div>
              <div className="space-y-2">
                <Label>Vehicle Type</Label>
                <select
                  value={formData.vehicle_type}
                  onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select vehicle type</option>
                  <option value="BIKE">Bike</option>
                  <option value="TRUCK">Truck</option>
                  <option value="VAN">Van</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Max Load Capacity</Label>
                <Input
                  type="number"
                  value={formData.max_load_capacity}
                  onChange={(e) => setFormData({ ...formData, max_load_capacity: e.target.value })}
                  placeholder="300"
                />
              </div>
              <div className="space-y-2">
                <Label>Odometer</Label>
                <Input
                  type="number"
                  value={formData.odometer}
                  onChange={(e) => setFormData({ ...formData, odometer: e.target.value })}
                  placeholder="100"
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="AVAILABLE">Available</option>
                  <option value="ON_TRIP">On Trip</option>
                  <option value="IN_SHOP">In Shop</option>
                  <option value="RETIRED">Retired</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Acquisition Cost</Label>
                <Input
                  type="number"
                  value={formData.acquisition_cost}
                  onChange={(e) => setFormData({ ...formData, acquisition_cost: e.target.value })}
                  placeholder="0"
                />
              </div>
              <Button
                onClick={handleCreate}
                className="w-full bg-[#D94002] hover:bg-[#C03902] text-white font-semibold py-5 mt-6 shadow-lg hover:shadow-xl transition-all"
              >
                Create Vehicle
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={openEditDialog} onOpenChange={setOpenEditDialog}>
          <DialogContent onClose={() => setOpenEditDialog(false)} className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl">Update Vehicle</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-6">
              <div className="space-y-2">
                <Label>Vehicle Number</Label>
                <Input
                  value={editForm.vehicle_number}
                  onChange={(e) => setEditForm({ ...editForm, vehicle_number: e.target.value })}
                  placeholder="ABC-1234"
                />
              </div>
              <div className="space-y-2">
                <Label>Model</Label>
                <Input
                  value={editForm.model}
                  onChange={(e) => setEditForm({ ...editForm, model: e.target.value })}
                  placeholder="Ford F-150"
                />
              </div>
              <div className="space-y-2">
                <Label>Vehicle Type</Label>
                <select
                  value={editForm.vehicle_type}
                  onChange={(e) => setEditForm({ ...editForm, vehicle_type: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select vehicle type</option>
                  <option value="BIKE">Bike</option>
                  <option value="TRUCK">Truck</option>
                  <option value="VAN">Van</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Max Load Capacity</Label>
                <Input
                  type="number"
                  value={editForm.max_load_capacity}
                  onChange={(e) => setEditForm({ ...editForm, max_load_capacity: e.target.value })}
                  placeholder="300"
                />
              </div>
              <div className="space-y-2">
                <Label>Odometer</Label>
                <Input
                  type="number"
                  value={editForm.odometer}
                  onChange={(e) => setEditForm({ ...editForm, odometer: e.target.value })}
                  placeholder="100"
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="AVAILABLE">Available</option>
                  <option value="ON_TRIP">On Trip</option>
                  <option value="IN_SHOP">In Shop</option>
                  <option value="RETIRED">Retired</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Acquisition Cost</Label>
                <Input
                  type="number"
                  value={editForm.acquisition_cost}
                  onChange={(e) => setEditForm({ ...editForm, acquisition_cost: e.target.value })}
                  placeholder="0"
                />
              </div>
              <Button
                onClick={handleUpdate}
                className="w-full bg-[#D94002] hover:bg-[#C03902] text-white font-semibold py-5 mt-6 shadow-lg hover:shadow-xl transition-all"
              >
                Update Vehicle
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={openDeleteDialog} onOpenChange={setOpenDeleteDialog}>
          <DialogContent onClose={() => setOpenDeleteDialog(false)} className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl">Delete Vehicle</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Are you sure you want to delete
                {selectedVehicle?.vehicle_number ? ` ${selectedVehicle.vehicle_number}` : " this vehicle"}?
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
