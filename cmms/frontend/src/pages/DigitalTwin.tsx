import React, { useState, useEffect, useRef, Suspense, useCallback, useMemo, useLayoutEffect } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, Html, Text, useProgress, TransformControls } from '@react-three/drei'
import { Mesh, Box3, Vector3, Group, Object3D, MeshStandardMaterial, DoubleSide, Color, Material, BufferGeometry } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module'
import {
  RefreshCw, RotateCw, RotateCcw,
  Server, Thermometer, Activity, AlertTriangle, Gauge,
  Upload, Box, Move, Save, MousePointer2, Trash2, Copy, Eye, EyeOff, Lock, Unlock,
  Maximize2, Minimize2, Undo2, Redo2,
  Layers, Plus, Search, Settings, Radio, Droplets, Zap, Wind, Waves, ArrowUp, ArrowDown,
} from 'lucide-react'
import { digitalTwinService, assetService } from '../services/api'

type ToolMode = 'select' | 'move' | 'rotate' | 'scale'

interface DataSource {
  deviceId: string; variableId: string; unit: string; topic: string
}

interface Thresholds {
  warning: number; alarm: number
}

interface SceneItem {
  id: string; type: 'object' | 'sensor'
  name: string; modelType?: string; modelUrl?: string; modelExt?: string; category?: string
  modelFile?: File
  position: [number, number, number]
  rotation: [number, number, number]
  scale: [number, number, number]
  visible: boolean; locked: boolean; color?: string
  sensorType?: string; dataSource?: DataSource; thresholds?: Thresholds
  lastValue?: number; lastValueAt?: string
  status?: 'normal' | 'warning' | 'critical' | 'disconnected'
}

const DEFAULT_PREDEFINED = [
  { id: 'obj-machine', name: 'Máquina', modelType: 'machine', category: 'Equipos', color: '#2563eb' },
  { id: 'obj-motor', name: 'Motor', modelType: 'motor', category: 'Equipos', color: '#dc2626' },
  { id: 'obj-pump', name: 'Bomba', modelType: 'pump', category: 'Equipos', color: '#16a34a' },
  { id: 'obj-panel', name: 'Tablero Eléctrico', modelType: 'panel', category: 'Equipos', color: '#ca8a04' },
  { id: 'obj-tank', name: 'Estanque', modelType: 'tank', category: 'Estructuras', color: '#0891b2' },
  { id: 'obj-pipe', name: 'Tubería', modelType: 'pipe', category: 'Estructuras', color: '#6b7280' },
  { id: 'obj-conveyor', name: 'Cinta Transportadora', modelType: 'conveyor', category: 'Equipos', color: '#7c3aed' },
]

function loadPredefined(): typeof DEFAULT_PREDEFINED {
  try {
    const raw = localStorage.getItem('dt_predefined')
    if (raw) { const parsed = JSON.parse(raw); if (Array.isArray(parsed) && parsed.length) return parsed }
  } catch {}
  return DEFAULT_PREDEFINED
}

function savePredefined(list: typeof DEFAULT_PREDEFINED) {
  localStorage.setItem('dt_predefined', JSON.stringify(list))
}

const SENSOR_TYPES = [
  { type: 'TEMPERATURE', label: 'Temperatura', icon: 'Thermometer', color: '#ef4444', unit: '°C' },
  { type: 'HUMIDITY', label: 'Humedad', icon: 'Droplets', color: '#3b82f6', unit: '%' },
  { type: 'PRESSURE', label: 'Presión', icon: 'Gauge', color: '#f59e0b', unit: 'bar' },
  { type: 'VIBRATION', label: 'Vibración', icon: 'Activity', color: '#8b5cf6', unit: 'mm/s' },
  { type: 'CURRENT', label: 'Corriente', icon: 'Zap', color: '#10b981', unit: 'A' },
  { type: 'VOLTAGE', label: 'Voltaje', icon: 'Zap', color: '#f97316', unit: 'V' },
  { type: 'FLOW', label: 'Caudal', icon: 'Waves', color: '#06b6d4', unit: 'm³/h' },
  { type: 'LEVEL', label: 'Nivel', icon: 'Radio', color: '#14b8a6', unit: '%' },
  { type: 'GAS', label: 'Gas', icon: 'Wind', color: '#a855f7', unit: 'ppm' },
  { type: 'OTHER', label: 'Otro', icon: 'Activity', color: '#6b7280', unit: '' },
]

function genId() { return Math.random().toString(36).substring(2, 10) }

function createGLTFLoader(withDraco = true) {
  const loader = new GLTFLoader()

  if (withDraco) {
    try {
      const dracoLoader = new DRACOLoader()
      dracoLoader.setDecoderPath("/draco/")
      loader.setDRACOLoader(dracoLoader)
      loader.setMeshoptDecoder(MeshoptDecoder)
    } catch (e) {
      console.warn("DRACO/Meshopt no disponible, usando GLTFLoader básico:", e)
    }
  }

  return loader
}

