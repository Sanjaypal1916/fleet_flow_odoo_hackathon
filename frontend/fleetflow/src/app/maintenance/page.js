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
import { Wrench, AlertCircle, DollarSign, TrendingUp, Plus } from "lucide-react"

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
  { key: "id", header: "Service ID" },
  { key: "vehicle_number", header: "Vehicle" },
  { key: "issue_description", header: "Issue" },
  { key: "service_start_date", header: "Start Date" },
  { key: "service_end_date", header: "End Date" },
  { key: "cost", header: "Cost", render: (value) => `$${Number(value || 0).toFixed(2)}` },
  { 
    key: "status", 
    header: "Status",
    render: (value) => {
      const colorClass = value === "COMPLETED" ? "bg-blue-600 hover:bg-blue-700" : "bg-green-600 hover:bg-green-700"
      return <Badge className={colorClass}>{value}</Badge>
    }
  },
]

const filterOptions = [
  { value: "completed", label: "Completed", filterFn: (row) => row.status === "COMPLETED" },
  { value: "open", label: "Open", filterFn: (row) => row.status === "OPEN" },
]

const sortOptions = [
  { value: "service_start_date", label: "Date", sortFn: (a, b) => new Date(a.service_start_date) - new Date(b.service_start_date) },
  { value: "cost", label: "Cost", sortFn: (a, b) => (a.cost || 0) - (b.cost || 0) },
]

const groupOptions = [
  { value: "status", label: "Status", groupFn: (a, b) => String(a.status).localeCompare(String(b.status)) },
]

const emptyForm = {
  vehicle_id: "",
  issue_description: "",
  service_start_date: "",
  service_end_date: "",
  cost: "",
}

