import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Navigation */}
      <nav className="bg-slate-800/50 backdrop-blur-md border-b border-purple-500/20 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
            Granted
          </h1>
          <div className="flex gap-6">
            <a href="#" className="text-gray-300 hover:text-white transition">Home</a>
            <a href="#" className="text-gray-300 hover:text-white transition">Features</a>
            <a href="#" className="text-gray-300 hover:text-white transition">Docs</a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-6 py-20">
        {/* Logo Section */}
        <div className="flex justify-center gap-12 mb-16">
          <a 
            href="https://vite.dev" 
            target="_blank"
            className="group relative"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition duration-300"></div>
            <img 
              src={viteLogo} 
              className="relative w-24 h-24 p-4 bg-slate-800/50 rounded-2xl border border-slate-700 group-hover:border-cyan-500 transition duration-300 transform group-hover:scale-110" 
              alt="Vite logo" 
            />
          </a>
          <a 
            href="https://react.dev" 
            target="_blank"
            className="group relative"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-cyan-300 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition duration-300 animate-spin" style={{animationDuration: '3s'}}></div>
            <img 
              src={reactLogo} 
              className="relative w-24 h-24 p-4 bg-slate-800/50 rounded-2xl border border-slate-700 group-hover:border-blue-400 transition duration-300 transform group-hover:scale-110" 
              alt="React logo" 
            />
          </a>
        </div>

        {/* Title Section */}
        <div className="text-center mb-16">
          <h2 className="text-5xl md:text-6xl font-bold text-white mb-4">
            Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-red-500">Granted</span>
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            A modern application built with Vite and React, styled with beautiful Tailwind CSS designs.
          </p>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-3 gap-6 mb-16">
          <div className="bg-gradient-to-br from-slate-800 to-slate-700 border border-purple-500/20 rounded-xl p-6 hover:border-purple-500/50 transition">
            <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">42</div>
            <p className="text-gray-400 mt-2">Features</p>
          </div>
          <div className="bg-gradient-to-br from-slate-800 to-slate-700 border border-blue-500/20 rounded-xl p-6 hover:border-blue-500/50 transition">
            <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-600">1000+</div>
            <p className="text-gray-400 mt-2">Users</p>
          </div>
          <div className="bg-gradient-to-br from-slate-800 to-slate-700 border border-pink-500/20 rounded-xl p-6 hover:border-pink-500/50 transition">
            <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-red-600">99%</div>
            <p className="text-gray-400 mt-2">Uptime</p>
          </div>
        </div>

        {/* Interactive Counter Section */}
        <div className="bg-gradient-to-br from-slate-800/50 to-purple-800/50 border border-purple-500/30 rounded-2xl p-12 backdrop-blur-sm">
          <h3 className="text-2xl font-bold text-white mb-8 text-center">Interactive Counter</h3>
          <div className="flex flex-col items-center gap-6">
            <button 
              onClick={() => setCount((count) => count + 1)}
              className="group relative px-8 py-4 text-lg font-bold text-white overflow-hidden rounded-xl"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 group-hover:from-purple-500 group-hover:to-pink-500 transition duration-300"></div>
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition duration-300 bg-gradient-to-r from-pink-600 to-purple-600 blur"></div>
              <span className="relative">Count: {count}</span>
            </button>
            <button
              onClick={() => setCount(0)}
              className="px-6 py-2 text-sm font-semibold text-gray-300 border border-gray-500 rounded-lg hover:border-gray-300 hover:text-white transition"
            >
              Reset
            </button>
            <p className="text-gray-400 text-center">
              Click the button to increment the counter, or reset it to start over.
            </p>
          </div>
        </div>

        {/* Footer Section */}
        <div className="mt-20 text-center border-t border-purple-500/20 pt-12">
          <p className="text-gray-400 mb-4">
            Edit <code className="bg-slate-800 px-3 py-1 rounded text-pink-400">src/App.tsx</code> and save to test HMR
          </p>
          <a 
            href="#"
            className="inline-block mt-4 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-purple-500/50 transition duration-300"
          >
            Learn More
          </a>
        </div>
      </div>
    </div>
  )
}

export default App
