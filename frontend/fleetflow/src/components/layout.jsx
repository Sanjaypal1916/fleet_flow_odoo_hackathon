'use client'

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { 
  LayoutDashboard, 
  Truck, 
  MapPin, 
  Wrench, 
  DollarSign, 
  Users, 
  BarChart3,
  UserCircle,
  Lock,
  LogOut
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Vehicles", href: "/vehicles", icon: Truck },
  { name: "Trips", href: "/trips", icon: MapPin },
  { name: "Maintenance", href: "/maintenance", icon: Wrench },
  { name: "Expenses", href: "/expenses", icon: DollarSign },
  { name: "Drivers", href: "/drivers", icon: Users },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
]

export function Layout({ children, title }) {
  const pathname = usePathname()
  const router = useRouter()
  const [openProfile, setOpenProfile] = useState(false)
  const [openPassword, setOpenPassword] = useState(false)
  
  // User profile data from localStorage
  const [profile, setProfile] = useState({
    id: null,
    name: "",
    email: "",
    role: "",
    is_active: true
  })

  // Load user data from localStorage on mount
  useEffect(() => {
    const userName = localStorage.getItem("user_name")
    const userId = localStorage.getItem("user_id")
    const userEmail = localStorage.getItem("user_email")
    const userRole = localStorage.getItem("role")

    setProfile({
      id: userId ? JSON.parse(userId) : null,
      name: userName ? JSON.parse(userName) : "User",
      email: userEmail ? JSON.parse(userEmail) : "",
      role: userRole ? JSON.parse(userRole) : "",
      is_active: true
    })
  }, [])

  const handleProfileUpdate = (e) => {
    e.preventDefault()
    // Handle profile update logic here
    console.log("Profile updated:", profile)
    setOpenProfile(false)
  }

  const handlePasswordChange = (e) => {
    e.preventDefault()
    // Handle password change logic here
    console.log("Password change requested")
    setOpenPassword(false)
  }

  const handleLogout = () => {
    // Clear localStorage
    localStorage.clear()
    // Close the profile dialog
    setOpenProfile(false)
    // Redirect to login page
    router.push("/login")
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 shadow-lg">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center border-b border-gray-200 px-6 bg-gradient-to-r from-white to-gray-50">
            <h1 className="text-xl font-bold text-gray-900">
              Fleet<span className="text-[#D94002]">Flow</span>
            </h1>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-3 py-4">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-[#D94002] text-white shadow-md"
                      : "text-gray-700 hover:bg-orange-50 hover:text-[#D94002]"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 pl-64 bg-gray-50">
        <div className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-8 shadow-md">
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          
          {/* Profile Button */}
          <Button
            onClick={() => setOpenProfile(true)}
            variant="outline"
            className="gap-2 hover:bg-orange-50 hover:text-[#D94002] hover:border-[#D94002] transition-all"
          >
            <UserCircle className="h-5 w-5" />
            <span className="font-medium">{profile.name}</span>
          </Button>
        </div>
        <div className="p-8">
          {children}
        </div>

        {/* Profile Dialog */}
        <Dialog open={openProfile} onOpenChange={setOpenProfile}>
          <DialogContent onClose={() => setOpenProfile(false)} className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl">My Profile</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleProfileUpdate} className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-600">User ID</span>
                  <span className="text-sm font-semibold text-gray-900">#{profile.id}</span>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={profile.name}
                    onChange={(e) => setProfile({...profile, name: e.target.value})}
                    placeholder="Enter your name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({...profile, email: e.target.value})}
                    placeholder="Enter your email"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Input
                    id="role"
                    value={profile.role}
                    onChange={(e) => setProfile({...profile, role: e.target.value})}
                    placeholder="Enter your role"
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-600">Account Status</span>
                  <Badge className={profile.is_active ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}>
                    {profile.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-4 sm:flex-row">
                <Button
                  type="button"
                  onClick={() => {
                    setOpenProfile(false)
                    setOpenPassword(true)
                  }}
                  variant="outline"
                  className="sm:flex-1 gap-2 border-[#D94002] text-[#D94002] hover:bg-orange-50"
                >
                  <Lock className="h-4 w-4" />
                  Change Password
                </Button>
                <Button
                  type="button"
                  onClick={handleLogout}
                  variant="outline"
                  className="sm:flex-1 gap-2 border-red-200 text-red-600 hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" />
                  Log Out
                </Button>
                <Button
                  type="submit"
                  className="sm:flex-1 bg-[#D94002] hover:bg-[#C03902] text-white shadow-lg hover:shadow-xl transition-all"
                >
                  Save Changes
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Change Password Dialog */}
        <Dialog open={openPassword} onOpenChange={setOpenPassword}>
          <DialogContent onClose={() => setOpenPassword(false)} className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl">Change Password</DialogTitle>
            </DialogHeader>
            <form onSubmit={handlePasswordChange} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    placeholder="Enter current password"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="Enter new password"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm new password"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  onClick={() => setOpenPassword(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-[#D94002] hover:bg-[#C03902] text-white shadow-lg hover:shadow-xl transition-all"
                >
                  Update Password
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}
