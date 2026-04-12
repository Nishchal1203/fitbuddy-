"use client";

import React, { useState, useEffect } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  type ChartOptions,
} from "chart.js";
import { TrendingUp, Calendar, Filter } from "lucide-react";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

const API_BASE_URL = "http://localhost:8000";

type ProgressChartProps = {
  refreshTrigger?: number;
};

type ProgressItem = {
  date: string;
  metric_name: string;
  metric_value: number;
  unit?: string;
};

function isProgressItem(value: unknown): value is ProgressItem {
  if (!value || typeof value !== "object") {
    return false;
  }

  const item = value as Record<string, unknown>;
  return (
    typeof item.date === "string" &&
    typeof item.metric_name === "string" &&
    typeof item.metric_value === "number"
  );
}

export default function ProgressChart({
  refreshTrigger = 0,
}: ProgressChartProps) {
  const [progressData, setProgressData] = useState<ProgressItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedMetric, setSelectedMetric] = useState("");
  const [timeRange, setTimeRange] = useState("30"); // days

  const timeRanges = [
    { value: "7", label: "7 Days" },
    { value: "30", label: "30 Days" },
    { value: "45", label: "45 Days" },
    { value: "60", label: "60 Days" },
    { value: "90", label: "90 Days" },
    { value: "365", label: "1 Year" },
  ];

  useEffect(() => {
    fetchProgressData();
  }, [timeRange, refreshTrigger]);

  const fetchProgressData = async () => {
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch(`${API_BASE_URL}/api/progress/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to fetch progress data");
      }

      const payload: unknown = await response.json();
      const data: ProgressItem[] = Array.isArray(payload)
        ? payload.filter(isProgressItem)
        : [];
      setProgressData(data);

      // Set default metric if none selected
      if (!selectedMetric && data.length > 0) {
        const metrics = [...new Set(data.map((item) => item.metric_name))];
        if (metrics.length > 0) {
          setSelectedMetric(metrics[0]);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch progress data");
    } finally {
      setLoading(false);
    }
  };

  // Filter data based on time range and selected metric
  const filteredData = progressData
    .filter((item) => {
      const itemDate = new Date(item.date);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - parseInt(timeRange));

      return (
        itemDate >= cutoffDate &&
        (!selectedMetric || item.metric_name === selectedMetric)
      );
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Get unique metrics for filter
  const availableMetrics = [
    ...new Set(progressData.map((item) => item.metric_name)),
  ];

  // Prepare chart data
  const chartData = {
    labels: filteredData.map((item) => {
      const date = new Date(item.date);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }),
    datasets: [
      {
        label: selectedMetric || "Progress",
        data: filteredData.map((item) => item.metric_value),
        borderColor: "#7c3aed",
        backgroundColor: "rgba(124, 58, 237, 0.1)",
        borderWidth: 3,
        pointBackgroundColor: "#7c3aed",
        pointBorderColor: "#ffffff",
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8,
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const chartOptions: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        titleColor: "#ffffff",
        bodyColor: "#ffffff",
        borderColor: "#7c3aed",
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          title: function (context) {
            const dataIndex = context[0].dataIndex;
            const item = filteredData[dataIndex];
            return new Date(item.date).toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric",
            });
          },
          label: function (context) {
            const item = filteredData[context.dataIndex];
            return `${item.metric_name}: ${item.metric_value}${item.unit ? ` ${item.unit}` : ""}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: "#6b7280",
          font: {
            size: 12,
          },
        },
      },
      y: {
        grid: {
          color: "#f3f4f6",
        },
        ticks: {
          color: "#6b7280",
          font: {
            size: 12,
          },
        },
      },
    },
    interaction: {
      intersect: false,
      mode: "index",
    },
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary-600 grid place-items-center text-white">
            <TrendingUp size={18} />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">
            Progress Chart
          </h2>
        </div>

        <div className="flex gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            {timeRanges.map((range) => (
              <option key={range.value} value={range.value}>
                {range.label}
              </option>
            ))}
          </select>

          {availableMetrics.length > 1 && (
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">All Metrics</option>
              {availableMetrics.map((metric) => (
                <option key={metric} value={metric}>
                  {metric}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {loading && (
        <div className="h-64 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <p className="mt-2 text-gray-500">Loading progress data...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="h-64 flex items-center justify-center">
          <div className="text-center">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          </div>
        </div>
      )}

      {!loading && !error && filteredData.length === 0 && (
        <div className="h-64 flex items-center justify-center">
          <div className="text-center">
            <TrendingUp size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No progress data available</p>
            <p className="text-sm text-gray-400 mt-1">
              Start logging your progress to see charts here
            </p>
          </div>
        </div>
      )}

      {!loading && !error && filteredData.length > 0 && (
        <div className="h-64">
          <Line data={chartData} options={chartOptions} />
        </div>
      )}

      {!loading && !error && filteredData.length > 0 && (
        <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center gap-1">
            <Calendar size={14} />
            <span>
              {filteredData.length} data points over {timeRange} days
            </span>
          </div>
          {selectedMetric && (
            <div className="flex items-center gap-1">
              <Filter size={14} />
              <span>Showing: {selectedMetric}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