async function parseGLB(file: File) {
  const buffer = await file.arrayBuffer()

  try {
    const loader = createGLTFLoader(true)
    return await new Promise<any>((resolve, reject) => {
      loader.parse(buffer, "", resolve, reject)
    })
  } catch (firstError: any) {
    console.warn("Error con DRACO, reintentando sin DRACO:", firstError.message)
    const loader = createGLTFLoader(false)
    return await new Promise<any>((resolve, reject) => {
      loader.parse(buffer, "", resolve, reject)
    })
  }
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

const TARGET_MODEL_SIZE = 3

function normalizeModelExt(
  ext?: string | null,
  url?: string | null
): "gltf" | "obj" | "stl" | "" {
  let value = ext
    ?.trim()
    .toLowerCase()
    .replace(/^\./, "")

  if (!value && url && !url.startsWith("blob:")) {
    value = url
      .split("?")[0]
      .split("#")[0]
      .split(".")
      .pop()
      ?.toLowerCase()
  }

  if (value === "glb" || value === "gltf") return "gltf"
  if (value === "obj") return "obj"
  if (value === "stl") return "stl"

  return ""
}

function prepareModel(source: Object3D) {
  const container = new Group()
  const model = source.clone(true)

  model.updateMatrixWorld(true)

  let meshCount = 0
  model.traverse((child) => {
    if (!(child as Mesh).isMesh) return
    meshCount++
    const mesh = child as Mesh

    if (!mesh.geometry) {
      console.warn("Malla sin geometría:", mesh.name)
      return
    }

    mesh.geometry.computeBoundingBox()
    if (!mesh.geometry.attributes.normal) {
      mesh.geometry.computeVertexNormals()
    }

    mesh.visible = true
    mesh.castShadow = true
    mesh.receiveShadow = true
    mesh.frustumCulled = false

    if (Array.isArray(mesh.material)) {
      mesh.material = mesh.material.map((material) => prepareMaterial(material))
    } else {
      mesh.material = prepareMaterial(mesh.material)
    }
  })

  if (meshCount === 0) {
    throw new Error("El modelo no contiene mallas después de la clonación")
  }

  const box = new Box3().setFromObject(model)
  console.log("Bounding box inicial", {
    empty: box.isEmpty(),
    min: box.min.toArray(),
    max: box.max.toArray(),
    size: box.getSize(new Vector3()).toArray()
  })

  if (box.isEmpty()) {
    throw new Error("El modelo no contiene geometría visible (bounding box vacío)")
  }

  const size = box.getSize(new Vector3())
  const center = box.getCenter(new Vector3())
  const maxDimension = Math.max(size.x, size.y, size.z)

  if (!Number.isFinite(maxDimension) || maxDimension <= 0) {
    throw new Error("Dimensiones inválidas del modelo: " + JSON.stringify({ size: size.toArray(), center: center.toArray() }))
  }

  const uniformScale = TARGET_MODEL_SIZE / maxDimension

  model.position.x -= center.x
  model.position.y -= box.min.y
  model.position.z -= center.z

  container.scale.setScalar(uniformScale)
  container.add(model)

  console.log("Modelo preparado correctamente:", {
    meshCount,
    uniformScale,
    finalSize: size.multiplyScalar(uniformScale).toArray()
  })

  return container
}

function prepareMaterial(material?: Material) {
  if (!material) {
    return new MeshStandardMaterial({
      color: 0x9ca3af,
      roughness: 0.7,
      metalness: 0.1,
      side: DoubleSide,
    })
  }

  const prepared = material.clone()
  prepared.visible = true
  prepared.side = DoubleSide

  if ("transparent" in prepared) {
    prepared.transparent = false
  }

  if ("opacity" in prepared) {
    prepared.opacity = 1
  }

  return prepared
}

function getRenderableModelUrl(url: string) {
  if (!url.startsWith('/uploads/')) return url

  const apiBase = import.meta.env.VITE_API_URL
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return `http://localhost:3000${url}`
  }
  if (!apiBase) return url

  return `${apiBase.replace(/\/api\/?$/, '')}${url}`
}

function serializeSceneItem(item: SceneItem) {
  return {
    id: item.id, type: item.type, name: item.name,
    modelType: item.modelType, modelUrl: item.modelUrl, modelExt: item.modelExt, category: item.category,
    position: item.position, rotation: item.rotation, scale: item.scale,
    visible: item.visible, locked: item.locked, color: item.color,
    sensorType: item.sensorType, dataSource: item.dataSource, thresholds: item.thresholds,
  }
}

async function uploadPendingModelFiles(twinId: string, items: SceneItem[]) {
  const uploadedItems: SceneItem[] = []

  for (const item of items) {
    if (!item.modelFile) {
      uploadedItems.push(item)
      continue
    }

    const form = new FormData()
    form.append('model', item.modelFile)
    const twin = await digitalTwinService.uploadModel(twinId, form)
    const nextUrl = twin?.modelUrl

    if (!nextUrl) {
      throw new Error(`El backend no devolvio URL para ${item.name}`)
    }

    if (item.modelUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(item.modelUrl)
    }

    const { modelFile: _modelFile, ...persistableItem } = item
    uploadedItems.push({ ...persistableItem, modelUrl: nextUrl })
  }

  return uploadedItems
}

class ModelErrorBoundary extends React.Component<
  { children: React.ReactNode; onError?: (error: Error) => void },
  { error: Error | null }
> {
  constructor(props: { children: React.ReactNode; onError?: (error: Error) => void }) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Error cargando modelo 3D:", error)
    console.error("Información del componente:", info)
    this.props.onError?.(error)
  }

  render() {
    if (this.state.error) {
      return (
        <Html center>
          <div className="rounded bg-red-600 px-3 py-2 text-xs text-white max-w-[300px] break-words">
            Error 3D: {this.state.error.message}
          </div>
        </Html>
      )
    }
    return this.props.children
  }
}

function GLBModel({ file, url, onLoaded, onError, onPointerDown }: {
  file?: File | null
  url?: string
  onLoaded?: (model: Object3D) => void
  onError?: (error: Error) => void
  onPointerDown?: (e: any) => void
}) {
  const [model, setModel] = useState<Object3D | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadModel() {
      try {
        let gltf: any

        if (file) {
          console.log("Cargando GLB desde File:", { name: file.name, size: file.size })
          gltf = await parseGLB(file)
        } else if (url) {
          console.log("Cargando GLB desde URL:", { url })
          const loader = createGLTFLoader(true)
          gltf = await loader.loadAsync(url)
        } else {
          throw new Error("No se recibió archivo ni URL del modelo")
        }

        if (cancelled) return

        if (!gltf.scene) {
          throw new Error("El archivo GLB no contiene una escena")
        }

        let meshCount = 0
        gltf.scene.traverse((child: any) => {
          if (child.isMesh) meshCount++
        })

        console.log("GLB cargado:", { meshCount, animations: gltf.animations?.length ?? 0 })

        if (meshCount === 0) {
          throw new Error("La escena GLB no contiene mallas")
        }

        const prepared = prepareModel(gltf.scene)
        setModel(prepared)
        onLoaded?.(prepared)
      } catch (error: any) {
        if (cancelled) return
        const normalizedError = error instanceof Error ? error : new Error("Error desconocido cargando GLB")
        console.error("Fallo cargando GLB:", normalizedError)
        setLoadError(normalizedError.message)
        onError?.(normalizedError)
      }
    }

    loadModel()
    return () => { cancelled = true }
  }, [file, url])

  if (loadError) {
    return (
      <Html center>
        <div className="rounded bg-red-600 px-3 py-2 text-xs text-white max-w-[300px] break-words">
          Error 3D: {loadError}
        </div>
      </Html>
    )
  }

  if (!model) return <ModelLoadingIndicator />

  return <primitive object={model} onPointerDown={onPointerDown} />
}

function OBJModel({ url, file, onLoaded, onError, onPointerDown }: {
  url: string; file?: File | null; onLoaded?: (model: Object3D) => void; onError?: (error: Error) => void; onPointerDown: (e: any) => void
}) {
  const [model, setModel] = useState<Object3D | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        let obj: Object3D
        if (file) {
          const text = await file.text()
          obj = new OBJLoader().parse(text)
        } else {
          obj = await new OBJLoader().loadAsync(url)
        }
        if (cancelled) return
        const prepared = prepareModel(obj)
        setModel(prepared)
        onLoaded?.(prepared)
      } catch (err: any) {
        if (cancelled) return
        const e = err instanceof Error ? err : new Error("Error cargando OBJ")
        console.error("Fallo OBJ:", e)
        setLoadError(e.message)
        onError?.(e)
      }
    }
    load()
    return () => { cancelled = true }
  }, [url, file])

  if (loadError) return <Html center><div className="rounded bg-red-600 px-3 py-2 text-xs text-white max-w-[300px] break-words">Error OBJ: {loadError}</div></Html>
  if (!model) return <ModelLoadingIndicator />
  return <primitive object={model} onPointerDown={onPointerDown} />
}

