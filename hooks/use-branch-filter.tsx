'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'

interface BranchOption {
  id: string
  name: string
}

interface BranchFilterContextType {
  selectedBranchId: string | null // null means "All Branches"
  selectedBranchName: string
  branches: BranchOption[]
  setSelectedBranch: (branchId: string | null, branchName: string) => void
}

const BranchFilterContext = createContext<BranchFilterContextType>({
  selectedBranchId: null,
  selectedBranchName: 'All Branches',
  branches: [],
  setSelectedBranch: () => {},
})

export function BranchFilterProvider({ children }: { children: ReactNode }) {
  const supabase = createClient()
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null)
  const [selectedBranchName, setSelectedBranchName] = useState('All Branches')
  const [branches, setBranches] = useState<BranchOption[]>([])

  useEffect(() => {
    const fetchBranches = async () => {
      const { data, error } = await supabase
        .from('branches')
        .select('id, name')
        .order('name', { ascending: true })

      if (!error && data) {
        setBranches(data)
      }
    }

    fetchBranches()
  }, []) // supabase is a singleton, no need in deps

  const setSelectedBranch = (branchId: string | null, branchName: string) => {
    setSelectedBranchId(branchId)
    setSelectedBranchName(branchName)
  }

  return (
    <BranchFilterContext.Provider value={{ selectedBranchId, selectedBranchName, branches, setSelectedBranch }}>
      {children}
    </BranchFilterContext.Provider>
  )
}

export function useBranchFilter() {
  return useContext(BranchFilterContext)
}
