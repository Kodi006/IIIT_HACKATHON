'use client'

import React, { useEffect, useRef } from 'react'

const vertexShaderSource = `
  attribute vec2 a_position;
  varying vec2 vUv;
  void main() {
    vUv = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`

const fragmentShaderSource = `
  precision highp float;
  uniform float uTime;
  uniform vec2 uResolution;
  uniform vec2 uMouse;
  uniform vec2 uMouseVelocity;
  varying vec2 vUv;

  #define PI 3.14159265359

  // Medical/Clean Tech Palette
  vec3 getMedicalColor(float t) {
    vec3 a = vec3(0.0, 0.2, 0.4); // Deep Blue
    vec3 b = vec3(0.0, 0.5, 0.5); // Teal
    vec3 c = vec3(1.0, 1.0, 1.0); // White
    vec3 d = vec3(0.00, 0.33, 0.67);
    return a + b * cos(6.28318 * (c * t + d));
  }

  float random(vec2 st) {
      return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
  }

  void main() {
    vec2 uv = vUv;
    float aspect = uResolution.x / uResolution.y;
    vec2 p = (uv - 0.5) * vec2(aspect, 1.0) * 2.0;
    
    float t = uTime * 0.15; // Slower, calmer time
    
    // Mouse Interaction
    vec2 mouse = uMouse * vec2(aspect, 1.0);
    float mouseDist = length(p - mouse);
    // Smooth falloff for cursor
    float cursorGlow = exp(-mouseDist * 2.5); 
    
    // Background: Deep Clinical Blue/Slate
    vec3 color = vec3(0.02, 0.03, 0.08); 
    
    // 1. Subtle Data Grid (Medical Tech feel)
    vec2 gridUV = fract(p * 5.0) - 0.5;
    float gridDots = smoothstep(0.4, 0.0, length(gridUV));
    float gridmask = smoothstep(1.5, 0.0, mouseDist); // Only show grid near cursor
    color += vec3(0.1, 0.4, 0.6) * gridDots * 0.15 * (0.2 + gridmask * 0.8);

    // 2. Fluid "Bio-Wave"
    for (float i = 1.0; i <= 3.0; i++) {
        float waveTime = t * 0.5 + i * 12.0;
        // Organic curve
        float y = sin(p.x * 1.5 + waveTime) * 0.3 
                + sin(p.x * 3.5 + waveTime * 0.5) * 0.1;
        
        float dist = abs(p.y - y);
        float line = smoothstep(0.1, 0.0, dist);
        
        // Gentle pulse
        float glow = exp(-dist * 4.0);
        
        // Color based on layer
        vec3 waveColor = mix(
            vec3(0.0, 0.8, 0.9), // Cyan
            vec3(0.2, 0.4, 1.0), // Blue
            i / 3.0
        );
        
        // Interaction: Waves move/bend slightly away from cursor
        float repel = exp(-mouseDist * 2.0) * 0.2;
        
        color += waveColor * glow * 0.15; // Background ambient waves
        color += waveColor * line * 0.05;
    }

    // 3. Cursor "Scanner" Effect
    // A soft, intelligent-looking glow around the cursor
    vec3 scannerColor = vec3(0.2, 0.8, 1.0);
    color += scannerColor * cursorGlow * 0.3;
    
    // 4. Floating "Particles" (Cells/Data)
    // Very subtle, drifting slowly
    vec2 particleUV = p;
    float particles = 0.0;
    for(int i=0; i<6; i++) {
        float seed = float(i);
        vec2 pos = vec2(
            sin(t * 0.5 + seed) * aspect,
            cos(t * 0.3 + seed * 1.5)
        );
        
        // Slight attraction to mouse
        vec2 dir = mouse - pos;
        pos += dir * 0.1;
        
        float d = length(p - pos);
        particles += exp(-d * 15.0);
    }
    color += vec3(0.5, 0.9, 1.0) * particles * 0.2;

    // Vignette for focus
    float vig = 1.0 - smoothstep(0.5, 2.5, length(p));
    color *= vig;

    // Enhance contrast/brightness slightly
    color = pow(color, vec3(0.9));

    gl_FragColor = vec4(color, 1.0);
  }
`

function createShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Shader compile error:', gl.getShaderInfoLog(shader))
    gl.deleteShader(shader)
    return null
  }
  return shader
}

function createProgram(gl: WebGLRenderingContext, vertexShader: WebGLShader, fragmentShader: WebGLShader): WebGLProgram | null {
  const program = gl.createProgram()
  if (!program) return null
  gl.attachShader(program, vertexShader)
  gl.attachShader(program, fragmentShader)
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Program link error:', gl.getProgramInfoLog(program))
    gl.deleteProgram(program)
    return null
  }
  return program
}

const DigitalAurora: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)
  const startTimeRef = useRef<number>(0)
  const mouseRef = useRef({ x: 0.5, y: 0.5, targetX: 0.5, targetY: 0.5, vx: 0, vy: 0 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext('webgl', {
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
    })
    if (!gl) {
      console.error('WebGL not supported')
      return
    }

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource)
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource)
    if (!vertexShader || !fragmentShader) return

    const program = createProgram(gl, vertexShader, fragmentShader)
    if (!program) return

    const positionLocation = gl.getAttribLocation(program, 'a_position')
    const timeLocation = gl.getUniformLocation(program, 'uTime')
    const resolutionLocation = gl.getUniformLocation(program, 'uResolution')
    const mouseLocation = gl.getUniformLocation(program, 'uMouse')
    const mouseVelocityLocation = gl.getUniformLocation(program, 'uMouseVelocity')

    const positionBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
    const positions = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
      -1,  1,
       1, -1,
       1,  1,
    ])
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW)

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 2)
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      canvas.style.width = `${window.innerWidth}px`
      canvas.style.height = `${window.innerHeight}px`
      gl.viewport(0, 0, canvas.width, canvas.height)
    }
    resize()
    window.addEventListener('resize', resize)

    // Mouse tracking with smooth interpolation
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.targetX = e.clientX / window.innerWidth
      mouseRef.current.targetY = 1.0 - (e.clientY / window.innerHeight) // Flip Y for WebGL
    }
    
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        mouseRef.current.targetX = e.touches[0].clientX / window.innerWidth
        mouseRef.current.targetY = 1.0 - (e.touches[0].clientY / window.innerHeight)
      }
    }
    
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('touchmove', handleTouchMove)

    let isVisible = true
    const observer = new IntersectionObserver(
      (entries) => {
        isVisible = entries[0].isIntersecting
      },
      { threshold: 0 }
    )
    observer.observe(canvas)

    startTimeRef.current = performance.now()

    const render = () => {
      if (isVisible) {
        const time = (performance.now() - startTimeRef.current) / 1000
        
        // Smooth mouse interpolation (lerp)
        const mouse = mouseRef.current
        const prevX = mouse.x
        const prevY = mouse.y
        const smoothing = 0.12 // Responsive but smooth
        
        mouse.x += (mouse.targetX - mouse.x) * smoothing
        mouse.y += (mouse.targetY - mouse.y) * smoothing
        
        // Calculate velocity for trail effects
        mouse.vx = (mouse.x - prevX) * 50
        mouse.vy = (mouse.y - prevY) * 50

        gl.useProgram(program)
        gl.uniform1f(timeLocation, time)
        gl.uniform2f(resolutionLocation, canvas.width, canvas.height)
        gl.uniform2f(mouseLocation, (mouse.x - 0.5) * 2, (mouse.y - 0.5) * 2) // Convert to -1 to 1 range
        gl.uniform2f(mouseVelocityLocation, mouse.vx, mouse.vy)

        gl.enableVertexAttribArray(positionLocation)
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0)
        gl.drawArrays(gl.TRIANGLES, 0, 6)
      }

      animationRef.current = requestAnimationFrame(render)
    }
    render()

    return () => {
      cancelAnimationFrame(animationRef.current)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('touchmove', handleTouchMove)
      observer.disconnect()
      gl.deleteProgram(program)
      gl.deleteShader(vertexShader)
      gl.deleteShader(fragmentShader)
      gl.deleteBuffer(positionBuffer)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full"
      style={{ 
        background: '#000510',
        zIndex: -1
      }}
    />
  )
}

export default DigitalAurora