export default function MaintenancePage() {
  const [openDialog, setOpenDialog] = useState(false)
  const [openEditDialog, setOpenEditDialog] = useState(false)
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false)
  const [maintenanceLogs, setMaintenanceLogs] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [formData, setFormData] = useState(emptyForm)
  const [editForm, setEditForm] = useState(emptyForm)
  const [selectedLog, setSelectedLog] = useState(null)
  const [toast, setToast] = useState({ open: false, message: "", type: "success" })

  const showToast = (message, type = "success") => {
    if (!message) return
    setToast({ open: true, message, type })
    setTimeout(() => setToast((current) => ({ ...current, open: false })), 3000)
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
    fetchMaintenanceLogs()
    fetchVehicles()
  }, [])

  const maintenanceLogsWithNames = useMemo(() => {
    return maintenanceLogs.map(maintenance => {
      const vehicle = vehicles.find(v => v.id === maintenance.vehicle_id)
      return {
        ...maintenance,
        vehicle_number: vehicle?.vehicle_number || maintenance.vehicle_id,
      }
    })
  }, [maintenanceLogs, vehicles])

  const kpis = useMemo(() => {
    const open = maintenanceLogs.filter(m => m.status === "OPEN").length
    const totalCost = maintenanceLogs.reduce((sum, m) => sum + (Number(m.cost) || 0), 0)
    const avgCost = maintenanceLogs.length ? Math.round(totalCost / maintenanceLogs.length) : 0
    
    return {
      totalServices: maintenanceLogs.length,
      activeRepairs: open,
      totalCost: `$${totalCost.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`,
      avgCost: `$${avgCost.toLocaleString()}`,
    }
  }, [maintenanceLogs])

  const handleCreate = async () => {
    const accessToken = localStorage.getItem("access_token")
    try {
      const { data } = await axios.post(
        "http://localhost:8000/api/maintenance/create",
        {
          vehicle_id: Number(formData.vehicle_id),
          issue_description: formData.issue_description,
          service_start_date: formData.service_start_date,
          service_end_date: formData.service_end_date || null,
          cost: Number(formData.cost),
        },
        accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined
      )
      if (data?.success === false) {
        showToast(getMessageFromResponse(data) || "Maintenance creation failed.", "error")
        return
      }
      setOpenDialog(false)
      setFormData(emptyForm)
      fetchMaintenanceLogs()
      showToast(getMessageFromResponse(data) || "Maintenance log created.", "success")
    } catch (error) {
      const message = getMessageFromResponse(error?.response?.data) || "Maintenance creation failed."
      showToast(message, "error")
    }
  }

  const handleEdit = (row) => {
    if (row.status === "COMPLETED") {
      showToast("Cannot edit completed maintenance records", "error")
      return
    }
    setSelectedLog(row)
    setEditForm({
      vehicle_id: row.vehicle_id || "",
      issue_description: row.issue_description || "",
      service_start_date: row.service_start_date || "",
      service_end_date: row.service_end_date || "",
      cost: row.cost ?? "",
    })
    setOpenEditDialog(true)
  }

  const handleUpdate = async () => {
    if (!selectedLog?.id) return

    const accessToken = localStorage.getItem("access_token")
    try {
      const { data } = await axios.put(
        `http://localhost:8000/api/maintenance/${selectedLog.id}`,
        {
          vehicle_id: Number(editForm.vehicle_id),
          issue_description: editForm.issue_description,
          service_start_date: editForm.service_start_date,
          service_end_date: editForm.service_end_date || null,
          cost: Number(editForm.cost),
        },
        accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined
      )
      if (data?.success === false) {
        showToast(getMessageFromResponse(data) || "Maintenance update failed.", "error")
        return
      }
      setOpenEditDialog(false)
      setSelectedLog(null)
      fetchMaintenanceLogs()
      showToast(getMessageFromResponse(data) || "Maintenance log updated.", "success")
    } catch (error) {
      const message = getMessageFromResponse(error?.response?.data) || "Maintenance update failed."
      showToast(message, "error")
    }
  }

  const handleDelete = (row) => {
    setSelectedLog(row)
    setOpenDeleteDialog(true)
  }

  const handleConfirmDelete = async () => {
    if (!selectedLog?.id) return

    const accessToken = localStorage.getItem("access_token")
    try {
      const { data } = await axios.delete(
        `http://localhost:8000/api/maintenance/${selectedLog.id}`,
        accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined
      )
      if (data?.success === false) {
        showToast(getMessageFromResponse(data) || "Maintenance delete failed.", "error")
        return
      }
      setOpenDeleteDialog(false)
      setSelectedLog(null)
      fetchMaintenanceLogs()
      showToast(getMessageFromResponse(data) || "Maintenance log deleted.", "success")
    } catch (error) {
      const message = getMessageFromResponse(error?.response?.data) || "Maintenance delete failed."
      showToast(message, "error")
    }
  }

  return (
    <Layout title="Maintenance Logs">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <KPICard title="Total Services" value={kpis.totalServices} icon={Wrench} />
          <KPICard title="Open Repairs" value={kpis.activeRepairs} icon={AlertCircle} />
          <KPICard title="Total Cost" value={kpis.totalCost} icon={DollarSign} />
          <KPICard title="Avg Cost" value={kpis.avgCost} icon={TrendingUp} />
        </div>

        <div className="flex items-center gap-4 mb-2">
          <Button 
            onClick={() => {
              setFormData(emptyForm)
              setOpenDialog(true)
            }}
            className="bg-[#D94002] hover:bg-[#C03902] text-white gap-2 shadow-lg hover:shadow-xl transition-all"
          >
            <Plus className="h-4 w-4" />
            Create Maintenance
          </Button>
        </div>

        <DataTable 
          columns={columns}
          data={maintenanceLogsWithNames}
          filterOptions={filterOptions}
          sortOptions={sortOptions}
          groupOptions={groupOptions}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />

        {/* Create Dialog */}
        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogContent onClose={() => setOpenDialog(false)} className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl">Create Maintenance Record</DialogTitle>
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
                <Label>Issue Description</Label>
                <Input 
                  value={formData.issue_description}
                  onChange={(e) => setFormData({...formData, issue_description: e.target.value})}
                  placeholder="Oil change, tire replacement, etc."
                />
              </div>
              <div className="space-y-2">
                <Label>Service Start Date</Label>
                <Input 
                  type="date"
                  value={formData.service_start_date}
                  onChange={(e) => setFormData({...formData, service_start_date: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Service End Date (Optional)</Label>
                <Input 
                  type="date"
                  value={formData.service_end_date}
                  onChange={(e) => setFormData({...formData, service_end_date: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Cost ($)</Label>
                <Input 
                  type="number"
                  value={formData.cost}
                  onChange={(e) => setFormData({...formData, cost: e.target.value})}
                  placeholder="120.00"
                  step="0.01"
                />
              </div>
              <Button 
                onClick={handleCreate}
                className="w-full bg-[#D94002] hover:bg-[#C03902] text-white font-semibold py-5 mt-6 shadow-lg hover:shadow-xl transition-all"
              >
                Create Maintenance
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={openEditDialog} onOpenChange={setOpenEditDialog}>
          <DialogContent onClose={() => setOpenEditDialog(false)} className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl">Edit Maintenance Record</DialogTitle>
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
                <Label>Issue Description</Label>
                <Input 
                  value={editForm.issue_description}
                  onChange={(e) => setEditForm({...editForm, issue_description: e.target.value})}
                  placeholder="Oil change, tire replacement, etc."
                />
              </div>
              <div className="space-y-2">
                <Label>Service Start Date</Label>
                <Input 
                  type="date"
                  value={editForm.service_start_date}
                  onChange={(e) => setEditForm({...editForm, service_start_date: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Service End Date (Optional)</Label>
                <Input 
                  type="date"
                  value={editForm.service_end_date}
                  onChange={(e) => setEditForm({...editForm, service_end_date: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Cost ($)</Label>
                <Input 
                  type="number"
                  value={editForm.cost}
                  onChange={(e) => setEditForm({...editForm, cost: e.target.value})}
                  placeholder="120.00"
                  step="0.01"
                />
              </div>
              <Button 
                onClick={handleUpdate}
                className="w-full bg-[#D94002] hover:bg-[#C03902] text-white font-semibold py-5 mt-6 shadow-lg hover:shadow-xl transition-all"
              >
                Update Maintenance
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <Dialog open={openDeleteDialog} onOpenChange={setOpenDeleteDialog}>
          <DialogContent onClose={() => setOpenDeleteDialog(false)} className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl">Delete Maintenance Record</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Are you sure you want to delete maintenance record #{selectedLog?.id}?
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
