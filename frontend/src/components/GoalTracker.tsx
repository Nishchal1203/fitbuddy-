"use client";

import React, { useState, useEffect } from "react";
import { Target, Plus, Check, Edit, Trash2, Calendar } from "lucide-react";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Textarea,
  useToast,
} from "@/components/ui";
import { API_BASE_URL, buildAuthHeaders, readErrorMessage } from "@/Utils/api";

type Goal = {
  id: number;
  title: string;
  description?: string | null;
  target_date?: string | null;
  is_completed: boolean;
};

export default function GoalTracker() {
  const { showToast } = useToast();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    target_date: "",
    is_completed: false,
  });

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/goals/`, {
        headers: buildAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response, "Failed to fetch goals"),
        );
      }

      const data = await response.json();
      setGoals(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const url = editingGoal
        ? `${API_BASE_URL}/api/goals/${editingGoal.id}`
        : `${API_BASE_URL}/api/goals/`;

      const method = editingGoal ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          ...buildAuthHeaders({ "Content-Type": "application/json" }),
        },
        body: JSON.stringify({
          ...formData,
          target_date: formData.target_date
            ? new Date(formData.target_date).toISOString()
            : null,
        }),
      });

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(
            response,
            `Failed to ${editingGoal ? "update" : "create"} goal`,
          ),
        );
      }

      showToast({
        title: `Goal ${editingGoal ? "updated" : "created"}`,
        description: `"${formData.title}" has been saved successfully.`,
        variant: "success",
      });
      setShowForm(false);
      setEditingGoal(null);
      setFormData({
        title: "",
        description: "",
        target_date: "",
        is_completed: false,
      });
      fetchGoals();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (goal) => {
    setEditingGoal(goal);
    setFormData({
      title: goal.title,
      description: goal.description || "",
      target_date: goal.target_date
        ? new Date(goal.target_date).toISOString().slice(0, 10)
        : "",
      is_completed: goal.is_completed,
    });
    setShowForm(true);
  };

  const handleDelete = async (goalId) => {
    if (!confirm("Are you sure you want to delete this goal?")) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/goals/${goalId}`, {
        method: "DELETE",
        headers: buildAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response, "Failed to delete goal"),
        );
      }

      showToast({
        title: "Goal deleted",
        description: "The goal was removed successfully.",
        variant: "info",
      });
      fetchGoals();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleComplete = async (goal) => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/goals/${goal.id}`, {
        method: "PATCH",
        headers: {
          ...buildAuthHeaders({ "Content-Type": "application/json" }),
        },
        body: JSON.stringify({
          ...goal,
          is_completed: !goal.is_completed,
        }),
      });

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response, "Failed to update goal"),
        );
      }

      showToast({
        title: goal.is_completed ? "Goal reopened" : "Goal completed",
        description: `${goal.title} status has been updated.`,
        variant: "success",
      });
      fetchGoals();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      target_date: "",
      is_completed: false,
    });
    setShowForm(false);
    setEditingGoal(null);
    setError("");
  };

  const getDaysUntilTarget = (targetDate) => {
    if (!targetDate) return null;
    const today = new Date();
    const target = new Date(targetDate);
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const activeGoals = goals.filter((goal) => !goal.is_completed);
  const completedGoals = goals.filter((goal) => goal.is_completed);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary-600 grid place-items-center text-white">
            <Target size={18} />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Goals</h2>
        </div>
        <Button type="button" onClick={() => setShowForm(true)}>
          <Plus size={18} />
          New Goal
        </Button>
      </div>

      {error && (
        <Alert variant="error" title="Could not update goals">
          {error}
        </Alert>
      )}

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingGoal ? "Edit Goal" : "Create New Goal"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleSubmit}
              className="space-y-4"
              data-lpignore="true"
            >
              <Input
                id="title"
                name="title"
                label="Goal Title *"
                required
                value={formData.title}
                onChange={handleInputChange}
                placeholder="e.g., Run 5K, Lose 10 pounds"
              />

              <Textarea
                id="description"
                name="description"
                label="Description"
                rows={3}
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Describe your goal and how you plan to achieve it..."
              />

              <Input
                id="target_date"
                name="target_date"
                type="date"
                label="Target Date"
                value={formData.target_date}
                onChange={handleInputChange}
              />

              <label
                htmlFor="is_completed"
                className="inline-flex items-center gap-2 text-sm font-medium text-gray-700"
              >
                <input
                  id="is_completed"
                  name="is_completed"
                  type="checkbox"
                  checked={formData.is_completed}
                  onChange={handleInputChange}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                Mark as completed
              </label>

              <div className="flex gap-3 pt-2">
                <Button type="submit" loading={loading} className="flex-1">
                  {editingGoal ? "Update Goal" : "Create Goal"}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Active Goals</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              <p className="mt-2 text-gray-500">Loading goals...</p>
            </div>
          )}

          {!loading && activeGoals.length === 0 && (
            <div className="text-center py-8">
              <Target size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">No active goals</p>
              <p className="text-sm text-gray-400 mt-1">
                Create your first goal to get started
              </p>
            </div>
          )}

          {!loading && activeGoals.length > 0 && (
            <div className="space-y-3">
              {activeGoals.map((goal) => {
                const daysLeft = getDaysUntilTarget(goal.target_date);
                return (
                  <div
                    key={goal.id}
                    className="rounded-lg border border-gray-200 p-4 transition-colors hover:border-primary-300"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleComplete(goal)}
                          >
                            <div className="w-5 h-5 border-2 border-gray-300 rounded hover:border-primary-500"></div>
                          </Button>
                          <h4 className="font-semibold text-gray-900">
                            {goal.title}
                          </h4>
                        </div>

                        {goal.description && (
                          <p className="text-sm text-gray-600 mb-2">
                            {goal.description}
                          </p>
                        )}

                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          {goal.target_date && (
                            <div className="flex items-center gap-1">
                              <Calendar size={14} />
                              <span>
                                {new Date(goal.target_date).toLocaleDateString(
                                  "en-US",
                                  {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  },
                                )}
                                {daysLeft !== null && (
                                  <span
                                    className={`ml-1 ${daysLeft < 0 ? "text-red-600" : daysLeft <= 7 ? "text-orange-600" : "text-gray-500"}`}
                                  >
                                    (
                                    {daysLeft < 0
                                      ? `${Math.abs(daysLeft)} days overdue`
                                      : `${daysLeft} days left`}
                                    )
                                  </span>
                                )}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-1 ml-3">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(goal)}
                        >
                          <Edit size={16} />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(goal.id)}
                          className="text-gray-400 hover:text-red-600"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {completedGoals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Completed Goals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {completedGoals.map((goal) => (
                <div
                  key={goal.id}
                  className="rounded-lg border border-gray-200 bg-gray-50 p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-2">
                        <div className="flex h-5 w-5 items-center justify-center rounded bg-green-500">
                          <Check size={12} className="text-white" />
                        </div>
                        <h4 className="font-semibold text-gray-700 line-through">
                          {goal.title}
                        </h4>
                        <Badge variant="completed">Completed</Badge>
                      </div>
                      {goal.description && (
                        <p className="text-sm text-gray-600">
                          {goal.description}
                        </p>
                      )}
                    </div>
                    <div className="ml-3 flex gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(goal)}
                      >
                        <Edit size={16} />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(goal.id)}
                        className="text-gray-400 hover:text-red-600"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
