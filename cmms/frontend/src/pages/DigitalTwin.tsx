import { useState, useEffect, useRef, Suspense } from 'react'
import { Canvas, useLoader } from '@react-three/fiber'
import { OrbitControls, Html, Float, Text, useProgress } from '@react-three/drei'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader'
import { Mesh, Group, BoxGeometry, MeshStandardMaterial } from 'three'
import * as THREE from 'three'
import {
  Expand, RefreshCw, ZoomIn, ZoomOut, RotateCw,
  Server, Thermometer, Activity, AlertTriangle,
} from 'lucide-react'
import { digitalTwinService } from '../services/api'

interface SensorLabel {
  id: string
  name: string
  value: string
  position: [number, number, number]
  status: 'normal' | 'warning' | 'critical'
}

interface AssetNode {
  id: string
  name: string
  position: [number, number, number]
  sensors: SensorLabel[]
  status: 'online' | 'offline' | 'warning'
}

function LoadingSpinner() {
  const { progress } = useProgress()
  return (
    <Html center>
      <div className="flex flex-col items-center gap-2">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
        <p className="text-sm text-gray-500">{progress.toFixed(0)}% loaded</p>
      </div>
    </Html>
  )
}

function Model({ url, format }: { url: string; format: 'gltf' | 'stl' }) {
  const group = useRef<Group>(null)
  const [error, setError] = useState(false)

  if (format === 'gltf') {
    try {
      const gltf = useLoader(GLTFLoader, url)
      return <primitive ref={group} object={gltf.scene} scale={1} />
    } catch {
      return null
    }
  }

  try {
    const geometry = useLoader(STLLoader, url)
    return (
      <mesh geometry={geometry} scale={0.1}>
        <meshStandardMaterial color="#dc2626" metalness={0.3} roughness={0.7} />
      </mesh>
    )
  } catch {
    return null
  }
}

function FallbackModel() {
  return (
    <mesh rotation={[0, 0, 0]}>
      <boxGeometry args={[2, 2, 2]} />
      <meshStandardMaterial color="#dc2626" wireframe />
    </mesh>
  )
}

function SensorLabel({ sensor }: { sensor: SensorLabel }) {
  return (
    <Html position={sensor.position} center distanceFactor={8}>
      <div className={`rounded-lg border px-2 py-1 text-xs shadow-lg backdrop-blur-sm ${
        sensor.status === 'critical' ? 'border-danger-500 bg-danger-500/20 text-danger-600' :
        sensor.status === 'warning' ? 'border-warning-500 bg-warning-500/20 text-warning-600' :
        'border-success-500 bg-success-500/20 text-success-600'
      }`}>
        <div className="flex items-center gap-1">
          {sensor.status === 'critical' ? <AlertTriangle className="h-3 w-3" /> : <Activity className="h-3 w-3" />}
          <span className="font-medium">{sensor.name}</span>
        </div>
        <p className="font-mono text-xs">{sensor.value}</p>
      </div>
    </Html>
  )
}

function AssetNode({ node }: { node: AssetNode }) {
  return (
    <group position={node.position}>
      <mesh
        onClick={() => {}}
        onPointerOver={e => { (e.object as Mesh).material.color.setHex(0xef4444) }}
        onPointerOut={e => { (e.object as Mesh).material.color.setHex(0xdc2626) }}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#dc2626" />
      </mesh>
      <Html position={[0, 1.5, 0]} center>
        <div className="rounded-lg bg-gray-900/90 px-2 py-1 text-xs text-white shadow-lg backdrop-blur-sm">
          {node.name}
        </div>
      </Html>
      {node.sensors.map(sensor => (
        <SensorLabel key={sensor.id} sensor={sensor} />
      ))}
    </group>
  )
}

