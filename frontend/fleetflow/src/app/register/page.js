'use client'

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import axios from "axios"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

const USER_ROLES = [
  { value: "ADMIN", label: "Admin" },
  { value: "MANAGER", label: "Manager" },
  { value: "DISPATCHER", label: "Dispatcher" },
  { value: "SAFETY", label: "Safety" },
  { value: "FINANCE", label: "Finance" },
]

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [role, setRole] = useState("DISPATCHER")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    type: "error"
  })

  const showSnackbar = (message, type = "error") => {
    setSnackbar({ open: true, message, type })
    setTimeout(() => {
      setSnackbar((current) => ({ ...current, open: false }))
    }, 3000)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      showSnackbar("Passwords don't match", "error")
      return
    }

    if (password.length < 6) {
      showSnackbar("Password must be at least 6 characters", "error")
      return
    }

    setIsSubmitting(true)

    try {
      const { data } = await axios.post("http://localhost:8000/api/users/create", {
        name,
        email,
        password,
        role
      })

      if (data.success) {
        showSnackbar("Registration successful! Redirecting to login...", "success")
        setTimeout(() => {
          router.push("/login")
        }, 2000)
      } else {
        showSnackbar(data.message || "Registration failed", "error")
      }
    } catch (err) {
      const errorDetail = err?.response?.data?.message || err?.response?.data?.detail || "Registration failed"
      showSnackbar(errorDetail, "error")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-1 pb-6">
          <CardTitle className="text-3xl font-bold">
            Fleet<span className="text-[#D94002]">Flow</span>
          </CardTitle>
          <CardDescription className="text-base">Create your account</CardDescription>
        </CardHeader>
        <CardContent className="pb-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#D94002] focus:border-transparent text-gray-900 bg-white"
                required
              >
                {USER_ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <Button 
              type="submit" 
              className="w-full bg-[#D94002] hover:bg-[#C03902] text-base font-semibold py-5 disabled:opacity-60"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating account..." : "Register"}
            </Button>

            <p className="text-center text-sm text-gray-600">
              Already have an account?{" "}
              <Link href="/login" className="text-[#D94002] font-medium hover:underline">
                Login
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>

      {/* Snackbar */}
      {snackbar.open && (
        <div className={`fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white transition-all ${
          snackbar.type === "success" ? "bg-green-500" : "bg-red-500"
        }`}>
          {snackbar.message}
        </div>
      )}
    </div>
  )
}
