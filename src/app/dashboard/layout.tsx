import Sidebar from '@/components/layout/Sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-[#ECEAE7]">
      <Sidebar />
      <div className="ml-64 flex-1 flex flex-col overflow-hidden">
        {children}
      </div>
    </div>
  )
}
