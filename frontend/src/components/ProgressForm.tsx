"use client";

import React, { useState } from "react";
import { X, TrendingUp, Calendar, Target } from "lucide-react";
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  useToast,
} from "@/components/ui";
import { API_BASE_URL, buildAuthHeaders, readErrorMessage } from "@/Utils/api";

export default function ProgressForm({ onProgressAdded }) {
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    date: new Date().toISOString().slice(0, 10), // YYYY-MM-DD format
    metric_name: "",
    metric_value: "",
    unit: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const commonMetrics = [
    { name: "Weight", unit: "kg" },
    { name: "Body Fat %", unit: "%" },
    { name: "Muscle Mass", unit: "kg" },
    { name: "Steps", unit: "steps" },
    { name: "Calories Burned", unit: "calories" },
    { name: "Workout Duration", unit: "minutes" },
    { name: "Distance Run", unit: "km" },
    { name: "Push-ups", unit: "reps" },
    { name: "Squats", unit: "reps" },
    { name: "Plank Hold", unit: "seconds" },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/progress/`, {
        method: "POST",
        headers: {
          ...buildAuthHeaders({ "Content-Type": "application/json" }),
        },
        body: JSON.stringify({
          ...formData,
          metric_value: parseFloat(formData.metric_value),
        }),
      });

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response, "Failed to log progress"),
        );
      }

      await response.json();
      showToast({
        title: "Progress logged",
        description: `${formData.metric_name} has been added successfully.`,
        variant: "success",
      });

      setFormData({
        date: new Date().toISOString().slice(0, 10),
        metric_name: "",
        metric_value: "",
        unit: "",
      });

      if (onProgressAdded) {
        onProgressAdded();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleMetricSelect = (metric) => {
    setFormData((prev) => ({
      ...prev,
      metric_name: metric.name,
      unit: metric.unit,
    }));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary-600 text-white">
            <TrendingUp size={18} />
          </div>
          <CardTitle>Log Progress</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert
            variant="error"
            title="Could not log progress"
            className="mb-4"
          >
            {error}
          </Alert>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-4"
          data-lpignore="true"
        >
          <Input
            id="date"
            name="date"
            type="date"
            label="Date *"
            required
            value={formData.date}
            onChange={handleInputChange}
            rightIcon={<Calendar size={16} />}
          />

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Quick Select Metric
            </label>
            <div className="grid grid-cols-2 gap-2">
              {commonMetrics.map((metric, index) => (
                <Button
                  key={index}
                  type="button"
                  variant={
                    formData.metric_name === metric.name
                      ? "secondary"
                      : "outline"
                  }
                  className="justify-start"
                  onClick={() => handleMetricSelect(metric)}
                >
                  {metric.name}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              id="metric_name"
              name="metric_name"
              type="text"
              label="Metric Name *"
              required
              value={formData.metric_name}
              onChange={handleInputChange}
              placeholder="e.g., Weight, Steps, Push-ups"
            />

            <Input
              id="unit"
              name="unit"
              type="text"
              label="Unit"
              value={formData.unit}
              onChange={handleInputChange}
              placeholder="e.g., kg, reps, minutes"
            />
          </div>

          <Input
            id="metric_value"
            name="metric_value"
            type="number"
            step="0.1"
            label="Value *"
            required
            value={formData.metric_value}
            onChange={handleInputChange}
            placeholder="Enter the measured value"
            rightIcon={<Target size={16} />}
          />

          <div className="flex gap-3 pt-2">
            <Button type="submit" loading={loading} className="flex-1">
              Log Progress
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setFormData({
                  date: new Date().toISOString().slice(0, 10),
                  metric_name: "",
                  metric_value: "",
                  unit: "",
                });
                setError("");
              }}
            >
              <X size={18} />
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
