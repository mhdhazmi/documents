import React from 'react'

function Background() {
  return (
    <div 
      className="flex flex-col md:flex-row h-screen"
      style={{
        backgroundImage: 'url("/background.png")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    />
    
  )
}

export default Background