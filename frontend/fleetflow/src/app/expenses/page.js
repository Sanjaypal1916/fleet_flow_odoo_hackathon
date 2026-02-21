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
import { DollarSign, FileText, TrendingUp, Plus } from "lucide-react"

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
  { key: "expense_type", header: "Type" },
  { key: "amount", header: "Amount", render: (value) => `$${Number(value || 0).toFixed(2)}` },
  { key: "description", header: "Description" },
]

const filterOptions = [
  { value: "maintenance", label: "Maintenance", filterFn: (row) => row.expense_type === "MAINTENANCE" },
  { value: "toll", label: "Toll", filterFn: (row) => row.expense_type === "TOLL" },
  { value: "other", label: "Other", filterFn: (row) => row.expense_type === "OTHER" },
]

const sortOptions = [
  { value: "amount", label: "Amount", sortFn: (a, b) => (a.amount || 0) - (b.amount || 0) },
  { value: "trip_id", label: "Trip ID", sortFn: (a, b) => (a.trip_id || 0) - (b.trip_id || 0) },
]

const groupOptions = [
  { value: "expense_type", label: "Type", groupFn: (a, b) => String(a.expense_type || "").localeCompare(String(b.expense_type || "")) },
]

const emptyExpenseForm = {
  trip_id: "",
  expense_type: "MAINTENANCE",
  amount: "",
  description: ""
}

export default function ExpensesPage() {
  const [openDialog, setOpenDialog] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [expenseLogs, setExpenseLogs] = useState([])
  const [trips, setTrips] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [form, setForm] = useState(emptyExpenseForm)
  const [toast, setToast] = useState({ open: false, message: "", type: "success" })

  const showToast = (message, type = "success") => {
    if (!message) return
    setToast({ open: true, message, type })
    setTimeout(() => setToast((current) => ({ ...current, open: false })), 3000)
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
    fetchExpenseLogs()
    fetchTrips()
    fetchVehicles()
  }, [])

  const mappedExpenseLogs = useMemo(() => {
    return expenseLogs.map(e => {
      const vehicle = vehicles.find(v => v.id === e.vehicle_id)
      const trip = trips.find(t => t.id === e.trip_id)
      return {
        ...e,
        vehicle_number: vehicle?.vehicle_number || e.vehicle_id,
        trip_display: trip ? `${trip.id} - ${trip.origin_city} → ${trip.destination_city}` : e.trip_id
      }
    })
  }, [expenseLogs, vehicles, trips])

  const kpis = useMemo(() => {
    const totalExpense = expenseLogs.reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
    const avgPerLog = expenseLogs.length ? Math.round(totalExpense / expenseLogs.length) : 0
    
    return {
      totalExpense: `$${totalExpense.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`,
      typeCount: new Set(expenseLogs.map(e => e.expense_type)).size,
      avgPerLog: `$${avgPerLog.toLocaleString()}`,
      logCount: expenseLogs.length,
    }
  }, [expenseLogs])

  const handleCreate = async () => {
    const accessToken = localStorage.getItem("access_token")
    try {
      const { data } = await axios.post(
        "http://localhost:8000/api/expense-logs/create",
        {
          trip_id: Number(form.trip_id),
          vehicle_id: trips.find(t => t.id === Number(form.trip_id))?.vehicle_id || 1,
          expense_type: form.expense_type,
          amount: Number(form.amount),
          description: form.description,
          date: new Date().toISOString(),
        },
        accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined
      )
      if (data?.success === false) {
        showToast(getMessageFromResponse(data) || "Expense creation failed.", "error")
        return
      }
      setOpenDialog(false)
      setForm(emptyExpenseForm)
      fetchExpenseLogs()
      showToast(getMessageFromResponse(data) || "Expense created.", "success")
    } catch (error) {
      const message = getMessageFromResponse(error?.response?.data) || "Expense creation failed."
      showToast(message, "error")
    }
  }

  const handleUpdate = async () => {
    const accessToken = localStorage.getItem("access_token")
    try {
      const { data } = await axios.put(
        `http://localhost:8000/api/expense-logs/${editingId}`,
        {
          trip_id: Number(form.trip_id),
          vehicle_id: trips.find(t => t.id === Number(form.trip_id))?.vehicle_id || 1,
          expense_type: form.expense_type,
          amount: Number(form.amount),
          description: form.description,
        },
        accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined
      )
      if (data?.success === false) {
        showToast(getMessageFromResponse(data) || "Update failed.", "error")
        return
      }
      setOpenDialog(false)
      setEditingId(null)
      setForm(emptyExpenseForm)
      fetchExpenseLogs()
      showToast(getMessageFromResponse(data) || "Expense updated.", "success")
    } catch (error) {
      const message = getMessageFromResponse(error?.response?.data) || "Update failed."
      showToast(message, "error")
    }
  }

  const handleEdit = (row) => {
    setEditingId(row.id)
    setForm({
      trip_id: row.trip_id,
      expense_type: row.expense_type,
      amount: row.amount,
      description: row.description,
    })
    setOpenDialog(true)
  }

  const handleDelete = (row) => {
    if (confirm(`Delete expense log #${row.id}?`)) {
      deleteLog(row.id)
    }
  }

  const deleteLog = async (id) => {
    const accessToken = localStorage.getItem("access_token")
    try {
      const { data } = await axios.delete(
        `http://localhost:8000/api/expense-logs/${id}`,
        accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined
      )
      if (data?.success === false) {
        showToast(getMessageFromResponse(data) || "Deletion failed.", "error")
        return
      }
      fetchExpenseLogs()
      showToast(getMessageFromResponse(data) || "Expense deleted.", "success")
    } catch (error) {
      const message = getMessageFromResponse(error?.response?.data) || "Deletion failed."
      showToast(message, "error")
    }
  }

  return (
    <Layout title="Expenses">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <KPICard title="Total Expense" value={kpis.totalExpense} icon={DollarSign} />
          <KPICard title="Total Types" value={kpis.typeCount} icon={FileText} />
          <KPICard title="Avg / Log" value={kpis.avgPerLog} icon={TrendingUp} />
          <KPICard title="Total Logs" value={kpis.logCount} />
        </div>

        <div className="flex items-center gap-4 mb-2">
          <Button 
            onClick={() => {
              setEditingId(null)
              setForm(emptyExpenseForm)
              setOpenDialog(true)
            }}
            className="bg-[#D94002] hover:bg-[#C03902] text-white gap-2 shadow-lg hover:shadow-xl transition-all"
          >
            <Plus className="h-4 w-4" />
            Add Expense
          </Button>
        </div>

        <DataTable 
          columns={columns}
          data={mappedExpenseLogs}
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
                {editingId ? "Edit Expense Log" : "Create Expense Log"}
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
                <Label>Expense Type</Label>
                <select
                  value={form.expense_type}
                  onChange={(e) => setForm({...form, expense_type: e.target.value})}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="MAINTENANCE">Maintenance</option>
                  <option value="TOLL">Toll</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Amount ($)</Label>
                <Input
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm({...form, amount: e.target.value})}
                  placeholder="0.00"
                  step="0.01"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm({...form, description: e.target.value})}
                  placeholder="Description"
                />
              </div>
              <Button
                onClick={editingId ? handleUpdate : handleCreate}
                className="w-full bg-[#D94002] hover:bg-[#C03902] text-white font-semibold py-5 mt-6 shadow-lg hover:shadow-xl transition-all"
              >
                {editingId ? "Update Expense" : "Add Expense"}
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
