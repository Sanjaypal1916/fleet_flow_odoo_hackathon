'use client'

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import axios from "axios"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    type: "error"
  })

  const getErrorMessage = (detail) => {
    if (!detail) {
      return "Login failed"
    }

    if (typeof detail === "string") {
      return detail
    }

    if (Array.isArray(detail)) {
      return detail
        .map((item) => (typeof item?.msg === "string" ? item.msg : null))
        .filter(Boolean)
        .join(", ") || "Login failed"
    }

    if (typeof detail?.msg === "string") {
      return detail.msg
    }

    return "Login failed"
  }

  const showSnackbar = (message, type = "error") => {
    setSnackbar({ open: true, message, type })
    setTimeout(() => {
      setSnackbar((current) => ({ ...current, open: false }))
    }, 3000)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const formData = new URLSearchParams({
        username,
        password,
      })
      const { data } = await axios.post("http://localhost:8000/api/login", formData, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      })
      localStorage.setItem("auth", JSON.stringify(data))
      localStorage.setItem("access_token", data?.access_token || "")
      localStorage.setItem("token_type", data?.token_type || "")
      localStorage.setItem("user_name", JSON.stringify(data?.user.name || {}))
      localStorage.setItem("user_id", JSON.stringify(data?.user.id || {}))
      localStorage.setItem("user_email", JSON.stringify(data?.user.email || {}))
      localStorage.setItem("role", JSON.stringify(data?.user.role || {}))
      router.push("/dashboard")
    } catch (err) {
      const errorDetail = err?.response?.data?.detail
      const message = getErrorMessage(errorDetail)
      showSnackbar(message, "error")
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
          <CardDescription className="text-base">Sign in to your account</CardDescription>
        </CardHeader>
        <CardContent className="pb-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
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
            <Button
              type="submit"
              className="w-full bg-[#D94002] hover:bg-[#C03902] text-base font-semibold py-5"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Logging in..." : "Login"}
            </Button>
            <p className="text-center text-sm text-gray-600">
              Don't have an account?{" "}
              <Link href="/register" className="text-[#D94002] font-medium hover:underline">
                Register
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
      {snackbar.open ? (
        <div
          className={`fixed bottom-6 left-1/2 z-50 w-[90%] max-w-sm -translate-x-1/2 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg ${
            snackbar.type === "error" ? "bg-red-600" : "bg-green-600"
          }`}
          role="status"
        >
          {snackbar.message}
        </div>
      ) : null}
    </div>
  )
}
