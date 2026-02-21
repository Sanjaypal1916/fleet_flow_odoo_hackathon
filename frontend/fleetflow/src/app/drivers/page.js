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
import { Users, UserCheck, Shield, AlertTriangle, Plus } from "lucide-react"

const getStatusClass = (status) => {
  if (status === "ON_DUTY") {
    return "bg-green-600 hover:bg-green-700"
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
  { key: "name", header: "Name" },
  { key: "license_number", header: "License" },
  { key: "license_category", header: "Category" },
  { key: "license_expiry_date", header: "Expiry" },
  {
    key: "safety_score",
    header: "Safety Score",
    render: (value) => Number(value || 0).toFixed(0)
  },
  { key: "complaints", header: "Complaints" },
  {
    key: "status",
    header: "Status",
    render: (value) => (
      <Badge className={getStatusClass(value)}>
        {value}
      </Badge>
    )
  },
]

const filterOptions = [
  { value: "on_duty", label: "On Duty", filterFn: (row) => row.status === "ON_DUTY" },
  { value: "off_duty", label: "Off Duty", filterFn: (row) => row.status !== "ON_DUTY" },
  { value: "complaints", label: "Complaints", filterFn: (row) => Number(row.complaints) > 0 },
]

const sortOptions = [
  { value: "name", label: "Name", sortFn: (a, b) => String(a.name).localeCompare(String(b.name)) },
  { value: "safety_score", label: "Safety Score", sortFn: (a, b) => Number(a.safety_score) - Number(b.safety_score) },
  { value: "complaints", label: "Complaints", sortFn: (a, b) => Number(a.complaints) - Number(b.complaints) },
]

const groupOptions = [
  { value: "status", label: "Status", groupFn: (a, b) => String(a.status).localeCompare(String(b.status)) },
  { value: "license_category", label: "Category", groupFn: (a, b) => String(a.license_category).localeCompare(String(b.license_category)) },
]

const emptyForm = {
  name: "",
  license_number: "",
  license_category: "",
  license_expiry_date: "",
  status: "ON_DUTY",
  safety_score: "",
  complaints: ""
}

const buildPayload = (data) => ({
  name: data.name,
  license_number: data.license_number,
  license_category: data.license_category,
  license_expiry_date: data.license_expiry_date,
  status: data.status,
  safety_score: Number(data.safety_score) || 0,
  complaints: Number(data.complaints) || 0
})

export default function DriversPage() {
  const [openDialog, setOpenDialog] = useState(false)
  const [openEditDialog, setOpenEditDialog] = useState(false)
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false)
  const [drivers, setDrivers] = useState([])
  const [formData, setFormData] = useState(emptyForm)
  const [editForm, setEditForm] = useState(emptyForm)
  const [selectedDriver, setSelectedDriver] = useState(null)
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

  const fetchDrivers = async () => {
    const accessToken = localStorage.getItem("access_token")
    try {
      const { data } = await axios.get("http://localhost:8000/api/drivers/all",
        accessToken
          ? {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            }
          : undefined
      )
      if (data?.success === false) {
        showToast(getMessageFromResponse(data) || "Failed to load drivers.", "error")
        return
      }
      setDrivers(data?.data || [])
      showToast(getMessageFromResponse(data) || "Drivers loaded.", "success")
    } catch (error) {
      const message = getMessageFromResponse(error?.response?.data) || "Failed to load drivers."
      showToast(message, "error")
    }
  }

  useEffect(() => {
    fetchDrivers()
  }, [])

  const kpis = useMemo(() => {
    const active = drivers.filter((driver) => driver.status === "ON_DUTY").length
    const avgSafety = drivers.length
      ? (drivers.reduce((sum, driver) => sum + Number(driver.safety_score || 0), 0) / drivers.length).toFixed(1)
      : "0.0"
    const totalComplaints = drivers.reduce((sum, driver) => sum + Number(driver.complaints || 0), 0)

    return {
      totalDrivers: drivers.length,
      active,
      avgSafety,
      complaints: totalComplaints,
    }
  }, [drivers])

  const handleCreate = async () => {
    const accessToken = localStorage.getItem("access_token")
    try {
      const { data } = await axios.post(
        "http://localhost:8000/api/drivers/create",
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
        showToast(getMessageFromResponse(data) || "Driver creation failed.", "error")
        return
      }
      setOpenDialog(false)
      setFormData(emptyForm)
      fetchDrivers()
      showToast(getMessageFromResponse(data) || "Driver created.", "success")
    } catch (error) {
      const message = getMessageFromResponse(error?.response?.data) || "Driver creation failed."
      showToast(message, "error")
    }
  }

  const handleEdit = (row) => {
    setSelectedDriver(row)
    setEditForm({
      name: row.name || "",
      license_number: row.license_number || "",
      license_category: row.license_category || "",
      license_expiry_date: row.license_expiry_date || "",
      status: row.status || "ON_DUTY",
      safety_score: row.safety_score ?? "",
      complaints: row.complaints ?? ""
    })
    setOpenEditDialog(true)
  }

  const handleUpdate = async () => {
    if (!selectedDriver?.id) {
      return
    }

    const accessToken = localStorage.getItem("access_token")
    try {
      const { data } = await axios.put(
        `http://localhost:8000/api/drivers/${selectedDriver.id}`,
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
        showToast(getMessageFromResponse(data) || "Driver update failed.", "error")
        return
      }
      setOpenEditDialog(false)
      setSelectedDriver(null)
      fetchDrivers()
      showToast(getMessageFromResponse(data) || "Driver updated.", "success")
    } catch (error) {
      const message = getMessageFromResponse(error?.response?.data) || "Driver update failed."
      showToast(message, "error")
    }
  }

  const handleDelete = (row) => {
    setSelectedDriver(row)
    setOpenDeleteDialog(true)
  }

  const handleConfirmDelete = async () => {
    if (!selectedDriver?.id) {
      return
    }

    const accessToken = localStorage.getItem("access_token")
    try {
      const { data } = await axios.delete(`http://localhost:8000/api/drivers/${selectedDriver.id}`,
        accessToken
          ? {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            }
          : undefined
      )
      if (data?.success === false) {
        showToast(getMessageFromResponse(data) || "Driver delete failed.", "error")
        return
      }
      setOpenDeleteDialog(false)
      setSelectedDriver(null)
      fetchDrivers()
      showToast(getMessageFromResponse(data) || "Driver deleted.", "success")
    } catch (error) {
      const message = getMessageFromResponse(error?.response?.data) || "Driver delete failed."
      showToast(message, "error")
    }
  }

  return (
    <Layout title="Driver Performance">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <KPICard title="Total Drivers" value={kpis.totalDrivers} icon={Users} />
          <KPICard title="On Duty" value={kpis.active} icon={UserCheck} />
          <KPICard title="Avg Safety" value={kpis.avgSafety} icon={Shield} />
          <KPICard title="Complaints" value={kpis.complaints} icon={AlertTriangle} />
        </div>

        <div className="flex items-center gap-4 mb-2">
          <Button
            onClick={() => setOpenDialog(true)}
            className="bg-[#D94002] hover:bg-[#C03902] text-white gap-2 shadow-lg hover:shadow-xl transition-all"
          >
            <Plus className="h-4 w-4" />
            Create Driver
          </Button>
        </div>

        <DataTable
          columns={columns}
          data={drivers}
          filterOptions={filterOptions}
          sortOptions={sortOptions}
          groupOptions={groupOptions}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />

        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogContent onClose={() => setOpenDialog(false)} className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl">Create New Driver</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-6">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="John Smith"
                />
              </div>
              <div className="space-y-2">
                <Label>License Number</Label>
                <Input
                  value={formData.license_number}
                  onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                  placeholder="DL-12345"
                />
              </div>
              <div className="space-y-2">
                <Label>License Category</Label>
                <select
                  value={formData.license_category}
                  onChange={(e) => setFormData({ ...formData, license_category: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select license category</option>
                  <option value="BIKE">Bike</option>
                  <option value="TRUCK">Truck</option>
                  <option value="VAN">Van</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>License Expiry Date</Label>
                <Input
                  type="date"
                  value={formData.license_expiry_date}
                  onChange={(e) => setFormData({ ...formData, license_expiry_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="ON_DUTY">On Duty</option>
                  <option value="OFF_DUTY">Off Duty</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Safety Score</Label>
                <Input
                  type="number"
                  value={formData.safety_score}
                  onChange={(e) => setFormData({ ...formData, safety_score: e.target.value })}
                  placeholder="100"
                />
              </div>
              <div className="space-y-2">
                <Label>Complaints</Label>
                <Input
                  type="number"
                  value={formData.complaints}
                  onChange={(e) => setFormData({ ...formData, complaints: e.target.value })}
                  placeholder="0"
                />
              </div>
              <Button
                onClick={handleCreate}
                className="w-full bg-[#D94002] hover:bg-[#C03902] text-white font-semibold py-5 mt-6 shadow-lg hover:shadow-xl transition-all"
              >
                Create Driver
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={openEditDialog} onOpenChange={setOpenEditDialog}>
          <DialogContent onClose={() => setOpenEditDialog(false)} className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl">Update Driver</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-6">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="John Smith"
                />
              </div>
              <div className="space-y-2">
                <Label>License Number</Label>
                <Input
                  value={editForm.license_number}
                  onChange={(e) => setEditForm({ ...editForm, license_number: e.target.value })}
                  placeholder="DL-12345"
                />
              </div>
              <div className="space-y-2">
                <Label>License Category</Label>
                <select
                  value={editForm.license_category}
                  onChange={(e) => setEditForm({ ...editForm, license_category: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select license category</option>
                  <option value="BIKE">Bike</option>
                  <option value="TRUCK">Truck</option>
                  <option value="VAN">Van</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>License Expiry Date</Label>
                <Input
                  type="date"
                  value={editForm.license_expiry_date}
                  onChange={(e) => setEditForm({ ...editForm, license_expiry_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="ON_DUTY">On Duty</option>
                  <option value="OFF_DUTY">Off Duty</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Safety Score</Label>
                <Input
                  type="number"
                  value={editForm.safety_score}
                  onChange={(e) => setEditForm({ ...editForm, safety_score: e.target.value })}
                  placeholder="100"
                />
              </div>
              <div className="space-y-2">
                <Label>Complaints</Label>
                <Input
                  type="number"
                  value={editForm.complaints}
                  onChange={(e) => setEditForm({ ...editForm, complaints: e.target.value })}
                  placeholder="0"
                />
              </div>
              <Button
                onClick={handleUpdate}
                className="w-full bg-[#D94002] hover:bg-[#C03902] text-white font-semibold py-5 mt-6 shadow-lg hover:shadow-xl transition-all"
              >
                Update Driver
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={openDeleteDialog} onOpenChange={setOpenDeleteDialog}>
          <DialogContent onClose={() => setOpenDeleteDialog(false)} className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl">Delete Driver</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Are you sure you want to delete
                {selectedDriver?.name ? ` ${selectedDriver.name}` : " this driver"}?
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
