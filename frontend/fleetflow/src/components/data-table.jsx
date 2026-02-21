'use client'

import { useState, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, ChevronDown, Edit, Trash2 } from "lucide-react"

export function DataTable({ columns, data, filterOptions, sortOptions, groupOptions, onEdit, onDelete }) {
  const [searchQuery, setSearchQuery] = useState("")
  const [filterBy, setFilterBy] = useState("All")
  const [sortBy, setSortBy] = useState("default")
  const [groupBy, setGroupBy] = useState("None")

  const processedData = useMemo(() => {
    let result = [...data]

    // Search
    if (searchQuery) {
      result = result.filter(row =>
        columns.some(col => 
          String(row[col.key]).toLowerCase().includes(searchQuery.toLowerCase())
        )
      )
    }

    // Filter
    if (filterBy !== "All" && filterOptions) {
      const filterConfig = filterOptions.find(opt => opt.label === filterBy)
      if (filterConfig && filterConfig.filterFn) {
        result = result.filter(filterConfig.filterFn)
      }
    }

    // Sort
    if (sortBy !== "default" && sortOptions) {
      const sortConfig = sortOptions.find(opt => opt.value === sortBy)
      if (sortConfig && sortConfig.sortFn) {
        result = result.sort(sortConfig.sortFn)
      }
    }

    // Group
    if (groupBy !== "None" && groupOptions) {
      const groupConfig = groupOptions.find(opt => opt.value === groupBy)
      if (groupConfig && groupConfig.groupFn) {
        result = result.sort(groupConfig.groupFn)
      }
    }

    return result
  }, [data, searchQuery, filterBy, sortBy, groupBy, columns, filterOptions, sortOptions, groupOptions])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {filterOptions && (
          <DropdownMenu>
            <DropdownMenuTrigger>
              <Button variant="outline" className="gap-2 bg-green-700 text-white hover:bg-green-800 hover:text-white border-green-700">
                Filter: {filterBy}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setFilterBy("All")}>All</DropdownMenuItem>
              {filterOptions.map((option) => (
                <DropdownMenuItem key={option.value} onClick={() => setFilterBy(option.label)}>
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {sortOptions && (
          <DropdownMenu>
            <DropdownMenuTrigger>
              <Button variant="outline" className="gap-2 bg-blue-700 text-white hover:bg-blue-800 hover:text-white border-blue-700">
                Sort By
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setSortBy("default")}>Default</DropdownMenuItem>
              {sortOptions.map((option) => (
                <DropdownMenuItem key={option.value} onClick={() => setSortBy(option.value)}>
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {groupOptions && (
          <DropdownMenu>
            <DropdownMenuTrigger>
              <Button variant="outline" className="gap-2 bg-yellow-600 text-white hover:bg-yellow-700 hover:text-white border-yellow-600">
                Group By
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setGroupBy("None")}>None</DropdownMenuItem>
              {groupOptions.map((option) => (
                <DropdownMenuItem key={option.value} onClick={() => setGroupBy(option.value)}>
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="rounded-lg border border-gray-200 shadow-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#D94002] hover:bg-[#D94002]">
              {columns.map((column) => (
                <TableHead key={column.key} className="text-white font-semibold">{column.header}</TableHead>
              ))}
              {(onEdit || onDelete) && (
                <TableHead className="text-white font-semibold">Actions</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {processedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + (onEdit || onDelete ? 1 : 0)} className="h-24 text-center">
                  No results found.
                </TableCell>
              </TableRow>
            ) : (
              processedData.map((row, idx) => (
                <TableRow key={idx} className="h-10">
                  {columns.map((column) => (
                    <TableCell key={column.key} className="py-1.5">
                      {column.render ? column.render(row[column.key], row) : row[column.key]}
                    </TableCell>
                  ))}
                  {(onEdit || onDelete) && (
                    <TableCell className="py-1.5">
                      <div className="flex items-center gap-2">
                        {onEdit && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => onEdit(row)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {onDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700"
                            onClick={() => onDelete(row)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
