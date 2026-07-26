export default function TechnologyNetwork() {
  return (
    <svg className="absolute inset-0 h-full w-full opacity-[0.04] pointer-events-none"
      viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice"
      aria-hidden="true">
      <circle cx={120} cy={200} r={6} fill="#dc2626" />
      <circle cx={120} cy={200} r={2} fill="white" />

      <circle cx={280} cy={150} r={4} fill="#60a5fa" />
      <line x1={120} y1={200} x2={280} y2={150} stroke="#475569" strokeWidth={1} strokeDasharray="4 3" />

      <circle cx={350} cy={280} r={5} fill="#10b981" />
      <line x1={280} y1={150} x2={350} y2={280} stroke="#475569" strokeWidth={1} strokeDasharray="4 3" />
      <line x1={120} y1={200} x2={350} y2={280} stroke="#475569" strokeWidth={0.5} strokeDasharray="2 4" />

      <circle cx={500} cy={180} r={3} fill="#f59e0b" />
      <line x1={350} y1={280} x2={500} y2={180} stroke="#475569" strokeWidth={0.8} />

      <circle cx={620} cy={250} r={7} fill="#dc2626" opacity={0.6} />
      <line x1={500} y1={180} x2={620} y2={250} stroke="#475569" strokeWidth={0.5} strokeDasharray="3 3" />

      <circle cx={700} cy={160} r={4} fill="#60a5fa" />
      <line x1={620} y1={250} x2={700} y2={160} stroke="#475569" strokeWidth={0.7} />

      <circle cx={450} cy={380} r={8} fill="white" opacity={0.1} />
      <line x1={350} y1={280} x2={450} y2={380} stroke="#475569" strokeWidth={0.5} />
      <line x1={500} y1={180} x2={450} y2={380} stroke="#475569" strokeWidth={0.5} />

      <path d="M 120 200 Q 200 100 280 150" stroke="#dc2626" strokeWidth={0.5} fill="none" opacity={0.3} />
      <path d="M 350 280 Q 420 350 500 180" stroke="#10b981" strokeWidth={0.5} fill="none" opacity={0.3} />
      <path d="M 620 250 Q 660 300 700 160" stroke="#60a5fa" strokeWidth={0.5} fill="none" opacity={0.3} />

      <rect x={80} y={420} width={30} height={20} rx={3} fill="#dc2626" opacity={0.1} stroke="#dc2626" strokeWidth={0.5} />
      <rect x={250} y={440} width={30} height={20} rx={3} fill="#60a5fa" opacity={0.1} stroke="#60a5fa" strokeWidth={0.5} />
      <rect x={420} y={430} width={30} height={20} rx={3} fill="#10b981" opacity={0.1} stroke="#10b981" strokeWidth={0.5} />
      <rect x={580} y={450} width={30} height={20} rx={3} fill="#f59e0b" opacity={0.1} stroke="#f59e0b" strokeWidth={0.5} />

      <line x1={95} y1={420} x2={120} y2={200} stroke="#475569" strokeWidth={0.5} strokeDasharray="2 3" />
      <line x1={265} y1={440} x2={280} y2={150} stroke="#475569" strokeWidth={0.5} strokeDasharray="2 3" />
      <line x1={435} y1={430} x2={350} y2={280} stroke="#475569" strokeWidth={0.5} strokeDasharray="2 3" />
      <line x1={595} y1={450} x2={620} y2={250} stroke="#475569" strokeWidth={0.5} strokeDasharray="2 3" />

      <line x1={95} y1={440} x2={95} y2={520} stroke="#dc2626" strokeWidth={0.5} strokeDasharray="3 3" />
      <line x1={265} y1={460} x2={265} y2={520} stroke="#60a5fa" strokeWidth={0.5} strokeDasharray="3 3" />
      <line x1={435} y1={450} x2={435} y2={520} stroke="#10b981" strokeWidth={0.5} strokeDasharray="3 3" />
      <line x1={595} y1={470} x2={595} y2={520} stroke="#f59e0b" strokeWidth={0.5} strokeDasharray="3 3" />

      <path d="M 40 520 L 760 520" stroke="#475569" strokeWidth={1} />
      <path d="M 40 530 L 760 530" stroke="#475569" strokeWidth={0.5} strokeDasharray="6 4" />

      <path d="M 400 520 Q 420 540 440 530" stroke="#60a5fa" strokeWidth={0.5} fill="none" opacity={0.4} />
      <path d="M 440 530 Q 460 550 480 540" stroke="#60a5fa" strokeWidth={0.5} fill="none" opacity={0.3} />
      <path d="M 480 540 Q 500 560 520 545" stroke="#60a5fa" strokeWidth={0.5} fill="none" opacity={0.2} />
    </svg>
  )
}
