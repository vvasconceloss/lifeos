export interface OnboardingPillarOption {
  name: string;
  icon: string;
  color: string;
  description: string;
}

export interface OnboardingHabitOption {
  name: string;
  icon: string;
  color: string;
}

export const ONBOARDING_PILLARS: OnboardingPillarOption[] = [
  {
    name: "Health",
    icon: "❤️",
    color: "#ef4444",
    description: "Sleep, exercise, nutrition and energy",
  },
  {
    name: "Engineering",
    icon: "💻",
    color: "#3b82f6",
    description: "Coding, learning and building",
  },
  {
    name: "Knowledge",
    icon: "📚",
    color: "#8b5cf6",
    description: "Reading, studying and curiosity",
  },
  {
    name: "Relationships",
    icon: "🤝",
    color: "#ec4899",
    description: "Family, friends and connection",
  },
  {
    name: "Leisure",
    icon: "🎮",
    color: "#f59e0b",
    description: "Rest, fun and hobbies",
  },
  {
    name: "Inner Growth",
    icon: "🌱",
    color: "#10b981",
    description: "Mindfulness and self-reflection",
  },
];

export const ONBOARDING_HABITS: Record<string, OnboardingHabitOption[]> = {
  Health: [
    { name: "Drink 2L of water", icon: "💧", color: "#06b6d4" },
    { name: "Exercise for 30 minutes", icon: "🏋️", color: "#ef4444" },
    { name: "Sleep 7–8 hours", icon: "😴", color: "#8b5cf6" },
    { name: "Meditate for 10 minutes", icon: "🧘", color: "#10b981" },
  ],
  Engineering: [
    { name: "Code for 1 hour", icon: "⌨️", color: "#3b82f6" },
    { name: "Read technical documentation", icon: "📖", color: "#06b6d4" },
    { name: "Review or refactor code", icon: "🔧", color: "#f59e0b" },
  ],
  Knowledge: [
    { name: "Read for 20 minutes", icon: "📖", color: "#8b5cf6" },
    { name: "Study a course or topic", icon: "🎓", color: "#3b82f6" },
    { name: "Write down a new idea", icon: "✍️", color: "#ec4899" },
  ],
  Relationships: [
    { name: "Call a friend or family member", icon: "📞", color: "#ec4899" },
    { name: "Send a thoughtful message", icon: "💬", color: "#8b5cf6" },
  ],
  Leisure: [
    { name: "Do something fun", icon: "🎮", color: "#f59e0b" },
    { name: "Take a walk outside", icon: "🚶", color: "#22c55e" },
    { name: "Unplug from screens", icon: "🌿", color: "#10b981" },
  ],
  "Inner Growth": [
    { name: "Write a journal entry", icon: "📔", color: "#10b981" },
    { name: "Practice gratitude", icon: "🙏", color: "#f59e0b" },
    { name: "Review my goals for the day", icon: "🎯", color: "#8b5cf6" },
  ],
};
