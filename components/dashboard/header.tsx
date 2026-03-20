'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { User } from '@/types'
import { useBranchFilter } from '@/hooks/use-branch-filter'

interface HeaderProps {
  user: User | null
  roleName?: string
}

export function Header({ user, roleName }: HeaderProps) {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [readIds, setReadIds] = useState<Set<number>>(new Set())
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all')
  const [isBranchOpen, setIsBranchOpen] = useState(false)
  const branchRef = useRef<HTMLDivElement | null>(null)

  const { selectedBranchId, selectedBranchName, branches, setSelectedBranch } = useBranchFilter()

  const notifications = useMemo(
    () => [
      {
        id: 1,
        title: 'Request Approved',
        message:
          'Your requisition #REQ-2847 for Office Supplies has been approved by Sarah Johnson.',
        time: '2 minutes ago',
        icon: 'fa-check',
        iconBg: 'bg-green-100',
        iconColor: 'text-green-600'
      },
      {
        id: 2,
        title: 'Items Dispatched',
        message:
          'Your requested items from REQ-2831 have been dispatched and are on their way.',
        time: '1 hour ago',
        icon: 'fa-truck',
        iconBg: 'bg-blue-100',
        iconColor: 'text-blue-600'
      },
      {
        id: 3,
        title: 'Reminder Update',
        message:
          'Please review and update your pending requisition REQ-2819 by end of day.',
        time: '3 hours ago',
        icon: 'fa-clock',
        iconBg: 'bg-yellow-100',
        iconColor: 'text-yellow-600'
      },
      {
        id: 4,
        title: 'Request Rejected',
        message:
          'Your requisition #REQ-2803 was rejected. Reason: Budget constraints for this quarter.',
        time: 'Yesterday',
        icon: 'fa-times-circle',
        iconBg: 'bg-red-100',
        iconColor: 'text-red-600'
      },
      {
        id: 5,
        title: 'Auto-Void Alert',
        message: 'Requisition #REQ-2795 was automatically voided due to 30-day inactivity.',
        time: '2 days ago',
        icon: 'fa-ban',
        iconBg: 'bg-purple-100',
        iconColor: 'text-purple-600'
      },
      {
        id: 6,
        title: 'Request Approved',
        message: 'Your requisition #REQ-2788 for IT Equipment has been approved.',
        time: '3 days ago',
        icon: 'fa-check',
        iconBg: 'bg-green-100',
        iconColor: 'text-green-600'
      },
      {
        id: 7,
        title: 'Items Dispatched',
        message: 'Items from REQ-2776 have been dispatched successfully.',
        time: '1 week ago',
        icon: 'fa-truck',
        iconBg: 'bg-blue-100',
        iconColor: 'text-blue-600'
      }
    ],
    []
  )

  const unreadCount = notifications.filter((item) => !readIds.has(item.id)).length
  const visibleNotifications =
    activeTab === 'unread'
      ? notifications.filter((item) => !readIds.has(item.id))
      : notifications

  const handleMarkAsRead = (id: number) => {
    setReadIds((prev) => new Set(prev).add(id))
  }

  const handleMarkAllRead = () => {
    setReadIds(new Set(notifications.map((item) => item.id)))
  }

  useEffect(() => {
    document.body.classList.toggle('overflow-hidden', isNotificationsOpen)

    return () => {
      document.body.classList.remove('overflow-hidden')
    }
  }, [isNotificationsOpen])

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (branchRef.current && !branchRef.current.contains(event.target as Node)) {
        setIsBranchOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  return (
    <header className="glass-header fixed top-0 left-0 right-0 h-16 border-b border-gray-200 z-50 flex items-center justify-between px-6 backdrop-blur-md bg-white/85">
      <div className="flex items-center space-x-6">
        {/* Logo */}
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-br from-red-600 to-red-700 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">D</span>
          </div>
          <span className="text-xl font-semibold text-gray-800">DuroShop</span>
        </div>

        {/* Branch Selector */}
        <div className="relative" ref={branchRef}>
          <button
            className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all"
            onClick={() => setIsBranchOpen((prev) => !prev)}
            aria-haspopup="listbox"
            aria-expanded={isBranchOpen}
          >
            <i className="fa-solid fa-building text-gray-500 text-sm"></i>
            <span className="text-sm font-medium text-gray-700">{selectedBranchName}</span>
            <i className="fa-solid fa-chevron-down text-gray-400 text-xs"></i>
          </button>

          {isBranchOpen && (
            <div className="absolute mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-50">
              <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50">
                All Branches
              </div>
              <ul className="py-1 max-h-64 overflow-y-auto" role="listbox" aria-label="Branches">
                <li>
                  <button
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                      selectedBranchId === null ? 'text-red-600 font-semibold' : 'text-gray-700'
                    }`}
                    role="option"
                    aria-selected={selectedBranchId === null}
                    onClick={() => {
                      setSelectedBranch(null, 'All Branches')
                      setIsBranchOpen(false)
                    }}
                  >
                    All Branches
                  </button>
                </li>
                {branches.map((branch) => (
                  <li key={branch.id}>
                    <button
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                        selectedBranchId === branch.id ? 'text-red-600 font-semibold' : 'text-gray-700'
                      }`}
                      role="option"
                      aria-selected={selectedBranchId === branch.id}
                      onClick={() => {
                        setSelectedBranch(branch.id, branch.name)
                        setIsBranchOpen(false)
                      }}
                    >
                      {branch.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex-1 max-w-2xl mx-6">
        <div className="relative">
          <i className="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
          <input
            type="text"
            placeholder="Search requisitions, users, items..."
            className="w-full pl-11 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm text-gray-900 placeholder-gray-400"
          />
        </div>
      </div>

      {/* Right Side */}
      <div className="flex items-center space-x-4">
        {/* Notifications */}
        <div className="relative">
          <button
            className="relative p-2 hover:bg-gray-100 rounded-lg transition-all"
            onClick={() => setIsNotificationsOpen((prev) => !prev)}
            aria-haspopup="dialog"
            aria-expanded={isNotificationsOpen}
            aria-controls="notification-panel"
          >
            <i className="fa-regular fa-bell text-gray-600 text-lg"></i>
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-600 rounded-full"></span>
            )}
          </button>
        </div>

        {/* User Profile */}
        <div className="flex items-center space-x-3 pl-4 border-l border-gray-200">
          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-800">{user?.name || 'User'}</span>
            <span className="text-xs text-gray-500">{roleName || ''}</span>
          </div>
          <i className="fa-solid fa-chevron-down text-gray-400 text-xs"></i>
        </div>
      </div>

      {isMounted &&
        isNotificationsOpen &&
        createPortal(
          <div
            id="notification-panel"
            className="fixed inset-0 z-[9999] bg-black/50"
            role="dialog"
            aria-modal="true"
            onClick={() => setIsNotificationsOpen(false)}
          >
            <div
              className="absolute top-16 right-4 bottom-4 w-[420px] bg-white rounded-2xl shadow-2xl overflow-hidden"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
                <div className="flex items-center space-x-2">
                  <i className="fa-solid fa-bell text-red-600 text-lg"></i>
                  <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={handleMarkAllRead}
                    className="text-sm text-red-600 hover:text-red-700 font-medium"
                  >
                    Mark all read
                  </button>
                  <button
                    onClick={() => setIsNotificationsOpen(false)}
                    className="text-gray-500 hover:text-gray-700 transition-colors"
                    aria-label="Close notifications"
                  >
                    <i className="fa-solid fa-times text-xl"></i>
                  </button>
                </div>
              </div>

              <div className="flex border-b border-gray-200 px-6">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'all'
                      ? 'text-red-600 border-red-600'
                      : 'text-gray-600 border-transparent hover:text-gray-900'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setActiveTab('unread')}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'unread'
                      ? 'text-red-600 border-red-600'
                      : 'text-gray-600 border-transparent hover:text-gray-900'
                  }`}
                >
                  Unread ({unreadCount})
                </button>
              </div>

              <div className="max-h-[calc(100vh-16rem)] overflow-y-auto">
                {visibleNotifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 px-6">
                    <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                      <i className="fa-solid fa-bell-slash text-gray-400 text-4xl"></i>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No notifications yet</h3>
                    <p className="text-sm text-gray-600 text-center">
                      When you receive updates about your requests, they&apos;ll appear here.
                    </p>
                  </div>
                ) : (
                  visibleNotifications.map((item, index) => {
                    const isUnread = !readIds.has(item.id)
                    const isLast = index === visibleNotifications.length - 1

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleMarkAsRead(item.id)}
                        className={`w-full text-left px-6 py-4 border-gray-200 hover:bg-gray-50 transition-all ${
                          isUnread ? 'bg-blue-50' : 'bg-white'
                        } ${isLast ? 'border-b-0' : 'border-b'}`}
                      >
                        <div className="flex items-start space-x-3">
                          <div
                            className={`w-10 h-10 rounded-full ${item.iconBg} flex items-center justify-center flex-shrink-0`}
                          >
                            <i className={`fa-solid ${item.icon} ${item.iconColor}`}></i>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <h3 className="text-sm font-semibold text-gray-900">{item.title}</h3>
                              {isUnread && <span className="w-2 h-2 bg-red-600 rounded-full"></span>}
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{item.message}</p>
                            <span className="text-xs text-gray-500">{item.time}</span>
                          </div>
                        </div>
                      </button>
                    )
                  })
                )}
              </div>

              <div className="px-6 py-3 border-t border-gray-200">
                <button className="w-full text-center text-sm text-red-600 hover:text-red-700 font-medium py-2">
                  View all notifications
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </header>
  )
}
