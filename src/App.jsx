
import React, { Suspense } from 'react'
import AdminPage from './components/AdminPage'
import CustomerPage from './components/CustomerPage'

function App() {
  // Check if current path is admin
  // Using a more robust way to check path
  const path = window.location.pathname;
  const isAdmin = path.includes('/admin');

  console.log("App Render - Path:", path, "isAdmin:", isAdmin);

  return (
    <div className="min-h-screen bg-[#f7f9fc]">
      <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
        <main>
          {isAdmin ? <AdminPage /> : <CustomerPage />}
        </main>
      </Suspense>
    </div>
  )
}

export default App