export default function DigitalTwin() {
  const [models, setModels] = useState<{ id: string; url: string; format: 'gltf' | 'stl' }[]>([])
  const [assetNodes, setAssetNodes] = useState<AssetNode[]>([])
  const [selectedAsset, setSelectedAsset] = useState<AssetNode | null>(null)
  const [loading, setLoading] = useState(true)
  const [autoRotate, setAutoRotate] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      try {
        const twins = await digitalTwinService.list()
        if (twins?.length) {
          setModels(twins.map((t: { id: string; modelUrl?: string; format?: string }) => ({
            id: t.id,
            url: t.modelUrl || '',
            format: (t.format as 'gltf' | 'stl') || 'gltf',
          })))
        }
        setAssetNodes([
          { id: '1', name: 'Conveyor A1', position: [-3, 0, 0], status: 'online', sensors: [
            { id: 's1', name: 'Temp', value: '72°C', position: [-3, 1.5, 0], status: 'normal' },
            { id: 's2', name: 'Vibration', value: '1.2 mm/s', position: [-3, -1.5, 0], status: 'warning' },
          ]},
          { id: '2', name: 'Reactor B2', position: [3, 0, 0], status: 'online', sensors: [
            { id: 's3', name: 'Pressure', value: '4.2 bar', position: [3, 1.5, 0], status: 'critical' },
          ]},
          { id: '3', name: 'Pump Station', position: [0, 0, -3], status: 'offline', sensors: [
            { id: 's4', name: 'Flow Rate', value: '0 L/min', position: [0, 1.5, -3], status: 'critical' },
          ]},
        ])
      } catch {
        // Use defaults
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const controls = useRef(null)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Digital Twin</h2>
          <p className="mt-1 text-sm text-gray-500">3D visualization of your industrial assets</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setAutoRotate(!autoRotate)} className={`btn-secondary flex items-center gap-2 ${autoRotate ? 'bg-primary-50 text-primary-700' : ''}`}>
            <RotateCw className="h-4 w-4" />
            Auto-rotate
          </button>
          <button className="btn-secondary flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* 3D Viewer */}
        <div className="card lg:col-span-3 h-[600px] overflow-hidden p-0">
          <Canvas camera={{ position: [8, 6, 8], fov: 45 }}>
            <Suspense fallback={<LoadingSpinner />}>
              <ambientLight intensity={0.5} />
              <directionalLight position={[10, 10, 10]} intensity={0.8} />
              <directionalLight position={[-5, -5, -5]} intensity={0.3} />
              <gridHelper args={[20, 20, '#444', '#222']} />
              <axesHelper args={[5]} />
              <OrbitControls
                ref={controls}
                autoRotate={autoRotate}
                autoRotateSpeed={1.5}
                enableDamping
                dampingFactor={0.05}
              />
              {models.length > 0 ? models.map(m => (
                <Model key={m.id} url={m.url} format={m.format} />
              )) : <FallbackModel />}
              {assetNodes.map(node => (
                <AssetNode key={node.id} node={node} />
              ))}
              <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
                <Text position={[0, 4, 0]} fontSize={0.5} color="#dc2626" anchorX="center">
                  CMMS Vision Factory
                </Text>
              </Float>
            </Suspense>
          </Canvas>
        </div>

        {/* Asset Info Panel */}
        <div className="card lg:col-span-1">
          <h3 className="card-title mb-4">Asset Details</h3>
          {selectedAsset ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Server className="h-8 w-8 text-primary-600" />
                <div>
                  <p className="font-semibold text-gray-900">{selectedAsset.name}</p>
                  <span className={`badge ${
                    selectedAsset.status === 'online' ? 'badge-success' : 'badge-danger'
                  }`}>{selectedAsset.status}</span>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase text-gray-500">Sensors</p>
                {selectedAsset.sensors.map(s => (
                  <div key={s.id} className="flex items-center justify-between rounded-lg border p-2">
                    <div className="flex items-center gap-2">
                      <Thermometer className="h-3 w-3 text-gray-400" />
                      <span className="text-xs text-gray-700">{s.name}</span>
                    </div>
                    <span className={`text-xs font-mono font-medium ${
                      s.status === 'critical' ? 'text-danger-600' :
                      s.status === 'warning' ? 'text-warning-600' :
                      'text-success-600'
                    }`}>{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-gray-400">
              <Server className="mb-2 h-8 w-8" />
              <p className="text-sm">Click on an asset</p>
              <p className="text-xs">to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