function STLModel({ url, color, file, onLoaded, onError, onPointerDown }: {
  url: string; color: string; file?: File | null; onLoaded?: (model: Object3D) => void; onError?: (error: Error) => void; onPointerDown: (e: any) => void
}) {
  const [model, setModel] = useState<Object3D | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [geometry, setGeometry] = useState<BufferGeometry | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        let geo: BufferGeometry
        if (file) {
          const buffer = await file.arrayBuffer()
          geo = new STLLoader().parse(buffer)
        } else {
          geo = await new STLLoader().loadAsync(url)
        }
        if (cancelled) return
        setGeometry(geo)
      } catch (err: any) {
        if (cancelled) return
        const e = err instanceof Error ? err : new Error("Error cargando STL")
        console.error("Fallo STL:", e)
        setLoadError(e.message)
        onError?.(e)
      }
    }
    load()
    return () => { cancelled = true }
  }, [url, file])

  const preparedModel = useMemo(() => {
    if (!geometry) return null
    const geo = geometry.clone()
    geo.computeVertexNormals()
    const material = new MeshStandardMaterial({
      color: new Color(color), side: DoubleSide, roughness: 0.7, metalness: 0.1
    })
    const mesh = new Mesh(geo, material)
    return prepareModel(mesh)
  }, [geometry, color])

  if (loadError) return <Html center><div className="rounded bg-red-600 px-3 py-2 text-xs text-white max-w-[300px] break-words">Error STL: {loadError}</div></Html>
  if (!preparedModel) return <ModelLoadingIndicator />
  return <primitive object={preparedModel} onPointerDown={onPointerDown} />
}

function ModelLoadingIndicator() {
  return (
    <mesh>
      <sphereGeometry args={[0.3, 16, 16]} />
      <meshStandardMaterial color="#eab308" />
    </mesh>
  )
}

function ModelRenderer({
  url,
  ext,
  color,
  file,
  onPointerDown
}: {
  url: string
  ext?: string | null
  color?: string
  file?: File | null
  onPointerDown: (e: any) => void
}) {
  const normalizedExt = normalizeModelExt(ext, url)
  const renderUrl = getRenderableModelUrl(url)

  console.log("ModelRenderer", { originalExt: ext, normalizedExt, hasFile: !!file, urlPrefix: url?.substring(0, 50) })

  switch (normalizedExt) {
    case "gltf":
      console.log("Usando GLBModel (GLTF)")
      return (
        <ModelErrorBoundary>
          <GLBModel
            file={file}
            url={renderUrl}
            onPointerDown={onPointerDown}
          />
        </ModelErrorBoundary>
      )

    case "obj":
      console.log("Usando OBJModel")
      return (
        <ModelErrorBoundary>
          <OBJModel
            url={renderUrl}
            file={file}
            onPointerDown={onPointerDown}
          />
        </ModelErrorBoundary>
      )

    case "stl":
      console.log("Usando STLModel")
      return (
        <ModelErrorBoundary>
          <STLModel
            url={renderUrl}
            file={file}
            color={color || '#2563eb'}
            onPointerDown={onPointerDown}
          />
        </ModelErrorBoundary>
      )

    default:
      console.error("Extensión 3D no reconocida", { original: ext, normalized: normalizedExt, url })
      return (
        <Html center>
          <div className="rounded bg-red-600 px-3 py-2 text-xs text-white">
            Formato 3D no reconocido: {ext || 'sin extensión'}
          </div>
        </Html>
      )
  }
}

function SceneItem3D({ item, selected, mode, onSelect, onEndTransform }: {
  item: SceneItem; selected: boolean; mode: ToolMode
  onSelect: () => void
  onEndTransform: (id: string, pos: [number, number, number], rot: [number, number, number], scl: [number, number, number]) => void
}) {
  const transformRootRef = useRef<Group>(null)

  const color = item.color || '#2563eb'
  const showGizmo = selected && mode !== 'select'

  const transformMode =
    mode === "move" ? "translate"
    : mode === "rotate" ? "rotate"
    : mode === "scale" ? "scale"
    : "translate"

  const posKey = item.position.join(",")
  const rotKey = item.rotation.join(",")
  const sclKey = (item.scale ?? [1, 1, 1]).join(",")

  useLayoutEffect(() => {
    const root = transformRootRef.current
    if (!root) return

    root.position.fromArray(item.position)
    root.rotation.set(item.rotation[0], item.rotation[1], item.rotation[2])
    root.scale.fromArray(item.scale ?? [1, 1, 1])

    root.updateMatrix()
    root.updateMatrixWorld(true)
  }, [item.id, posKey, rotKey, sclKey])

  const syncTransform = useCallback(() => {
    const root = transformRootRef.current
    if (!root) return

    root.updateMatrix()
    root.updateMatrixWorld(true)

    const position: [number, number, number] = [root.position.x, root.position.y, root.position.z]
    const rotation: [number, number, number] = [root.rotation.x, root.rotation.y, root.rotation.z]
    const scale: [number, number, number] = [root.scale.x, root.scale.y, root.scale.z]

    onEndTransform(item.id, position, rotation, scale)
  }, [item.id, onEndTransform])

  if (!item.visible) return null

  const labelHeight = item.modelUrl ? 3.3 : 1.2
  const labelPos: [number, number, number] = [0, labelHeight, 0]

  return (
    <group ref={transformRootRef}>
      {item.modelUrl ? (
        <Suspense fallback={<ModelLoadingIndicator />}>
          <ModelRenderer url={item.modelUrl} ext={item.modelExt} file={item.modelFile}
            color={color}
            onPointerDown={(e) => { e.stopPropagation(); onSelect() }} />
        </Suspense>
      ) : (
        (() => {
          const geo = item.type === 'sensor' ? 'sensor' : (item.modelType || '')
          let geometry: React.ReactNode
          switch (geo) {
            case 'motor': geometry = <cylinderGeometry args={[0.6, 0.6, 1, 16]} />; break
            case 'pump': geometry = <sphereGeometry args={[0.6, 32, 32]} />; break
            case 'tank': geometry = <cylinderGeometry args={[0.7, 0.7, 1.3, 16]} />; break
            case 'pipe': geometry = <cylinderGeometry args={[0.25, 0.25, 1.5, 12]} />; break
            case 'panel': geometry = <boxGeometry args={[0.8, 1.2, 0.3]} />; break
            case 'conveyor': geometry = <boxGeometry args={[1.6, 0.4, 0.6]} />; break
            case 'machine': geometry = <boxGeometry args={[1.2, 1, 0.8]} />; break
            case 'sensor': geometry = <boxGeometry args={[0.5, 0.5, 0.5]} />; break
            default: geometry = <boxGeometry args={[1, 1, 1]} />
          }
          return (
            <mesh onPointerDown={(e) => { e.stopPropagation(); onSelect() }}>
              {geometry}
              <meshStandardMaterial color={color} />
            </mesh>
          )
        })()
      )}

      {showGizmo && transformRootRef.current && (
        <TransformControls
          object={transformRootRef.current}
          mode={transformMode}
          onMouseUp={() => syncTransform()}
        />
      )}

      <Html position={labelPos} center>
        {selected && <div className="rounded border bg-primary-500/80 px-1.5 py-0.5 text-[10px] text-white shadow whitespace-nowrap">{item.name}</div>}
      </Html>
    </group>
  )
}

