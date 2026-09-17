import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Q-Health</h1>
          <p className="mt-2 text-slate-600">Live Digital Token System</p>
        </div>

        <div className="space-y-4">
          <Link 
            href="/patient"
            className="block w-full py-4 px-6 bg-teal-600 hover:bg-teal-700 text-white text-center rounded-xl font-medium transition-colors"
          >
            Patient Portal (Mobile View)
          </Link>
          
          <Link 
            href="/hospital"
            className="block w-full py-4 px-6 bg-indigo-600 hover:bg-indigo-700 text-white text-center rounded-xl font-medium transition-colors"
          >
            Hospital Portal (Tablet View)
          </Link>
        </div>
      </div>
    </div>
  );
}
