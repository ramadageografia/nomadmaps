import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
} from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import { Festival } from '../types';
import { useMemo } from 'react';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
);

interface AnalyticsProps {
  festivals: Festival[];
}

export default function Analytics({ festivals }: AnalyticsProps) {
  const continentData = useMemo(() => {
    const counts: Record<string, number> = {};
    festivals.forEach(f => {
      counts[f.continente] = (counts[f.continente] || 0) + 1;
    });
    return {
      labels: Object.keys(counts),
      datasets: [
        {
          data: Object.values(counts),
          backgroundColor: [
            'rgba(139, 92, 246, 0.6)',
            'rgba(217, 70, 239, 0.6)',
            'rgba(34, 211, 238, 0.6)',
            'rgba(0, 255, 0, 0.6)',
            'rgba(245, 158, 11, 0.6)',
          ],
          borderColor: [
            '#8b5cf6',
            '#d946ef',
            '#22d3ee',
            '#00ff00',
            '#f59e0b',
          ],
          borderWidth: 1,
        },
      ],
    };
  }, [festivals]);

  const genreData = useMemo(() => {
    const counts: Record<string, number> = {};
    festivals.forEach(f => {
      f.vertentes.forEach(v => {
        counts[v] = (counts[v] || 0) + 1;
      });
    });
    const sorted = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return {
      labels: sorted.map(s => s[0]),
      datasets: [
        {
          label: 'Festivais',
          data: sorted.map(s => s[1]),
          backgroundColor: 'rgba(34, 211, 238, 0.4)',
          borderColor: '#22d3ee',
          borderWidth: 1,
        },
      ],
    };
  }, [festivals]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: 'rgba(255, 255, 255, 0.7)',
          font: { size: 10 },
          padding: 10,
        },
      },
    },
    scales: {
      y: {
        ticks: { color: 'rgba(255, 255, 255, 0.5)', font: { size: 10 } },
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
      },
      x: {
        ticks: { color: 'rgba(255, 255, 255, 0.5)', font: { size: 10 } },
        grid: { display: false },
      },
    },
  };

  const pieOptions = {
    ...chartOptions,
    scales: undefined,
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-xs uppercase tracking-widest text-psy-cyan font-bold mb-4 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-psy-cyan shadow-[0_0_5px_#22d3ee]"></span>
          Festivais por Continente
        </h3>
        <div className="h-[200px]">
          <Pie data={continentData} options={pieOptions} />
        </div>
      </div>

      <div>
        <h3 className="text-xs uppercase tracking-widest text-psy-magenta font-bold mb-4 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-psy-magenta shadow-[0_0_5px_#d946ef]"></span>
          Top Subgêneros
        </h3>
        <div className="h-[200px]">
          <Bar data={genreData} options={chartOptions} />
        </div>
      </div>
    </div>
  );
}