function QuickAngleBtn({ deg, onClick }: { deg: number; onClick: (d: number) => void }) {
  return (
    <button onClick={() => onClick(deg * Math.PI / 180)}
      className="rounded border px-2 py-1 text-[10px] font-mono text-gray-600 hover:bg-gray-100 hover:text-gray-800 transition-colors">
      {deg}°
    </button>
  )
}

interface DigitalTwinEntity {
  id: string; name: string; modelUrl?: string; asset?: { id: string; name: string; code: string };
  metadata?: { sceneItems?: SceneItem[]; position?: number[] }
}

export default function DigitalTwin() {
  const [twins, setTwins] = useState<DigitalTwinEntity[]>([])
  const [sceneItems, setSceneItems] = useState<SceneItem[]>([])
  const sceneItemsRef = useRef<SceneItem[]>(sceneItems)
  useEffect(() => { sceneItemsRef.current = sceneItems }, [sceneItems])
  const [selectedId, setSelectedIdState] = useState<string | null>(null)
  const selectedIdRef = useRef<string | null>(null)
  const [mode, setMode] = useState<ToolMode>('select')
  const [showLibrary, setShowLibrary] = useState(true)
  const [showProperties, setShowProperties] = useState(true)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [libraryTab, setLibraryTab] = useState<'objects' | 'sensors' | 'upload'>('objects')
  const [searchLib, setSearchLib] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const orbitRef = useRef<any>(null)
  const [autoRotate, setAutoRotate] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [viewMode, setViewMode] = useState<'3d' | 'top'>('3d')
  const [history, setHistory] = useState<SceneItem[][]>([])
  const [historyIdx, setHistoryIdx] = useState(-1)
  const [predefinedObjects, setPredefinedObjects] = useState(loadPredefined)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>()

  const selectedItem = selectedId ? sceneItems.find(i => i.id === selectedId) || null : null

  const selectObject = useCallback((id: string | null) => {
    selectedIdRef.current = id
    setSelectedIdState(id)
  }, [])

  const pushHistory = useCallback((items: SceneItem[]) => {
    setHistory(prev => {
      const h = prev.slice(0, historyIdx + 1)
      h.push(JSON.parse(JSON.stringify(items)))
      if (h.length > 50) h.shift()
      return h
    })
    setHistoryIdx(prev => Math.min(prev + 1, 49))
  }, [historyIdx])

  const loadTwins = useCallback(async () => {
    try {
      const data = await digitalTwinService.list()
      setTwins(data || [])
    } catch {} finally { setLoading(false) }
  }, [])

  useEffect(() => { loadTwins() }, [loadTwins])

  const loadScene = useCallback(async () => {
    try {
      const storedId = localStorage.getItem('dt_twinId')
      if (storedId) {
        const twin = await digitalTwinService.getById(storedId)
        if (twin?.metadata?.sceneItems) {
          setSceneItems(twin.metadata.sceneItems)
          return
        }
      }
      const data = await digitalTwinService.list()
      if (data && data.length > 0) {
        const allItems: SceneItem[] = []
        for (const twin of data) {
          if (twin.metadata?.sceneItems) {
            allItems.push(...twin.metadata.sceneItems)
          }
        }
        setSceneItems(prev => {
          const merged = allItems.length > 0 ? allItems : prev
          if (selectedIdRef.current && !merged.find(i => i.id === selectedIdRef.current)) {
            selectObject(null)
          }
          return merged
        })
      }
    } catch {}
  }, [])

  useEffect(() => { loadScene() }, [loadScene])

  const removeSceneItem = useCallback((id: string) => {
    setSceneItems(prev => {
      const removed = prev.find(i => i.id === id)
      if (removed?.modelUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(removed.modelUrl)
      }
      if (!prev.find(i => i.id === id)) return prev
      const n = prev.filter(i => i.id !== id)
      pushHistory(n)
      return n
    })
    if (selectedIdRef.current === id) selectObject(null)
  }, [pushHistory])

  const deletePredefinedObject = useCallback((id: string) => {
    setPredefinedObjects(prev => {
      const n = prev.filter(o => o.id !== id)
      savePredefined(n)
      return n
    })
  }, [])

  const restorePredefinedDefaults = useCallback(() => {
    setPredefinedObjects(DEFAULT_PREDEFINED)
    savePredefined(DEFAULT_PREDEFINED)
  }, [])

  const addSceneItem = useCallback((template: Partial<SceneItem>) => {
    const item: SceneItem = {
      id: genId(), type: 'object', name: 'Nuevo Objeto',
      modelType: 'machine', position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1],
      visible: true, locked: false, color: '#2563eb',
      ...template,
    }
    setSceneItems(prev => { const n = [...prev, item]; pushHistory(n); return n })
    selectObject(item.id)
  }, [pushHistory])

  const deleteSelectedObject = useCallback(() => {
    const id = selectedIdRef.current
    if (!id) return
    setSceneItems(prev => {
      if (!prev.find(i => i.id === id)) return prev
      const n = prev.filter(i => i.id !== id)
      pushHistory(n)
      return n
    })
    selectObject(null)
  }, [pushHistory])

  const duplicateSelected = useCallback(() => {
    if (!selectedItem) return
    const copy = { ...selectedItem, id: genId(), name: selectedItem.name + ' (copia)' }
    copy.position = [copy.position[0] + 1, copy.position[1], copy.position[2] + 1] as [number, number, number]
    setSceneItems(prev => { const n = [...prev, copy]; pushHistory(n); return n })
    selectObject(copy.id)
  }, [selectedItem, pushHistory])

  const updateItem = useCallback((id: string, changes: Partial<SceneItem>) => {
    setSceneItems(prev => {
      const n = prev.map(i => i.id === id ? { ...i, ...changes } as SceneItem : i)
      pushHistory(n)
      return n
    })
  }, [pushHistory])

  const handleEndTransform = useCallback((id: string, pos: [number, number, number], rot: [number, number, number], scl: [number, number, number]) => {
    setSceneItems((currentItems) =>
      currentItems.map((currentItem) =>
        currentItem.id === id
          ? { ...currentItem, position: [...pos] as [number, number, number], rotation: [...rot] as [number, number, number], scale: [...scl] as [number, number, number] }
          : currentItem
      )
    )
  }, [])

  const twinIdRef = useRef<string | null>(localStorage.getItem('dt_twinId'))

  const handleSave = useCallback(async () => {
    setSaveStatus('saving')

    let id = twinIdRef.current || (twins.length > 0 ? twins[0].id : null)

    if (!id) {
      try {
        const assets = await assetService.list()
        if (assets && assets.length > 0) {
          const created = await digitalTwinService.create({ name: 'Escena 3D', assetId: assets[0].id })
          id = created.id
          setTwins(prev => [...prev, created])
        } else {
          const created = await digitalTwinService.create({ name: 'Escena 3D' })
          id = created.id
          setTwins(prev => [...prev, created])
        }
        twinIdRef.current = id
        localStorage.setItem('dt_twinId', id)
      } catch (err) {
        console.error('Failed to create twin:', err)
        setSaveStatus('error')
        clearTimeout(saveTimerRef.current)
        saveTimerRef.current = setTimeout(() => setSaveStatus('idle'), 3000)
        return
      }
    }

    try {
      const items = await uploadPendingModelFiles(id, sceneItemsRef.current)
      sceneItemsRef.current = items
      setSceneItems(items)

      const payload = { metadata: { sceneItems: items.map(serializeSceneItem) } }
      await digitalTwinService.update(id, payload)
      setSaveStatus('saved')
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => setSaveStatus('idle'), 3000)
    } catch (err) {
      console.error('Save failed:', err)
      setSaveStatus('error')
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => setSaveStatus('idle'), 3000)
    }
  }, [twins])

  const undo = useCallback(() => {
    if (historyIdx > 0) {
      setHistoryIdx(historyIdx - 1)
      setSceneItems(history[historyIdx - 1])
      selectObject(null)
    }
  }, [history, historyIdx])

  const redo = useCallback(() => {
    if (historyIdx < history.length - 1) {
      setHistoryIdx(historyIdx + 1)
      setSceneItems(history[historyIdx + 1])
      selectObject(null)
    }
  }, [history, historyIdx])

  const handleModelUpload = useCallback(async (file: File) => {
    setUploadError(null)
    const ext = file.name.split('.').pop()?.toLowerCase()
    const normalizedExtension = normalizeModelExt(ext)
    if (!normalizedExtension) {
      setUploadError('Formato no compatible. Use GLB, GLTF, STL u OBJ.')
      return
    }
    if (file.size > 50 * 1024 * 1024) {
      setUploadError('El archivo supera 50 MB.')
      return
    }
    console.log("Uploading model:", { name: file.name, size: file.size, type: file.type, ext, normalizedExtension })
    setUploading(true)
    try {
      const blobUrl = URL.createObjectURL(file)
      const item: SceneItem = {
        id: genId(), type: 'object',
        name: file.name.replace(/\.[^/.]+$/, ''),
        modelUrl: blobUrl,
        modelExt: normalizedExtension,
        modelFile: file,
        position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1],
        visible: true, locked: false, color: '#2563eb',
      }
      setSceneItems(prev => { const n = [...prev, item]; pushHistory(n); return n })
      selectObject(item.id)
    } catch (err) {
      setUploadError('Error al cargar el archivo.')
      console.error(err)
    } finally { setUploading(false) }
  }, [pushHistory])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const et = e.target as HTMLElement
      if (et.tagName === 'INPUT' || et.tagName === 'TEXTAREA' || et.isContentEditable) return
      if (e.key === 'Delete' || e.key === 'Supr' || e.key === 'Backspace') { deleteSelectedObject() }
      if (e.key === 'Escape') { selectObject(null) }
      if (e.key === 'z' && (e.ctrlKey || e.metaKey) && e.shiftKey) { e.preventDefault(); redo() }
      if (e.key === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey) { e.preventDefault(); undo() }
      if (e.key === 's' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); handleSave() }
      if (e.key === 'd' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); duplicateSelected() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [deleteSelectedObject, undo, redo, handleSave, duplicateSelected])

  const filteredLibrary = useMemo(() => {
    const q = searchLib.toLowerCase()
    return predefinedObjects.filter(o => o.name.toLowerCase().includes(q))
  }, [searchLib, predefinedObjects])

  const sensorTypeIcons: Record<string, React.ReactNode> = useMemo(() => ({
    thermometer: <Thermometer className="h-3 w-3" />,
    gauge: <Gauge className="h-3 w-3" />,
    activity: <Activity className="h-3 w-3" />,
    droplet: <Droplets className="h-3 w-3" />,
    zap: <Zap className="h-3 w-3" />,
    waves: <Waves className="h-3 w-3" />,
    wind: <Wind className="h-3 w-3" />,
    radio: <Radio className="h-3 w-3" />,
  }), [])

  const getSensorIcon = useCallback((t: string) => {
    const found = SENSOR_TYPES.find(s => s.type === t)
    const key = (found?.icon || 'Activity').toLowerCase()
    return sensorTypeIcons[key] || <Activity className="h-3 w-3" />
  }, [sensorTypeIcons])

  return (
    <div className="flex h-[calc(100vh-5rem)] flex-col">
      <input ref={fileInputRef} type="file" accept=".glb,.gltf,.stl,.obj" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleModelUpload(f); e.target.value = '' }} />

      {/* Toolbar */}
      <div className="flex items-center gap-1.5 border-b bg-white px-4 py-2">
        <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-0.5">
          {(['select', 'move', 'rotate', 'scale'] as ToolMode[]).map(t => (
            <button key={t} onClick={() => setMode(t)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${mode === t ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {t === 'select' ? <><MousePointer2 className="mr-1 inline h-3 w-3" />Seleccionar</> : t === 'move' ? <><Move className="mr-1 inline h-3 w-3" />Mover</> : t === 'rotate' ? <><RotateCw className="mr-1 inline h-3 w-3" />Rotar</> : <><Maximize2 className="mr-1 inline h-3 w-3" />Escalar</>}
            </button>
          ))}
        </div>

        <div className="mx-2 h-6 w-px bg-gray-200" />

        <button onClick={duplicateSelected} disabled={!selectedItem} className="toolbar-btn" title="Duplicar (Ctrl+D)">
          <Copy className="h-4 w-4" />
        </button>
        <button onClick={deleteSelectedObject} disabled={!selectedItem} className="toolbar-btn text-danger-600 hover:bg-danger-50" title="Eliminar (Supr)">
          <Trash2 className="h-4 w-4" />
        </button>

        <div className="mx-2 h-6 w-px bg-gray-200" />

        <button onClick={undo} disabled={historyIdx <= 0} className="toolbar-btn" title="Deshacer (Ctrl+Z)">
          <Undo2 className="h-4 w-4" />
        </button>
        <button onClick={redo} disabled={historyIdx >= history.length - 1} className="toolbar-btn" title="Rehacer (Ctrl+Shift+Z)">
          <Redo2 className="h-4 w-4" />
        </button>

        <div className="mx-2 h-6 w-px bg-gray-200" />

        <button onClick={() => setViewMode(viewMode === '3d' ? 'top' : '3d')} className="toolbar-btn" title="Cambiar vista">
          {viewMode === '3d' ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          <span className="ml-1 text-[10px]">{viewMode === '3d' ? '2D' : '3D'}</span>
        </button>
        <button onClick={() => { setAutoRotate(!autoRotate) }} className={`toolbar-btn ${autoRotate ? 'bg-primary-50 text-primary-700' : ''}`}>
          <RotateCw className="h-4 w-4" />
        </button>
        <button onClick={handleSave} disabled={saveStatus === 'saving'}
          className={`toolbar-btn ${saveStatus === 'saved' ? 'bg-success-50 text-success-700' : saveStatus === 'error' ? 'bg-danger-50 text-danger-700' : 'text-success-600 hover:bg-success-50'}`}
          title="Guardar (Ctrl+S)">
          {saveStatus === 'saving' ? (
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
          ) : <Save className="h-4 w-4" />}
          <span className="ml-1 text-[10px]">{
            saveStatus === 'saving' ? 'Guardando...' :
            saveStatus === 'saved' ? 'Guardado' :
            saveStatus === 'error' ? 'Error' : 'Guardar'
          }</span>
        </button>

        <div className="flex-1" />

        <button onClick={() => setShowLibrary(!showLibrary)} className={`toolbar-btn ${showLibrary ? 'bg-primary-50 text-primary-700' : ''}`}>
          <Layers className="h-4 w-4" />
          <span className="ml-1 text-[10px]">Objetos</span>
        </button>
        <button onClick={() => setShowProperties(!showProperties)} className={`toolbar-btn ${showProperties ? 'bg-primary-50 text-primary-700' : ''}`}>
          <Settings className="h-4 w-4" />
          <span className="ml-1 text-[10px]">Propiedades</span>
        </button>
        <button onClick={() => { setRefreshKey(k => k + 1) }} className="toolbar-btn">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Library */}
        {showLibrary && (
          <div className="w-64 shrink-0 border-r bg-white overflow-y-auto">
            <div className="border-b p-3">
              <div className="flex items-center gap-2 rounded-lg border px-2">
                <Search className="h-3.5 w-3.5 text-gray-400" />
                <input type="text" placeholder="Buscar objetos..." value={searchLib} onChange={e => setSearchLib(e.target.value)} className="w-full border-0 py-2 text-xs outline-none" />
              </div>
            </div>
            <div className="flex border-b">
              <button onClick={() => setLibraryTab('objects')} className={`flex-1 px-3 py-2 text-xs font-medium ${libraryTab === 'objects' ? 'border-b-2 border-primary-500 text-primary-700' : 'text-gray-500 hover:text-gray-700'}`}>Objetos</button>
              <button onClick={() => setLibraryTab('sensors')} className={`flex-1 px-3 py-2 text-xs font-medium ${libraryTab === 'sensors' ? 'border-b-2 border-primary-500 text-primary-700' : 'text-gray-500 hover:text-gray-700'}`}>Sensores</button>
              <button onClick={() => setLibraryTab('upload')} className={`flex-1 px-3 py-2 text-xs font-medium ${libraryTab === 'upload' ? 'border-b-2 border-primary-500 text-primary-700' : 'text-gray-500 hover:text-gray-700'}`}>Cargar</button>
            </div>

            {libraryTab === 'objects' && (
              <div className="p-2 space-y-1">
                {sceneItems.length > 0 && (
                  <>
                    <p className="px-2 py-1 text-[10px] font-medium uppercase text-gray-400">Objetos en escena</p>
                    {sceneItems.map(item => (
                      <div key={item.id} className="group relative">
                        <div className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 pr-8 text-left text-xs ${selectedId === item.id ? 'bg-primary-50 ring-1 ring-primary-200' : ''}`}>
                          <div style={{ backgroundColor: (item.color || '#2563eb') + '20' }} className="flex h-8 w-8 items-center justify-center rounded-lg">
                            <div style={{ backgroundColor: item.color || '#2563eb' }} className="h-4 w-4 rounded" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-800 truncate">{item.name}</p>
                            <p className="text-[10px] text-gray-400">{item.type === 'sensor' ? (item.sensorType || 'Sensor') : (item.modelType || 'Objeto')}</p>
                          </div>
                          <button onClick={() => removeSceneItem(item.id)}
                            className="rounded p-1 text-gray-300 opacity-0 transition-opacity hover:bg-danger-50 hover:text-danger-600 group-hover:opacity-100"
                            title="Eliminar">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                    <div className="my-2 border-t border-gray-100" />
                  </>
                )}
                <div className="flex items-center justify-between px-2 py-1">
                  <p className="text-[10px] font-medium uppercase text-gray-400">Objetos predefinidos</p>
                  {predefinedObjects.length < DEFAULT_PREDEFINED.length && (
                    <button onClick={restorePredefinedDefaults}
                      className="text-[9px] text-primary-600 hover:text-primary-700 hover:underline">
                      Restaurar
                    </button>
                  )}
                </div>
                {filteredLibrary.map(obj => (
                  <div key={obj.id} className="group relative">
                    <button onClick={() => addSceneItem({ name: obj.name, modelType: obj.modelType, color: obj.color, category: obj.category, position: [Math.random() * 8 - 4, 0, Math.random() * 8 - 4] })}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 pr-8 text-left text-xs hover:bg-gray-50 transition-colors">
                      <div style={{ backgroundColor: obj.color + '20' }} className="flex h-8 w-8 items-center justify-center rounded-lg">
                        <div style={{ backgroundColor: obj.color }} className="h-4 w-4 rounded" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{obj.name}</p>
                        <p className="text-[10px] text-gray-400">{obj.category}</p>
                      </div>
                    </button>
                    <button onClick={() => deletePredefinedObject(obj.id)}
                      className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-1 text-gray-300 opacity-0 transition-opacity hover:bg-danger-50 hover:text-danger-600 group-hover:opacity-100"
                      title="Eliminar de la lista">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
                {twins.filter(t => t.modelUrl).length > 0 && (
                  <>
                    <p className="mt-3 px-2 py-1 text-[10px] font-medium uppercase text-gray-400">Tus gemelos digitales</p>
                    {twins.filter(t => t.modelUrl).map(t => (
                      <button key={t.id} onClick={() => addSceneItem({ name: t.name, position: [Math.random() * 4 - 2, 0, Math.random() * 4 - 2] })}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-xs hover:bg-gray-50 transition-colors">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100">
                          <Box className="h-4 w-4 text-gray-500" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{t.name}</p>
                          <p className="text-[10px] text-gray-400">{t.asset?.name || 'Modelo 3D'}</p>
                        </div>
                        <Plus className="ml-auto h-3.5 w-3.5 text-gray-300" />
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}

            {libraryTab === 'sensors' && (
              <div className="p-2 space-y-1">
                <p className="px-2 py-1 text-[10px] font-medium uppercase text-gray-400">Tipos de sensores</p>
                  {SENSOR_TYPES.map(st => (
                    <button key={st.type} onClick={() => addSceneItem({
                      type: 'sensor', name: `Sensor ${st.label}`, sensorType: st.type,
                      category: 'sensor', color: st.color, scale: [0.8, 0.8, 0.8],
                      position: [Math.random() * 8 - 4, 0.5, Math.random() * 8 - 4],
                      dataSource: { deviceId: '', variableId: '', unit: st.unit, topic: '' },
                    })}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-xs hover:bg-gray-50 transition-colors">
                    <div style={{ backgroundColor: st.color + '20' }} className="flex h-8 w-8 items-center justify-center rounded-lg">
                      {getSensorIcon(st.type)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">{st.label}</p>
                      <p className="text-[10px] text-gray-400">{st.unit}</p>
                    </div>
                    <Plus className="ml-auto h-3.5 w-3.5 text-gray-300" />
                  </button>
                ))}
              </div>
            )}

            {libraryTab === 'upload' && (
              <div className="p-4">
                <div className="rounded-lg border-2 border-dashed border-gray-200 p-6 text-center hover:border-primary-300 transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}>
                  <Upload className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                  <p className="text-xs font-medium text-gray-600">Cargar modelo 3D</p>
                  <p className="mt-1 text-[10px] text-gray-400">GLB, GLTF, STL, OBJ (máx 50 MB)</p>
                </div>
                {uploading && <p className="mt-2 text-center text-xs text-primary-600">Cargando...</p>}
                {uploadError && <p className="mt-2 text-center text-xs text-danger-600">{uploadError}</p>}
              </div>
            )}
          </div>
        )}

        {/* Center - 3D Scene */}
        <div className="flex-1 bg-gray-50 relative">
          <Canvas key={refreshKey} camera={{ position: viewMode === 'top' ? [0, 15, 0.01] : [8, 6, 8], fov: 45, near: 0.1, far: 100 }}
            onPointerMissed={() => selectObject(null)}>
            <Suspense fallback={<LoadingSpinner />}>
              <ambientLight intensity={0.5} />
              <directionalLight position={[10, 10, 10]} intensity={0.8} />
              <directionalLight position={[-5, -5, -5]} intensity={0.3} />
              <gridHelper args={[20, 20, '#888', '#444']} />
              <axesHelper args={[3]} />
              <OrbitControls ref={orbitRef} autoRotate={autoRotate} autoRotateSpeed={1.5}
                enableDamping dampingFactor={0.1} enabled={mode === 'select'} />

              {sceneItems.map(item => (
                <SceneItem3D key={item.id} item={item} selected={selectedId === item.id}
                  mode={mode}
                  onSelect={() => selectObject(item.id)}
                  onEndTransform={handleEndTransform} />
              ))}

              {sceneItems.length === 0 && (
                <group>
                  <mesh rotation={[0, 0, 0]}>
                    <boxGeometry args={[1, 1, 1]} />
                    <meshStandardMaterial color="#dc2626" wireframe />
                  </mesh>
                  <Text position={[0, 2, 0]} fontSize={0.4} color="#9ca3af" anchorX="center">Agrega objetos desde el panel izquierdo</Text>
                </group>
              )}
            </Suspense>
          </Canvas>

          {/* Floating sensor tooltip */}
          {selectedItem?.type === 'sensor' && selectedItem.lastValue !== undefined && (
            <div className="absolute bottom-4 left-4 rounded-lg border bg-white/90 p-3 shadow-lg backdrop-blur-sm">
              <p className="text-xs font-medium text-gray-700">{selectedItem.name}</p>
              <p className="text-lg font-bold text-gray-900">{selectedItem.lastValue} <span className="text-xs font-normal text-gray-500">{selectedItem.dataSource?.unit || ''}</span></p>
              <div className="mt-1 flex items-center gap-2 text-[10px]">
                <span className={`rounded-full px-1.5 py-0.5 font-medium ${
                  selectedItem.status === 'critical' ? 'bg-danger-100 text-danger-700' :
                  selectedItem.status === 'warning' ? 'bg-warning-100 text-warning-700' :
                  selectedItem.status === 'disconnected' ? 'bg-gray-100 text-gray-500' :
                  'bg-success-100 text-success-700'
                }`}>{selectedItem.status || 'normal'}</span>
                {selectedItem.lastValueAt && <span className="text-gray-400">{new Date(selectedItem.lastValueAt).toLocaleTimeString()}</span>}
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - Properties */}
        {showProperties && (
          <div className="w-72 shrink-0 border-l bg-white overflow-y-auto">
            {selectedItem ? (
              <div className="p-4 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{selectedItem.name}</p>
                    <p className="text-[10px] text-gray-400 uppercase">{selectedItem.type === 'sensor' ? (selectedItem.sensorType || 'Sensor') : (selectedItem.modelType || 'Objeto')}</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => updateItem(selectedItem.id, { visible: !selectedItem.visible })} className={`rounded p-1.5 ${selectedItem.visible ? 'text-gray-500 hover:bg-gray-100' : 'text-gray-300'}`}>
                      {selectedItem.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    </button>
                    <button onClick={() => updateItem(selectedItem.id, { locked: !selectedItem.locked })} className={`rounded p-1.5 ${selectedItem.locked ? 'text-danger-500' : 'text-gray-500 hover:bg-gray-100'}`}>
                      {selectedItem.locked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-medium uppercase text-gray-400">Nombre</label>
                  <input type="text" value={selectedItem.name} onChange={e => updateItem(selectedItem.id, { name: e.target.value })}
                    className="mt-1 w-full rounded border px-2 py-1.5 text-xs" />
                </div>

                <div>
                  <p className="mb-1.5 text-[10px] font-medium uppercase text-gray-400">Posición</p>
                  <div className="grid grid-cols-3 gap-2">
                    {(['X', 'Y', 'Z'] as const).map((a, i) => (
                      <div key={a}>
                        <label className="text-[9px] font-mono text-gray-400">{a}</label>
                        <input type="number" step={0.1} value={Number(selectedItem.position[i].toFixed(2))}
                          onChange={e => {
                            const p = [...selectedItem.position] as [number, number, number]
                            p[i] = parseFloat(e.target.value) || 0
                            updateItem(selectedItem.id, { position: p })
                          }}
                          className="w-full rounded border px-2 py-1 text-xs font-mono" />
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-1.5 text-[10px] font-medium uppercase text-gray-400">Rotación</p>
                  <div className="grid grid-cols-3 gap-2">
                    {(['X', 'Y', 'Z'] as const).map((a, i) => (
                      <div key={a}>
                        <label className="text-[9px] font-mono text-gray-400">{a}</label>
                        <input type="number" step={0.1} value={Number((selectedItem.rotation[i] * 180 / Math.PI).toFixed(1))}
                          onChange={e => {
                            const r = [...selectedItem.rotation] as [number, number, number]
                            r[i] = (parseFloat(e.target.value) || 0) * Math.PI / 180
                            updateItem(selectedItem.id, { rotation: r })
                          }}
                          className="w-full rounded border px-2 py-1 text-xs font-mono" />
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <span className="text-[9px] text-gray-400 mr-1 self-center">Girar:</span>
                    {[15, 45, 90, 180].map(d => (
                      <QuickAngleBtn key={d} deg={d} onClick={deg => {
                        const r = [...selectedItem.rotation] as [number, number, number]
                        r[1] += deg
                        updateItem(selectedItem.id, { rotation: r })
                      }} />
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-1.5 text-[10px] font-medium uppercase text-gray-400">Escala</p>
                  <div className="grid grid-cols-3 gap-2">
                    {(['X', 'Y', 'Z'] as const).map((a, i) => (
                      <div key={a}>
                        <label className="text-[9px] font-mono text-gray-400">{a}</label>
                        <input type="number" step={0.1} min={0.1} value={Number(selectedItem.scale[i].toFixed(2))}
                          onChange={e => {
                            const s = [...selectedItem.scale] as [number, number, number]
                            s[i] = parseFloat(e.target.value) || 1
                            updateItem(selectedItem.id, { scale: s })
                          }}
                          className="w-full rounded border px-2 py-1 text-xs font-mono" />
                      </div>
                    ))}
                  </div>
                </div>

                {selectedItem.type === 'sensor' && (
                  <>
                    <div>
                      <p className="mb-1.5 text-[10px] font-medium uppercase text-gray-400">Tipo de sensor</p>
                      <select value={selectedItem.sensorType} onChange={e => updateItem(selectedItem.id, { sensorType: e.target.value })}
                        className="w-full rounded border px-2 py-1.5 text-xs">
                        {SENSOR_TYPES.map(st => <option key={st.type} value={st.type}>{st.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <p className="mb-1.5 text-[10px] font-medium uppercase text-gray-400">Fuente de datos</p>
                      <div className="space-y-2 rounded-lg border p-2">
                        <div>
                          <label className="text-[9px] text-gray-400">Dispositivo</label>
                          <input type="text" value={selectedItem.dataSource?.deviceId || ''}
                            onChange={e => updateItem(selectedItem.id, { dataSource: { ...selectedItem.dataSource || {} as DataSource, deviceId: e.target.value } })}
                            className="w-full rounded border px-2 py-1 text-xs font-mono" placeholder="esp32-001" />
                        </div>
                        <div>
                          <label className="text-[9px] text-gray-400">Variable</label>
                          <input type="text" value={selectedItem.dataSource?.variableId || ''}
                            onChange={e => updateItem(selectedItem.id, { dataSource: { ...selectedItem.dataSource || {} as DataSource, variableId: e.target.value } })}
                            className="w-full rounded border px-2 py-1 text-xs font-mono" placeholder="temperature" />
                        </div>
                        <div>
                          <label className="text-[9px] text-gray-400">Unidad</label>
                          <input type="text" value={selectedItem.dataSource?.unit || ''}
                            onChange={e => updateItem(selectedItem.id, { dataSource: { ...selectedItem.dataSource || {} as DataSource, unit: e.target.value } })}
                            className="w-full rounded border px-2 py-1 text-xs font-mono" placeholder="°C" />
                        </div>
                        <div>
                          <label className="text-[9px] text-gray-400">Tópico MQTT</label>
                          <input type="text" value={selectedItem.dataSource?.topic || ''}
                            onChange={e => updateItem(selectedItem.id, { dataSource: { ...selectedItem.dataSource || {} as DataSource, topic: e.target.value } })}
                            className="w-full rounded border px-2 py-1 text-xs font-mono" placeholder="planta/motor01/temperatura" />
                        </div>
                      </div>
                    </div>
                    <div>
                      <p className="mb-1.5 text-[10px] font-medium uppercase text-gray-400">Límites de alerta</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] text-warning-600">Advertencia</label>
                          <input type="number" value={selectedItem.thresholds?.warning ?? ''}
                            onChange={e => updateItem(selectedItem.id, { thresholds: { ...selectedItem.thresholds || {} as Thresholds, warning: parseFloat(e.target.value) || 0 } })}
                            className="w-full rounded border border-warning-200 px-2 py-1 text-xs font-mono" />
                        </div>
                        <div>
                          <label className="text-[9px] text-danger-600">Alarma</label>
                          <input type="number" value={selectedItem.thresholds?.alarm ?? ''}
                            onChange={e => updateItem(selectedItem.id, { thresholds: { ...selectedItem.thresholds || {} as Thresholds, alarm: parseFloat(e.target.value) || 0 } })}
                            className="w-full rounded border border-danger-200 px-2 py-1 text-xs font-mono" />
                        </div>
                      </div>
                    </div>
                    {selectedItem.lastValue !== undefined && (
                      <div className="rounded-lg border p-3">
                        <p className="text-[10px] font-medium uppercase text-gray-400">Último valor</p>
                        <p className="mt-1 text-xl font-bold text-gray-900">{selectedItem.lastValue} <span className="text-sm font-normal text-gray-500">{selectedItem.dataSource?.unit || ''}</span></p>
                        {selectedItem.lastValueAt && <p className="text-[10px] text-gray-400">Actualizado: {new Date(selectedItem.lastValueAt).toLocaleString()}</p>}
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <MousePointer2 className="mb-2 h-8 w-8 text-gray-300" />
                <p className="text-sm text-gray-500">Selecciona un objeto</p>
                <p className="text-xs text-gray-400 mt-1">Haz clic en un objeto en la escena para editar sus propiedades</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between border-t bg-white px-4 py-1.5">
        <div className="flex items-center gap-4 text-[10px] text-gray-400">
          <span>{sceneItems.length} objetos en escena</span>
          {selectedItem && (
            <span className="font-mono">
              X:{selectedItem.position[0].toFixed(1)} Y:{selectedItem.position[1].toFixed(1)} Z:{selectedItem.position[2].toFixed(1)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-[10px]">
          <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-success-500" />Conectado</span>
          <span className="text-gray-300">|</span>
          <button onClick={handleSave} className="text-primary-600 hover:underline">Guardar escena</button>
        </div>
      </div>
    </div>
  )
}
