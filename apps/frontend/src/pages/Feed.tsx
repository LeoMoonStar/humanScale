export function Feed() {
  return (
    <div className="max-w-6xl mx-auto py-8">
      <h2 className="text-3xl font-bold text-white mb-8">Discover Creators</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="glass-panel p-0 overflow-hidden hover:border-indigo-500/50 transition-colors pointer-events-auto cursor-pointer group">
            <div className="h-32 bg-gradient-to-br from-indigo-900/50 to-purple-900/50 relative">
               <div className="absolute -bottom-6 left-6 w-12 h-12 rounded-full bg-gray-800 border-2 border-gray-900"></div>
            </div>
            <div className="p-6 pt-8">
              <h3 className="font-bold text-white text-lg">Creator Name {i}</h3>
              <p className="text-sm text-gray-400 mb-4">Brief bio description of the creator goes here...</p>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Market Cap</span>
                <span className="text-green-400 font-mono font-medium">$1.2M</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
