export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen flex-col md:flex-row md:overflow-hidden">
      <div className="w-full flex-none md:w-64">
        <nav className="flex h-full flex-col px-3 py-4">
          <div className="flex grow flex-row justify-between space-x-2 md:flex-col md:space-x-0 md:space-y-2">
            <div className="flex h-[48px] grow items-center rounded-md bg-gray-50 p-3 text-sm font-medium md:h-auto md:justify-start md:p-2 md:px-3">
              Dashboard
            </div>
          </div>
        </nav>
      </div>
      <div className="flex-grow p-6 md:overflow-y-auto md:p-12">
        {children}
      </div>
    </div>
  );
}
