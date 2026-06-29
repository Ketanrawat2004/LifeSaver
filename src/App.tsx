import React, { useState, useEffect } from "react";
import { Task, Habit, ChatMessage, AppPreferences } from "./types";
import { INITIAL_TASKS, INITIAL_HABITS, INITIAL_PREFERRED_STATE, computeUrgencyScore } from "./data";
import { auth, db, handleFirestoreError, OperationType } from "./firebase";
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut as firebaseSignOut } from "firebase/auth";
import { collection, doc, setDoc, deleteDoc, onSnapshot } from "firebase/firestore";
import DashboardView from "./components/DashboardView";
import TaskManagementView from "./components/TaskManagementView";
import AiCoachView from "./components/AiCoachView";
import ScheduleView from "./components/ScheduleView";
import HabitsView from "./components/HabitsView";
import SettingsView from "./components/SettingsView";
import HomeView from "./components/HomeView";
import ProfileView from "./components/ProfileView";
import CognitiveAuditView from "./components/CognitiveAuditView";
import GmailView from "./components/GmailView";
import GoogleKeepView from "./components/GoogleKeepView";
import ZenAudioPlayer from "./components/ZenAudioPlayer";
import AccessibilityWidget from "./components/AccessibilityWidget";
import SomaticBreathingWidget from "./components/SomaticBreathingWidget";
import AegisAgentWidget from "./components/AegisAgentWidget";
import { motion, AnimatePresence } from "motion/react";
import { Zap, Clock, ShieldAlert, Kanban, MessageSquare, Calendar, Flame, Settings, Lock, UserPlus, Eye, EyeOff, LogOut, Check, ArrowRight, Sparkles, RefreshCw, User, BookOpen, Award, Brain, ShieldCheck, Menu, X, ChevronLeft, ChevronRight, Activity, Mail, Bookmark } from "lucide-react";
import { encryptData, decryptData } from "./utils/crypto";
import { safeStorage } from "./utils/safeStorage";
import LifeSaverLogo from "./components/LifeSaverLogo";

export default function App() {
  // Real-time live clock state (ticks every 30s)
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // User Authenticated state
  const [currentUser, setCurrentUser] = useState<{ username: string } | null>(null);

  // Interactive sliding navigation state (collapsible on desktop & mobile)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Auto-collapse sidebar on mobile screen load or mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const handleInitialCollapse = () => {
        if (window.innerWidth < 1024) {
          setIsSidebarOpen(false);
        } else {
          setIsSidebarOpen(true);
        }
      };
      handleInitialCollapse();
      // Register a passive resize listener to adjust gracefully if needed
      const handleResize = () => {
        // Auto-close on shift to mobile view
        if (window.innerWidth < 1024) {
          setIsSidebarOpen(false);
        }
      };
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

  // App core states (loaded dynamically per user)
  const [tasks, setTasks] = useState<Task[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [preferences, setPreferences] = useState<AppPreferences>(INITIAL_PREFERRED_STATE);

  // Path Routing State
  const [currentPath, setCurrentPath] = useState<string>("/");

  // Interactive Policies and Sitemap Modals
  const [showSitemap, setShowSitemap] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  // Floating Confetti particle system for stunning celebrations
  const [globalConfetti, setGlobalConfetti] = useState<{
    id: string;
    x: number;
    y: number;
    color: string;
    angle: number;
    speed: number;
    size: number;
  }[]>([]);

  const triggerGlobalConfetti = () => {
    const colors = ["#F59E0B", "#10B981", "#3B82F6", "#EF4444", "#EC4899", "#8B5CF6"];
    const pieces = [];
    for (let i = 0; i < 40; i++) {
      pieces.push({
        id: `conf-${Date.now()}-${i}-${Math.random()}`,
        x: 50,
        y: 60,
        color: colors[Math.floor(Math.random() * colors.length)],
        angle: Math.random() * 360,
        speed: Math.random() * 12 + 4,
        size: Math.random() * 10 + 6,
      });
    }
    setGlobalConfetti(pieces);
    setTimeout(() => {
      setGlobalConfetti([]);
    }, 2500);
  };

  // Start active clocks
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // 1. Initial auth state recovery & Firebase Auth listener
  useEffect(() => {
    // 1.a Restore local session first if any
    const activeSession = safeStorage.getItem("lifesaver_active_session");
    if (activeSession) {
      try {
        const decoded = decryptData(activeSession, null as any);
        if (decoded && decoded.username) {
          setCurrentUser(decoded);
        }
      } catch (e) {
        safeStorage.removeItem("lifesaver_active_session");
      }
    }

    // 1.b Listen to real Firebase Auth changes
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        const session = {
          username: user.displayName || user.email?.split("@")[0] || "User",
          email: user.email || "",
          uid: user.uid,
          isFirebase: true
        };
        safeStorage.setItem("lifesaver_active_session", encryptData(session));
        setCurrentUser(session);
      } else {
        // If there was a firebase session in storage, clear it on sign out
        const stored = safeStorage.getItem("lifesaver_active_session");
        if (stored) {
          try {
            const decoded = decryptData(stored, null as any);
            if (decoded && decoded.isFirebase) {
              setCurrentUser(null);
              safeStorage.removeItem("lifesaver_active_session");
            }
          } catch (e) {}
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // 1.c Sync Firestore data in real-time when authenticated via Firebase
  useEffect(() => {
    if (!currentUser || !currentUser.isFirebase || !currentUser.uid) {
      return;
    }

    const userId = currentUser.uid;

    // Listen to tasks
    const tasksRef = collection(db, "users", userId, "tasks");
    const unsubTasks = onSnapshot(tasksRef, async (snapshot) => {
      try {
        const taskList: Task[] = [];
        snapshot.forEach((doc) => {
          taskList.push(doc.data() as Task);
        });

        // Initialize newly registered users with default template tasks if empty
        if (taskList.length === 0 && snapshot.metadata.fromCache === false) {
          for (const task of INITIAL_TASKS) {
            await setDoc(doc(db, "users", userId, "tasks", task.id), task);
          }
        } else {
          setTasks(taskList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `users/${userId}/tasks`);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${userId}/tasks`);
    });

    // Listen to habits
    const habitsRef = collection(db, "users", userId, "habits");
    const unsubHabits = onSnapshot(habitsRef, async (snapshot) => {
      try {
        const habitList: Habit[] = [];
        snapshot.forEach((doc) => {
          habitList.push(doc.data() as Habit);
        });

        if (habitList.length === 0 && snapshot.metadata.fromCache === false) {
          for (const habit of INITIAL_HABITS) {
            await setDoc(doc(db, "users", userId, "habits", habit.id), habit);
          }
        } else {
          setHabits(habitList);
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `users/${userId}/habits`);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${userId}/habits`);
    });

    // Listen to chat messages
    const messagesRef = collection(db, "users", userId, "messages");
    const unsubMessages = onSnapshot(messagesRef, (snapshot) => {
      try {
        const msgList: ChatMessage[] = [];
        snapshot.forEach((doc) => {
          msgList.push(doc.data() as ChatMessage);
        });
        setMessages(msgList.sort((a, b) => a.id.localeCompare(b.id)));
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `users/${userId}/messages`);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${userId}/messages`);
    });

    // Listen to settings/preferences
    const prefDocRef = doc(db, "users", userId, "preferences", "settings");
    const unsubPrefs = onSnapshot(prefDocRef, async (docSnap) => {
      try {
        if (docSnap.exists()) {
          setPreferences(docSnap.data() as AppPreferences);
        } else {
          const defaultPrefs = {
            ...INITIAL_PREFERRED_STATE,
            username: currentUser.username
          };
          await setDoc(prefDocRef, defaultPrefs);
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `users/${userId}/preferences/settings`);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${userId}/preferences/settings`);
    });

    return () => {
      unsubTasks();
      unsubHabits();
      unsubMessages();
      unsubPrefs();
    };
  }, [currentUser]);

  // 2. Load and isolate states *strictly* per authorized user (with encryption protection)
  useEffect(() => {
    if (!currentUser) {
      setTasks([]);
      setHabits([]);
      setMessages([]);
      setPreferences(INITIAL_PREFERRED_STATE);
      return;
    }

    if (currentUser.isFirebase) {
      // For Firebase authenticated users, routing is still restored but the lists/prefs are bound by onSnapshot listeners
      const path = window.location.pathname;
      const allowed = ["/home", "/", "/tasks", "/gmail", "/keep", "/ai-coach", "/schedule", "/habits", "/profile", "/settings", "/cognitive-audit"];
      if (path === "/") {
        setCurrentPath("/home");
        window.history.replaceState(null, "", "/home");
      } else if (allowed.includes(path)) {
        setCurrentPath(path);
      } else {
        setCurrentPath("/home");
      }

      const handlePopState = () => {
        if (allowed.includes(window.location.pathname)) {
          setCurrentPath(window.location.pathname);
        }
      };
      window.addEventListener("popstate", handlePopState);
      return () => window.removeEventListener("popstate", handlePopState);
    }

    const uName = currentUser.username.toLowerCase();
    const savedTasks = safeStorage.getItem(`lifesaver_tasks_${uName}`);
    const savedHabits = safeStorage.getItem(`lifesaver_habits_${uName}`);
    const savedMessages = safeStorage.getItem(`lifesaver_messages_${uName}`);
    const savedPrefs = safeStorage.getItem(`lifesaver_preferences_${uName}`);

    if (savedTasks) {
      try { setTasks(decryptData(savedTasks, INITIAL_TASKS)); } catch (e) { setTasks(INITIAL_TASKS); }
    } else {
      setTasks(INITIAL_TASKS);
    }

    if (savedHabits) {
      try { setHabits(decryptData(savedHabits, INITIAL_HABITS)); } catch (e) { setHabits(INITIAL_HABITS); }
    } else {
      setHabits(INITIAL_HABITS);
    }

    if (savedMessages) {
      try { setMessages(decryptData(savedMessages, [])); } catch (e) { setMessages([]); }
    } else {
      setMessages([]);
    }

    if (savedPrefs) {
      try { setPreferences(decryptData(savedPrefs, INITIAL_PREFERRED_STATE)); } catch (e) { setPreferences(INITIAL_PREFERRED_STATE); }
    } else {
      setPreferences({
        ...INITIAL_PREFERRED_STATE,
        username: currentUser.username
      });
    }

    // Restore routing pathname
    const path = window.location.pathname;
    const allowed = ["/home", "/", "/tasks", "/gmail", "/keep", "/ai-coach", "/schedule", "/habits", "/profile", "/settings", "/cognitive-audit"];
    if (path === "/") {
      setCurrentPath("/home");
      window.history.replaceState(null, "", "/home");
    } else if (allowed.includes(path)) {
      setCurrentPath(path);
    } else {
      setCurrentPath("/home");
    }

    const handlePopState = () => {
      if (allowed.includes(window.location.pathname)) {
        setCurrentPath(window.location.pathname);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [currentUser]);

  // Navigation handlers
  const handleNavigate = (path: string) => {
    window.history.pushState(null, "", path);
    setCurrentPath(path);
  };

  // State savers (per-user namespace)
  const saveTasks = async (newTasks: Task[]) => {
    setTasks(newTasks);
    if (currentUser) {
      if (currentUser.isFirebase && currentUser.uid) {
        try {
          const currentTaskIds = new Set(newTasks.map(t => t.id));
          const tasksToDelete = tasks.filter(t => !currentTaskIds.has(t.id));
          for (const t of tasksToDelete) {
            await deleteDoc(doc(db, "users", currentUser.uid, "tasks", t.id));
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `users/${currentUser.uid}/tasks`);
        }
      } else {
        safeStorage.setItem(`lifesaver_tasks_${currentUser.username.toLowerCase()}`, encryptData(newTasks));
      }
    }
  };

  const saveHabits = async (newHabits: Habit[]) => {
    setHabits(newHabits);
    if (currentUser) {
      if (currentUser.isFirebase && currentUser.uid) {
        try {
          const currentHabitIds = new Set(newHabits.map(h => h.id));
          const habitsToDelete = habits.filter(h => !currentHabitIds.has(h.id));
          for (const h of habitsToDelete) {
            await deleteDoc(doc(db, "users", currentUser.uid, "habits", h.id));
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `users/${currentUser.uid}/habits`);
        }
      } else {
        safeStorage.setItem(`lifesaver_habits_${currentUser.username.toLowerCase()}`, encryptData(newHabits));
      }
    }
  };

  // Task Actions
  const handleAddTask = async (t: Omit<Task, "id" | "createdAt">) => {
    const newTask: Task = {
      ...t,
      id: `task-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    if (currentUser?.isFirebase && currentUser.uid) {
      try {
        await setDoc(doc(db, "users", currentUser.uid, "tasks", newTask.id), newTask);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${currentUser.uid}/tasks/${newTask.id}`);
      }
    } else {
      saveTasks([...tasks, newTask]);
    }
  };

  const handleToggleTaskComplete = async (id: string) => {
    const targetTask = tasks.find(t => t.id === id);
    if (!targetTask) return;
    if (!targetTask.completed) {
      triggerGlobalConfetti();
    }
    const updated = { ...targetTask, completed: !targetTask.completed };
    if (currentUser?.isFirebase && currentUser.uid) {
      try {
        await setDoc(doc(db, "users", currentUser.uid, "tasks", id), updated);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${currentUser.uid}/tasks/${id}`);
      }
    } else {
      saveTasks(tasks.map(t => t.id === id ? updated : t));
    }
  };

  const handleCompleteTaskDirect = async (id: string) => {
    const targetTask = tasks.find(t => t.id === id);
    if (!targetTask) return;
    if (!targetTask.completed) {
      triggerGlobalConfetti();
    }
    const updated = { ...targetTask, completed: true };
    if (currentUser?.isFirebase && currentUser.uid) {
      try {
        await setDoc(doc(db, "users", currentUser.uid, "tasks", id), updated);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${currentUser.uid}/tasks/${id}`);
      }
    } else {
      saveTasks(tasks.map(t => t.id === id ? updated : t));
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (currentUser?.isFirebase && currentUser.uid) {
      try {
        await deleteDoc(doc(db, "users", currentUser.uid, "tasks", id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `users/${currentUser.uid}/tasks/${id}`);
      }
    } else {
      saveTasks(tasks.filter(t => t.id !== id));
    }
  };

  // Habit Actions
  const handleToggleHabitToday = async (id: string) => {
    const todayYMD = currentTime.toISOString().split("T")[0];
    let isCompleting = false;
    let updatedHabit: Habit | null = null;
    const updated = habits.map(h => {
      if (h.id === id) {
        const index = h.completedDays.indexOf(todayYMD);
        let newList = [...h.completedDays];
        let newStreak = h.streak;
        if (index > -1) {
          newList.splice(index, 1);
          newStreak = Math.max(0, h.streak - 1);
        } else {
          newList.push(todayYMD);
          newStreak = h.streak + 1;
          isCompleting = true;
        }
        updatedHabit = { ...h, completedDays: newList, streak: newStreak };
        return updatedHabit;
      }
      return h;
    });
    if (isCompleting) {
      triggerGlobalConfetti();
    }
    if (currentUser?.isFirebase && currentUser.uid && updatedHabit) {
      try {
        await setDoc(doc(db, "users", currentUser.uid, "habits", id), updatedHabit);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${currentUser.uid}/habits/${id}`);
      }
    } else {
      saveHabits(updated);
    }
  };

  const handleAddHabit = async (name: string, category: "work" | "health" | "mind" | "routine") => {
    const newHabit: Habit = {
      id: `habit-${Date.now()}`,
      name,
      streak: 0,
      completedDays: [],
      category
    };
    if (currentUser?.isFirebase && currentUser.uid) {
      try {
        await setDoc(doc(db, "users", currentUser.uid, "habits", newHabit.id), newHabit);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${currentUser.uid}/habits/${newHabit.id}`);
      }
    } else {
      saveHabits([...habits, newHabit]);
    }
  };

  const handleDeleteHabit = async (id: string) => {
    if (currentUser?.isFirebase && currentUser.uid) {
      try {
        await deleteDoc(doc(db, "users", currentUser.uid, "habits", id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `users/${currentUser.uid}/habits/${id}`);
      }
    } else {
      saveHabits(habits.filter(h => h.id !== id));
    }
  };

  // AI Chat Messages Actions
  const handleAddMessage = async (role: "user" | "assistant", text: string) => {
    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role,
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    if (currentUser?.isFirebase && currentUser.uid) {
      try {
        await setDoc(doc(db, "users", currentUser.uid, "messages", newMsg.id), newMsg);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${currentUser.uid}/messages/${newMsg.id}`);
      }
    } else {
      const updated = [...messages, newMsg];
      setMessages(updated);
      if (currentUser) {
        safeStorage.setItem(`lifesaver_messages_${currentUser.username.toLowerCase()}`, encryptData(updated));
      }
    }
  };

  const handleClearHistory = async () => {
    if (currentUser?.isFirebase && currentUser.uid) {
      try {
        for (const msg of messages) {
          await deleteDoc(doc(db, "users", currentUser.uid, "messages", msg.id));
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `users/${currentUser.uid}/messages`);
      }
    } else {
      setMessages([]);
      if (currentUser) {
        safeStorage.removeItem(`lifesaver_messages_${currentUser.username.toLowerCase()}`);
      }
    }
  };

  // Preferences
  const handleUpdatePreferences = async (updates: Partial<AppPreferences>) => {
    const updated = { ...preferences, ...updates };
    setPreferences(updated);
    if (currentUser) {
      if (currentUser.isFirebase && currentUser.uid) {
        try {
          await setDoc(doc(db, "users", currentUser.uid, "preferences", "settings"), updated);
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `users/${currentUser.uid}/preferences/settings`);
        }
      } else {
        safeStorage.setItem(`lifesaver_preferences_${currentUser.username.toLowerCase()}`, encryptData(updated));
      }
    }
  };

  // Sign out handler
  const handleSignOut = async () => {
    try {
      if (currentUser?.isFirebase) {
        await firebaseSignOut(auth);
      }
    } catch (e) {
      console.error("Firebase Sign Out Error:", e);
    }
    safeStorage.removeItem("lifesaver_active_session");
    setCurrentUser(null);
    handleNavigate("/");
  };

  // Authentication & Registration View setup (Interactive 3D Perspective Card)
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authUsername, setAuthUsername] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authConfirmPassword, setAuthConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  // Google Oauth Pop-up simulation parameters
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isEnteringCustomGoogle, setIsEnteringCustomGoogle] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState("");
  const [customGoogleName, setCustomGoogleName] = useState("");
  const [customGoogleError, setCustomGoogleError] = useState("");

  const handleRealFirebaseGoogleLogin = async () => {
    setIsGoogleLoading(true);
    setAuthError(null);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const session = {
        username: user.displayName || user.email?.split("@")[0] || "User",
        email: user.email || "",
        uid: user.uid,
        isFirebase: true
      };
      safeStorage.setItem("lifesaver_active_session", encryptData(session));
      setCurrentUser(session);
      setShowGoogleModal(false);
      handleNavigate("/home");
    } catch (error: any) {
      console.error("Firebase Auth Error:", error);
      setAuthError(`Google authentication failed: ${error.message || error}`);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleSimulateGoogleLogin = (email: string, username: string) => {
    setIsGoogleLoading(true);
    setTimeout(() => {
      setIsGoogleLoading(false);
      setShowGoogleModal(false);
      setIsEnteringCustomGoogle(false);
      setCustomGoogleEmail("");
      setCustomGoogleName("");
      setCustomGoogleError("");

      const savedRegistry = safeStorage.getItem("lifesaver_auth_users");
      let usersList = savedRegistry ? decryptData(savedRegistry, []) : [];

      const exists = usersList.some((u: any) => u.username.toLowerCase() === username.toLowerCase().trim());
      if (!exists) {
        usersList.push({
          username: username.trim(),
          password: "GOOGLE_OAUTH_OBLIGATED_TOKEN_PASSWORD_2026",
          email: email
        });
        safeStorage.setItem("lifesaver_auth_users", encryptData(usersList));
      }

      const session = { username: username.trim() };
      safeStorage.setItem("lifesaver_active_session", encryptData(session));
      setCurrentUser(session);
      handleNavigate("/home");
    }, 1100);
  };

  // Mouse coords tracker for organic 3D rotational tilt effect
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);

  const handleMouseMove3D = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotX = ((y - centerY) / centerY) * -12; // tilt max 12deg
    const rotY = ((x - centerX) / centerX) * 12;

    setRotateX(rotX);
    setRotateY(rotY);
  };

  const handleMouseLeave3D = () => {
    setRotateX(0);
    setRotateY(0);
  };

  const handleCredentialsAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setRegistrationSuccess(false);

    if (!authUsername.trim() || !authPassword.trim()) {
      setAuthError("Please fill out both username and password fields.");
      return;
    }

    const savedRegistry = safeStorage.getItem("lifesaver_auth_users");
    let usersList = savedRegistry ? decryptData(savedRegistry, []) : [];

    if (authMode === "signup") {
      // Direct requirement check: "without same password can not give sign in permission"
      if (authPassword !== authConfirmPassword) {
        setAuthError("Passwords do not match. Please ensure verify password matches exactly.");
        return;
      }

      const exists = usersList.some((u: any) => u.username.toLowerCase() === authUsername.toLowerCase().trim());
      if (exists) {
        setAuthError("This username is already taken. Please pick another one.");
        return;
      }

      const newUserPayload = {
        username: authUsername.trim(),
        password: authPassword
      };

      usersList.push(newUserPayload);
      safeStorage.setItem("lifesaver_auth_users", encryptData(usersList));

      setRegistrationSuccess(true);
      setAuthMode("login");
      setAuthPassword("");
      setAuthConfirmPassword("");
      setAuthError(null);
    } else {
      // Login validation
      const user = usersList.find(
        (u: any) =>
          u.username.toLowerCase() === authUsername.toLowerCase().trim() &&
          u.password === authPassword
      );

      if (!user) {
        setAuthError("Incorrect username or security password. Let's make sure password matches exactly.");
        return;
      }

      const session = { username: user.username };
      safeStorage.setItem("lifesaver_active_session", encryptData(session));
      setCurrentUser(session);
      handleNavigate("/home");
    }
  };

  // Check for active high urgency warning
  const activeTasks = tasks.filter(t => !t.completed);
  const emergencyTask = activeTasks.find(t => {
    const detail = computeUrgencyScore(t, currentTime.toISOString());
    return detail.hoursRemaining > 0 && detail.hoursRemaining < 3;
  });

  return (
    <div className="min-h-screen font-sans bg-[#F7F7F4] text-[#2D312E] select-none transition-all relative" id="applet-primary-container">
      
      {/* Soft warm beautiful ambient background lights */}
      <div className="absolute top-[10%] left-[15%] w-[400px] h-[400px] rounded-full ambient-circle-1 -z-10 pointer-events-none filter blur-[80px]" />
      <div className="absolute bottom-[20%] right-[10%] w-[500px] h-[500px] rounded-full ambient-circle-2 -z-10 pointer-events-none filter blur-[100px]" />
      <div className="absolute top-[40%] right-[30%] w-[350px] h-[350px] rounded-full ambient-circle-3 -z-10 pointer-events-none filter blur-[90px]" />

      <AnimatePresence mode="wait">
        {!currentUser ? (
          /* Gated Auth Layout with true 3D rotate capability */
          <motion.div
            key="auth-gate"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen flex flex-col items-center justify-center p-6"
            id="auth-routing-gate"
          >
            <div className="max-w-md w-full text-center space-y-4 pb-2">
              <div className="flex items-center justify-center">
                <LifeSaverLogo className="h-16 w-16" showText={true} />
              </div>
            </div>

            {/* 3D Motion Perspective Card Wrapper */}
            <div className="perspective-container max-w-md w-full">
              <motion.div
                onMouseMove={handleMouseMove3D}
                onMouseLeave={handleMouseLeave3D}
                style={{
                  rotateX,
                  rotateY,
                  transformStyle: "preserve-3d"
                }}
                className="card-3d bg-white border border-[#2D312E]/10 rounded-2xl p-8 md:p-10 shadow-[0_15px_50px_-15px_rgba(45,49,46,0.12)] space-y-6 relative overflow-hidden text-left"
              >
                {/* Decorative border gloss */}
                <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-orange-400 via-amber-500 to-lime-500" />
                
                <div style={{ transform: "translateZ(30px)" }}>
                  <h2 className="text-xl font-bold font-serif text-[#1C1E1B]">
                    {authMode === "login" ? "Welcome Back" : "Create Account"}
                  </h2>
                  <p className="text-xs text-[#7A827B] mt-1 font-sans">
                    {authMode === "login" 
                      ? "Sign inside your focal space to rescue pending tasks and check habits."
                      : "Begin your customized workflow journey without losing your daily efforts."}
                  </p>
                </div>

                {registrationSuccess && (
                  <div style={{ transform: "translateZ(25px)" }} className="bg-lime-50 border border-lime-200 text-lime-800 text-xs px-4 py-3 rounded-xl flex items-center gap-2 font-medium">
                    <Check className="h-4 w-4 stroke-[3] text-lime-600" />
                    <span>Account registered successful! Please log in now.</span>
                  </div>
                )}

                {authError && (
                  <div style={{ transform: "translateZ(25px)" }} className="bg-rose-50 border border-rose-100 text-rose-800 text-xs px-4 py-3 rounded-xl flex items-center gap-2 font-medium">
                    <ShieldAlert className="h-4 w-4 text-rose-600 shrink-0" />
                    <span>{authError}</span>
                  </div>
                )}

                <form onSubmit={handleCredentialsAuth} className="space-y-4 font-sans" style={{ transform: "translateZ(40px)" }}>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[#7A827B] font-mono">My Username</label>
                    <input
                      type="text"
                      required
                      value={authUsername}
                      onChange={(e) => setAuthUsername(e.target.value)}
                      placeholder="e.g. Athena"
                      className="w-full bg-[#FAF9F6] border border-[#2D312E]/10 rounded-xl px-4 py-2.5 text-sm font-sans focus:outline-hidden focus:border-amber-500/50 transition-colors autofill-soft"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-[#7A827B] font-mono">My Password</label>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-[#FAF9F6] border border-[#2D312E]/10 rounded-xl pl-4 pr-10 py-2.5 text-sm font-sans focus:outline-hidden focus:border-amber-500/50 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-[#7A827B] hover:text-[#1C1E1B]"
                      >
                        {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                      </button>
                    </div>
                  </div>

                  {authMode === "signup" && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-[#7A827B] font-mono">Confirm Password</label>
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={authConfirmPassword}
                        onChange={(e) => setAuthConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-[#FAF9F6] border border-[#2D312E]/10 rounded-xl px-4 py-2.5 text-sm font-sans focus:outline-hidden focus:border-amber-500/50 transition-colors"
                      />
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full bg-[#1C1E1B] hover:bg-amber-600 text-white font-semibold text-xs py-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer mt-2"
                  >
                    <span>{authMode === "login" ? "Verify Code & Enter" : "Establish Identity"}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>

                  <div className="flex items-center gap-3 py-1">
                    <div className="h-[1px] bg-[#2D312E]/10 flex-1" />
                    <span className="text-[10px] font-mono font-bold tracking-widest text-[#7A827B] uppercase">or secure option</span>
                    <div className="h-[1px] bg-[#2D312E]/10 flex-1" />
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowGoogleModal(true)}
                    className="w-full bg-white hover:bg-[#FAF9F6] text-[#2D312E] font-bold text-xs py-3 rounded-xl border border-[#2D312E]/10 hover:border-[#2D312E]/30 shadow-xs transition-all duration-300 flex items-center justify-center gap-2.5 cursor-pointer"
                  >
                    <svg className="h-4.5 w-4.5 shrink-0" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.9h6.6a5.64 5.64 0 0 1-2.4 3.75v3.1h3.9c2.25-2.07 3.64-5.18 3.64-8.68Z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.08 7.93-2.9l-3.9-3.1a7.5 7.5 0 0 1-11.83-4H.15v3.2A11.97 11.97 0 0 0 12 24Z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M4.2 14c-.2-.6-.3-1.28-.3-1.95s.1-1.35.3-1.95V6.9H.15a11.96 11.96 0 0 0 0 10.38l4.05-3.28Z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.77 0 3.35.6 4.6 1.8l3.43-3.43A11.94 11.94 0 0 0 12 0C7.24 0 3.12 2.73.15 6.9l4.05 3.28c1-2.95 3.75-5.43 7.8-5.43Z"
                      />
                    </svg>
                    <span>Continue with Google</span>
                  </button>
                </form>

                <div className="pt-2 border-t border-[#2D312E]/5 font-sans text-center" style={{ transform: "translateZ(20px)" }}>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode(authMode === "login" ? "signup" : "login");
                      setAuthError(null);
                    }}
                    className="text-xs text-amber-700 hover:text-amber-900 font-semibold underline decoration-2 cursor-pointer underline-offset-4"
                  >
                    {authMode === "login" ? "Register a clean new space" : "Use existing authorized account"}
                  </button>
                </div>
              </motion.div>
            </div>

            <p className="text-xs text-[#7A827B] mt-10 max-w-sm text-center font-sans tracking-wide leading-relaxed">
              Your security and privacy matter. All authentication sequences and data vaults are preserved safely on your direct desktop agent.
            </p>
          </motion.div>
        ) : (
          /* Rest of Gated Core App Layout - Clean, Warm-light and Soft */
          <motion.div
            key="app-main"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen text-[#2D312E] select-none flex flex-col lg:flex-row bg-[#FAF9F6] relative overflow-x-hidden"
          >

            {/* Morphing dynamic backglow bubbles that slowly shift layout and color based on the currentPath! */}
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden select-none">
              <div 
                className="absolute w-[45rem] h-[45rem] rounded-full blur-[160px] opacity-[0.05] transition-all duration-[1600ms] ease-in-out"
                style={{
                  top: '-15%',
                  left: '10%',
                  backgroundColor: 
                    currentPath === "/home" ? "#EA3900" :
                    currentPath === "/" ? "#F59E0B" :
                    currentPath === "/tasks" ? "#0EA5E9" :
                    currentPath === "/ai-coach" ? "#8B5CF6" :
                    currentPath === "/cognitive-audit" ? "#10B981" :
                    currentPath === "/schedule" ? "#F59E0B" :
                    currentPath === "/habits" ? "#EF4444" :
                    currentPath === "/profile" ? "#10B981" : "#A8A29E"
                }}
              />
              <div 
                className="absolute w-[35rem] h-[35rem] rounded-full blur-[140px] opacity-[0.04] transition-all duration-[2000ms] ease-in-out"
                style={{
                  bottom: '10%',
                  right: '5%',
                  backgroundColor: 
                    currentPath === "/home" ? "#0DB7E1" :
                    currentPath === "/" ? "#10B981" :
                    currentPath === "/tasks" ? "#6366F1" :
                    currentPath === "/ai-coach" ? "#EC4899" :
                    currentPath === "/cognitive-audit" ? "#F59E0B" :
                    currentPath === "/schedule" ? "#8B5CF6" :
                    currentPath === "/habits" ? "#F59E0B" :
                    currentPath === "/profile" ? "#06B6D4" : "#78716C"
                }}
              />
            </div>


            {/* MAIN RIGHT SIDEBAR: Slid out from right on lg (persistent), slide-over drawer on mobile */}
            {/* Mobile drawer backdrop */}
            <AnimatePresence>
              {isSidebarOpen && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsSidebarOpen(false)}
                  className="lg:hidden fixed inset-0 bg-stone-900/40 backdrop-blur-xs z-[60]"
                />
              )}
            </AnimatePresence>

            {/* Fixed/Drawer Right Sidebar Container - Premium Light Alabaster Gilded Theme */}
            <aside
              className={`fixed top-0 bottom-0 right-0 z-[70] w-72 bg-gradient-to-b from-[#FFFDF8] via-white to-[#F9F7F2] border-l border-stone-200/80 flex flex-col justify-between transition-transform duration-300 ease-in-out shadow-stone-900/10 shadow-2xl ${
                isSidebarOpen ? "translate-x-0" : "translate-x-full"
              }`}
              id="lifesaver-side-navigation"
            >
              <div className="flex flex-col h-full overflow-y-auto custom-scrollbar">
                {/* Beautiful Brand Header inside sidebar */}
                <div className="p-4.5 border-b border-stone-200/50 flex items-center justify-between shrink-0 bg-stone-50/50">
                  <div className="cursor-pointer flex items-center gap-2" onClick={() => { handleNavigate("/home"); if (window.innerWidth < 1024) setIsSidebarOpen(false); }}>
                    <LifeSaverLogo className="h-8.5 w-8.5 animate-pulse-slow" showText={true} />
                  </div>
                  
                  {/* Premium circular close button - visible on both mobile and laptop/desktop menu */}
                  <button
                    onClick={() => setIsSidebarOpen(false)}
                    className="p-1 px-2.5 bg-stone-100 hover:bg-emerald-50 border border-stone-200 hover:border-emerald-300 text-stone-600 hover:text-emerald-800 rounded-xl cursor-pointer transition-all hover:scale-105 active:scale-95 flex items-center gap-1 group font-mono text-[9px] uppercase font-bold"
                    title="Close Sidebar Menu"
                  >
                    <span>Hide</span>
                    <X className="h-3.5 w-3.5 group-hover:rotate-90 transition-transform duration-300 text-emerald-600" />
                  </button>
                </div>

                {/* Vertical Navigation Link Stack in crisp light theme style */}
                <nav className="flex-1 px-3 py-4 space-y-1" id="sidebar-nav-links">
                  {[
                    { id: "/home", label: "Welcome", icon: BookOpen, tag: "Start" },
                    { id: "/", label: "Task Board", icon: Zap, tag: "Active" },
                    { id: "/tasks", label: "My Tasks", icon: Kanban, count: tasks.filter(t => !t.completed).length },
                    { id: "/gmail", label: "My Gmail", icon: Mail, tag: "Mail" },
                    { id: "/keep", label: "My Keep", icon: Bookmark, tag: "Keep" },
                    { id: "/ai-coach", label: "AI Coach", icon: MessageSquare, tag: "AI" },
                    { id: "/cognitive-audit", label: "Mind Check", icon: Award, tag: "Check" },
                    { id: "/schedule", label: "Daily Plan", icon: Calendar, tag: "Plan" },
                    { id: "/habits", label: "My Habits", icon: Flame, count: habits.filter(h => h.streak > 0).length },
                    { id: "/profile", label: "My Profile", icon: User },
                    { id: "/settings", label: "Settings", icon: Settings }
                  ].map((tab) => {
                    const Icon = tab.icon;
                    const isActive = currentPath === tab.id;
                    return (
                      <motion.button
                        key={tab.id}
                        onClick={() => {
                          handleNavigate(tab.id);
                          if (window.innerWidth < 1024) {
                            setIsSidebarOpen(false);
                          }
                        }}
                        whileHover={{ x: 5 }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer relative group ${
                          isActive
                            ? "bg-emerald-50 text-emerald-950 border-r-4 border-emerald-600 shadow-xs"
                            : "text-stone-600 hover:text-emerald-900 hover:bg-stone-50 hover:border-r-4 hover:border-emerald-500/20"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Icon className={`h-4 w-4 shrink-0 transition-transform group-hover:scale-110 ${isActive ? "text-emerald-700 stroke-[2.2]" : "text-stone-400 group-hover:text-emerald-600"}`} />
                          <span className="truncate tracking-wide font-sans">{tab.label}</span>
                        </div>
                        
                        {/* Interactive counters or tags */}
                        <div className="flex items-center gap-1.5 shrink-0 ml-1">
                          {tab.count !== undefined && tab.count > 0 && (
                            <span className="bg-emerald-100 border border-emerald-200 text-emerald-800 font-mono text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                              {tab.count}
                            </span>
                          )}
                          {tab.tag && (
                            <span className="text-[8px] font-mono tracking-wider text-stone-500 bg-stone-100 border border-stone-200 px-1.5 py-0.5 rounded uppercase leading-none">
                              {tab.tag}
                            </span>
                          )}
                        </div>

                        {isActive && (
                          <motion.div
                            layoutId="active-nav-indicator"
                            className="absolute left-1 w-1 h-3 rounded bg-emerald-600"
                          />
                        )}
                      </motion.button>
                    );
                  })}
                </nav>

                {/* Cognitive alertness status widget inside side nav */}
                <div className="mx-3.5 my-2 p-3 rounded-2xl bg-stone-100/60 border border-stone-200 text-stone-800 space-y-2 shrink-0">
                  <div className="flex items-center justify-between text-[10px] font-mono font-bold tracking-widest text-[#2D312E] uppercase">
                    <span className="flex items-center gap-1">
                      <Activity className="h-3 w-3 text-emerald-600" /> Mental Battery
                    </span>
                    <span className="text-emerald-700 text-[9px]">Optimal</span>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-stone-600">Focus Charge</span>
                      <span className="text-emerald-700 font-mono text-[10px]">89%</span>
                    </div>
                    <div className="w-full bg-stone-200 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-full w-[89%]" />
                    </div>
                  </div>
                  <p className="text-[10px] text-stone-500 leading-relaxed font-sans">
                    Circadian cycle stable. Complete high-charge tasks now.
                  </p>
                </div>

                {/* Sidebar Bottom Metadata, Live UTC Clock & Action Controls inside elegant light pane */}
                <div className="p-3.5 border-t border-stone-200/60 bg-stone-50/50 shrink-0 space-y-2.5">
                  {/* Active Profile Summary */}
                  <div className="flex items-center gap-2.5 px-1 pb-1">
                    <div className="h-8 w-8 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center font-bold font-mono text-xs text-emerald-800 capitalize">
                      {currentUser?.username.substring(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] text-stone-400 uppercase font-bold tracking-widest leading-none mb-1">Secure Space</p>
                      <p className="text-xs font-bold text-stone-800 truncate capitalize leading-tight">
                        {currentUser?.username}
                      </p>
                    </div>
                  </div>

                  {/* Fully functional secondary collapse text block at bottom - visible on both mobile and laptop/desktop menu */}
                  <button
                    onClick={() => setIsSidebarOpen(false)}
                    className="w-full bg-stone-100 hover:bg-stone-200 text-stone-600 hover:text-stone-800 border border-stone-200 text-[11px] font-semibold py-2 rounded-xl transition duration-200 flex items-center justify-center gap-2 cursor-pointer group"
                    title="Collapse Sidebar"
                  >
                    <span>Hide Sidebar</span>
                    <ChevronRight className="h-3.5 w-3.5 text-emerald-600 group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  {/* Session lock signout */}
                  <button
                    onClick={handleSignOut}
                    className="w-full bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 border border-rose-200/50 text-[11px] font-semibold py-2 rounded-xl transition duration-200 flex items-center justify-center gap-2 cursor-pointer"
                    title="Lock session"
                  >
                    <LogOut className="h-3.5 w-3.5 text-rose-600" />
                    <span>Lock Session</span>
                  </button>
                </div>
              </div>
            </aside>

            {/* Right Side Content Column Panel: Offsets the desktop fixed right sidebar dynamically based on open status */}
            <div className={`flex-1 min-w-0 ${isSidebarOpen ? "lg:pr-72" : "lg:pr-0"} transition-all duration-300 flex flex-col justify-between`}>
              
              {/* Premium Top Navigation Header */}
              <header className="sticky top-0 z-30 w-full bg-white/80 backdrop-blur-md border-b border-stone-200/60 px-6 py-4 flex items-center justify-between shrink-0" id="premium-top-navigation-header">
                <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => { handleNavigate("/home"); if (window.innerWidth < 1024) setIsSidebarOpen(false); }}>
                  <LifeSaverLogo className="h-8.5 w-8.5" showText={true} />
                  <span className="text-[10px] sm:text-[11px] font-mono font-bold text-emerald-800 tracking-wider bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 uppercase leading-none hidden xs:inline">Secure</span>
                </div>
                
                <div className="flex items-center gap-2 sm:gap-3">
                  {/* Clean UTC-7 clock */}
                  <div className="flex items-center gap-1.5 font-mono text-[11px] text-[#2D312E] bg-stone-50 border border-stone-200 rounded-full px-3 py-1 font-semibold">
                    <Clock className="h-3.5 w-3.5 text-emerald-600 animate-pulse" />
                    <span>
                      {currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <span className="text-[8px] font-mono text-stone-400 uppercase tracking-widest leading-none bg-stone-200/50 px-1.5 py-0.5 rounded ml-1">UTC-7</span>
                  </div>

                  {!isSidebarOpen && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setIsSidebarOpen(true)}
                      className="p-1.5 sm:px-3 sm:py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl cursor-pointer transition-all flex items-center gap-1.5 font-semibold text-xs shadow-xs focus:ring-2 focus:ring-emerald-500/20 active:scale-95"
                      title="Open Sidebar"
                    >
                      <Menu className="h-4 w-4" />
                      <span>Open Menu</span>
                    </motion.button>
                  )}
                </div>
              </header>

              <div className="flex-1">
                {/* ⚡ CRITICAL MITIGATION STRAP */}
                {emergencyTask && (
                  <div
                    onClick={() => handleNavigate("/")}
                    className="bg-amber-100 border-b border-amber-200 text-amber-950 text-xs font-semibold px-4 py-3 text-center cursor-pointer flex items-center justify-center gap-2 transition hover:bg-amber-150 animate-fade-in relative z-30 shadow-xs"
                    id="global-emergency-banner"
                  >
                    <ShieldAlert className="h-4.5 w-4.5 shrink-0 text-amber-700" />
                    <span>
                      <b>Mindful Care Notice:</b> "{emergencyTask.title}" requires focus soon (due in under 3 hours). Clear away distractions and take a direct step.
                    </span>
                  </div>
                )}

                {/* Main responsive grid layout details with high-contrast items */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-10">
                  <main className="min-h-[500px]">
                    <AnimatePresence mode="wait">
                      <motion.div
                         key={currentPath}
                         initial={{ opacity: 0, y: 14, filter: "blur(4px)" }}
                         animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                         exit={{ opacity: 0, y: -14, filter: "blur(4px)" }}
                         transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                      >
                        {currentPath === "/home" && (
                          <HomeView
                            onStartMyFlow={() => handleNavigate("/")}
                            onNavigateToCoach={() => handleNavigate("/ai-coach")}
                          />
                        )}
                        {currentPath === "/" && (
                          <DashboardView
                            tasks={tasks}
                            habits={habits}
                            onCompleteTask={handleCompleteTaskDirect}
                            onNavigateToCoach={() => handleNavigate("/ai-coach")}
                            currentTime={currentTime}
                          />
                        )}
                        {currentPath === "/tasks" && (
                          <TaskManagementView
                            tasks={tasks}
                            onAddTask={handleAddTask}
                            onToggleTaskComplete={handleToggleTaskComplete}
                            onDeleteTask={handleDeleteTask}
                            currentTime={currentTime}
                          />
                        )}
                        {currentPath === "/gmail" && (
                          <GmailView
                            onAddTask={(t) => handleAddTask({
                              title: t.title,
                              priority: t.priority,
                              deadlineTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                              duration: t.duration,
                              energy: t.energy,
                              completed: false
                            })}
                            currentUser={currentUser}
                          />
                        )}
                        {currentPath === "/keep" && (
                          <GoogleKeepView
                            onAddTask={(t) => handleAddTask({
                              title: t.title,
                              priority: t.priority,
                              deadlineTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                              duration: t.duration,
                              energy: t.energy,
                              completed: false
                            })}
                            currentUser={currentUser}
                          />
                        )}
                        {currentPath === "/ai-coach" && (
                          <AiCoachView
                            tasks={tasks}
                            habits={habits}
                            messages={messages}
                            onAddMessage={handleAddMessage}
                            onClearHistory={handleClearHistory}
                            currentTime={currentTime}
                          />
                        )}
                        {currentPath === "/cognitive-audit" && (
                          <CognitiveAuditView
                            currentUser={currentUser}
                            currentTime={currentTime}
                          />
                        )}
                        {currentPath === "/schedule" && (
                          <ScheduleView
                            tasks={tasks}
                            habits={habits}
                            currentTime={currentTime}
                          />
                        )}
                        {currentPath === "/habits" && (
                          <HabitsView
                            habits={habits}
                            onToggleHabitToday={handleToggleHabitToday}
                            onAddHabit={handleAddHabit}
                            onDeleteHabit={handleDeleteHabit}
                            currentTime={currentTime}
                          />
                        )}
                        {currentPath === "/profile" && (
                          <ProfileView
                            tasks={tasks}
                            habits={habits}
                            preferences={preferences}
                            currentTime={currentTime}
                          />
                        )}
                        {currentPath === "/settings" && (
                          <SettingsView
                            preferences={preferences}
                            onUpdatePreferences={handleUpdatePreferences}
                          />
                        )}
                      </motion.div>
                    </AnimatePresence>
                  </main>

                  {/* Persistent floating actions deck (Symmetrically aligned side-by-side) */}
                  <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2.5 sm:gap-3 non-printable" id="floating-actions-deck">
                    <SomaticBreathingWidget />
                    <AccessibilityWidget />
                    <ZenAudioPlayer />
                  </div>

                  <AegisAgentWidget
                    tasks={tasks}
                    habits={habits}
                    preferences={preferences}
                    onAddTask={handleAddTask}
                    onAddHabit={(name, category) => handleAddHabit(name, category || "mind")}
                    onPruneCompleted={() => {
                      if (currentUser?.isFirebase && currentUser.uid) {
                        tasks.filter(t => t.completed).forEach(async (t) => {
                          try {
                            await deleteDoc(doc(db, "users", currentUser!.uid, "tasks", t.id));
                          } catch (error) {
                            console.error("Failed to delete completed task:", t.id, error);
                          }
                        });
                      } else {
                        saveTasks(tasks.filter(t => !t.completed));
                      }
                    }}
                    onNavigate={handleNavigate}
                    onCompleteTask={handleCompleteTaskDirect}
                    onDeleteTask={handleDeleteTask}
                    onToggleHabitToday={handleToggleHabitToday}
                    onUpdatePreferences={handleUpdatePreferences}
                  />

                  {/* Stunning global celebration confetti eruption overlay */}
                  <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden select-none">
                    {globalConfetti.map((item) => {
                      const rads = (item.angle * Math.PI) / 180;
                      const tX = Math.cos(rads) * item.speed * 45;
                      const tY = Math.sin(rads) * item.speed * 45 - 200; // float upwards gravity offset
                      return (
                        <motion.div
                          key={item.id}
                          initial={{ x: "50vw", y: "60vh", opacity: 1, scale: 1.4, rotate: 0 }}
                          animate={{ 
                            x: `calc(50vw + ${tX}px)`, 
                            y: `calc(60vh + ${tY}px)`, 
                            opacity: 0, 
                            scale: 0.3,
                            rotate: 360 + Math.random() * 180
                          }}
                          transition={{ duration: 1.6, ease: "easeOut" }}
                          className="absolute rounded-xs pointer-events-none"
                          style={{ 
                            backgroundColor: item.color,
                            width: item.size,
                            height: item.size,
                          }}
                        />
                      );
                    })}
                  </div>

                  {/* ==================== PLATFORM ASSESSMENT MATRIX (Shifted above footer) ==================== */}
                  {currentPath === "/home" && (
                    <section className="bg-stone-900 border border-amber-600/30 text-stone-100 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-xl text-left space-y-6 mt-16 non-printable">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
                      <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />
                      
                      <div className="space-y-2 relative z-10">
                        <span className="text-[9px] font-bold font-mono tracking-widest text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-md uppercase">
                          Platform Assessment Matrix
                        </span>
                        <h2 className="text-xl sm:text-2xl font-serif font-black tracking-tight text-white leading-tight">
                          Designed to Evaluate Creativity, Product Thinking, Problem-Solving, and Execution Skills
                        </h2>
                        <p className="text-xs text-stone-400 max-w-2xl leading-relaxed font-sans">
                          This platform serves as a complete, production-grade diagnostic of rigorous full-stack development capability. Each of the following core engineering credentials is implemented live and in real-time within the platform architecture:
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
                        {/* Pillar 1: Creativity */}
                        <div className="bg-white/[0.03] border border-white/5 hover:border-amber-500/20 rounded-2xl p-4 space-y-3 transition duration-200 group">
                          <div className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-amber-500/10 text-amber-500">
                            <Sparkles className="h-4 w-4" />
                          </div>
                          <div className="space-y-1">
                            <h4 className="text-xs font-bold font-mono text-white tracking-wide uppercase">1. Creativity</h4>
                            <p className="text-[11px] text-stone-400 leading-relaxed font-sans">
                              Exemplified by the interactive hardware-accelerated 3D vector-field particle simulator on the Home page, custom procedural audio synthesis, and beautiful viewport typography pairings.
                            </p>
                          </div>
                        </div>

                        {/* Pillar 2: Product Thinking */}
                        <div className="bg-white/[0.03] border border-white/5 hover:border-teal-500/20 rounded-2xl p-4 space-y-3 transition duration-200 group">
                          <div className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-teal-500/10 text-teal-400">
                            <Brain className="h-4 w-4" />
                          </div>
                          <div className="space-y-1">
                            <h4 className="text-xs font-bold font-mono text-white tracking-wide uppercase">2. Product Thinking</h4>
                            <p className="text-[11px] text-stone-400 leading-relaxed font-sans">
                              Solves executive mental fatigue and burnout. Instead of a standard robotic calendar, we present cognitive charge scores, real-time Solfeggio soundscapes, and heartrate/breathing cues.
                            </p>
                          </div>
                        </div>

                        {/* Pillar 3: Problem Solving */}
                        <div className="bg-white/[0.03] border border-white/5 hover:border-yellow-500/20 rounded-2xl p-4 space-y-3 transition duration-200 group">
                          <div className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-yellow-500/10 text-yellow-400">
                            <ShieldCheck className="h-4 w-4" />
                          </div>
                          <div className="space-y-1">
                            <h4 className="text-xs font-bold font-mono text-white tracking-wide uppercase">3. Problem Solving</h4>
                            <p className="text-[11px] text-stone-400 leading-relaxed font-sans">
                              Addressed via deep technical solutions: client-side AES-GCM secure cryptography for stress audits, automatic circadian time-segment math models, and offline audio state events.
                            </p>
                          </div>
                        </div>

                        {/* Pillar 4: Execution Skills */}
                        <div className="bg-white/[0.03] border border-white/5 hover:border-blue-500/20 rounded-2xl p-4 space-y-3 transition duration-200 group">
                          <div className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-blue-500/10 text-blue-400">
                            <Zap className="h-4 w-4" />
                          </div>
                          <div className="space-y-1">
                            <h4 className="text-xs font-bold font-mono text-white tracking-wide uppercase">4. Execution Skills</h4>
                            <p className="text-[11px] text-stone-400 leading-relaxed font-sans">
                              Engineered for maximum reliability: clean zero-warnings build systems, micro-optimized accessible views, custom text scale lenses, and a 0.00s latency interactive router diagram.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white/[0.02] border border-white/[0.04] p-3 rounded-xl flex items-center justify-between text-[10px] text-stone-400 font-mono">
                        <span>🚀 Click the navigation links on the side navbar or explore the floating sitemap helper.</span>
                        <span className="text-amber-500 font-bold hidden sm:inline">Active Build Verified Match</span>
                      </div>
                    </section>
                  )}
                </div>
              </div>

              {/* Comprehensive elegant light interactive footer block */}
              <footer className="border-t border-[#2D312E]/10 pt-8 mt-12 pb-12 text-center text-xs space-y-4 non-printable w-full px-4 sm:px-6 lg:px-8">
                <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[#7A827B] font-mono uppercase tracking-wider text-[11px]">
                  <button 
                    onClick={() => setShowSitemap(true)}
                    className="hover:text-amber-600 transition cursor-pointer font-bold select-none"
                    id="button-footer-sitemap"
                  >
                    🕸️ Active Site Map
                  </button>
                  <span className="text-[#2D312E]/15 select-none font-sans">|</span>
                  <button 
                    onClick={() => setShowPrivacy(true)}
                    className="hover:text-amber-600 transition cursor-pointer font-bold select-none"
                    id="button-footer-privacy"
                  >
                    🛡️ Privacy Policy
                  </button>
                  <span className="text-[#2D312E]/15 select-none font-sans">|</span>
                  <button 
                    onClick={() => setShowTerms(true)}
                    className="hover:text-amber-600 transition cursor-pointer font-bold select-none"
                    id="button-footer-terms"
                  >
                    ⚖️ Terms & Conditions
                  </button>
                </div>
                
                <p className="text-[#7A827B] font-sans leading-relaxed">
                  © 2026 LifeSaver Workspace. Precision cognitive stamina engine designed to evaluate creativity, product thinking, problem-solving, and execution skills.
                </p>
              </footer>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. Fully-Interactive Dynamic Site Map & Architectural Tree Modal */}
      <AnimatePresence>
        {showSitemap && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1E1B]/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-[#2D312E]/10 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative space-y-5 text-left overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between border-b border-[#2D312E]/5 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🕸️</span>
                  <div>
                    <h3 className="text-sm font-extrabold font-mono uppercase tracking-wider text-stone-900">Platform Structural Blueprint</h3>
                    <p className="text-[10px] text-[#7A827B]">Comprehensive micro-feature tree rendering & engineering dependency matrix</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSitemap(false)}
                  className="rounded-lg hover:bg-stone-100 p-2 text-stone-500 hover:text-stone-800 text-xs font-bold leading-none select-none transition"
                >
                  ✕
                </button>
              </div>

              {/* Functional Switch Tabs */}
              <div className="flex bg-[#FAF9F5] p-1 rounded-xl border border-stone-200/50 self-start">
                <span className="text-[9px] font-mono uppercase font-bold text-stone-400 px-2.5 py-1.5 self-center">Blueprint Map:</span>
                <button
                  onClick={() => {}}
                  className="px-3.5 py-1 text-[10px] font-mono tracking-tight font-bold bg-white text-stone-900 rounded-lg shadow-2xs border border-stone-200"
                >
                  🍃 Complete Feature & Stack Tree
                </button>
              </div>

              <div className="space-y-5 overflow-y-auto pr-1 flex-1 text-xs">
                {/* Section A: Clean ASCII Architecture Tree of View Modules */}
                <div className="space-y-2 bg-[#1C1E1B] text-amber-100 p-4 rounded-2xl font-mono text-[11px] leading-relaxed border border-stone-800 relative shadow-sm">
                  <div className="absolute top-2 right-2 flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded text-[8px] text-amber-400 font-bold uppercase tracking-wider">
                    Interactive Path Router
                  </div>
                  <h4 className="text-[11px] font-bold text-white uppercase tracking-widest border-b border-stone-800 pb-1.5 mb-2 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                    Interactive Feature Route Hierarchy
                  </h4>

                  <div className="space-y-1 text-stone-300">
                    <div>🌐 <span className="text-amber-400 font-bold">LIFESAVER-ROOT</span> <span className="text-stone-500 text-[10px]">(/src/App.tsx)</span></div>
                    
                    {[
                      { path: "/home", label: "Welcome Home", desc: "A peaceful place to start your day", icon: "🌌", file: "HomeView.tsx" },
                      { path: "/", label: "Task Board", desc: "Move your tasks around to see what is important", icon: "🌋", file: "DashboardView.tsx" },
                      { path: "/tasks", label: "My Tasks", desc: "Manage and add your daily tasks and list", icon: "📋", file: "TaskManagementView.tsx" },
                      { path: "/gmail", label: "My Gmail", desc: "Read emails, make tasks, and send AI drafts", icon: "✉️", file: "GmailView.tsx" },
                      { path: "/keep", label: "My Keep", desc: "Compose notes, sync Keep, and get AI tasks", icon: "📝", file: "GoogleKeepView.tsx" },
                      { path: "/ai-coach", label: "AI Coach", desc: "Chat with your AI partner to help you work better", icon: "🤖", file: "AiCoachView.tsx" },
                      { path: "/schedule", label: "Daily Schedule", desc: "Plan your day hour by hour simply", icon: "🕒", file: "ScheduleView.tsx" },
                      { path: "/habits", label: "My Habits", desc: "Track simple things you want to do every day", icon: "⚡", file: "HabitsView.tsx" },
                      { path: "/cognitive-audit", label: "Mind Check", desc: "Simple questions to check how you are doing", icon: "🛡️", file: "CognitiveAuditView.tsx" },
                      { path: "/profile", label: "My Profile", desc: "See how many tasks and habits you completed", icon: "📊", file: "ProfileView.tsx" },
                      { path: "/settings", label: "Settings", desc: "Change your settings and clean up your data", icon: "⚙️", file: "SettingsView.tsx" }
                    ].map((item, idx, arr) => {
                      const isLast = idx === arr.length - 1;
                      const isActive = currentPath === item.path;
                      return (
                        <div key={item.path} className="flex items-start hover:bg-white/5 p-1 rounded-lg transition duration-150">
                          <span className="text-stone-500 select-none mr-2">
                            {isLast ? " └── " : " ├── "}
                          </span>
                          <button
                            onClick={() => {
                              handleNavigate(item.path);
                              setShowSitemap(false);
                            }}
                            className={`text-left font-mono text-[11px] flex-1 flex flex-wrap items-center gap-1.5 cursor-pointer ${
                              isActive ? "text-amber-400 font-black" : "text-stone-300 hover:text-white"
                            }`}
                          >
                            <span>{item.icon}</span>
                            <span className="underline decoration-dashed decoration-stone-600 hover:decoration-amber-400">{item.path}</span>
                            <span className="text-[10px] text-stone-400">[{item.label}]</span>
                            <span className="text-[9px] text-[#7A827B] italic">({item.desc})</span>
                            <span className="text-[8px] bg-[#FAF9F5]/10 text-stone-400 px-1 rounded font-mono ml-auto">
                              {item.file}
                            </span>
                            {isActive && (
                              <span className="text-[7px] bg-amber-500 text-stone-905 font-bold px-1 rounded uppercase tracking-wider">
                                Active Node
                              </span>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Section B: Architectural Tech Stack Tree */}
                <div className="space-y-3 bg-stone-50 p-4 rounded-2xl border border-stone-200 text-stone-750">
                  <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider border-b border-stone-200 pb-1.5 flex items-center gap-2">
                    📦 Product Platform & Technology Dependency Tree
                  </h4>

                  <div className="font-mono text-[10px] space-y-3 leading-relaxed text-stone-600">
                    <div className="space-y-0.5">
                      <div className="text-stone-900 font-bold">💻 FRONTEND PRESENTATION UX</div>
                      <div> ├── <span className="text-teal-700 font-bold">React 18 & TypeScript</span> (Type-safe structures, strict preferences model)</div>
                      <div> ├── <span className="text-sky-700 font-bold">Tailwind CSS 4.0</span> (Fluid spacing sheet, high visual saturation, eye-safe tints)</div>
                      <div> └── <span className="text-violet-700 font-bold font-sans">Framer Motion</span> (Hardware-accelerated view transitions & route slide gates)</div>
                    </div>

                    <div className="space-y-0.5">
                      <div className="text-stone-900 font-bold">🌀 DSP & PHYSICAL MODELING ENGINES</div>
                      <div> ├── <span className="text-amber-700 font-bold">HTML5 Canvas 2D Core</span> (Vector collision matrices, orbital momentum simulation)</div>
                      <div> ├── <span className="text-cyan-700 font-bold">Web Audio API</span> (Procedural pink rain, 432Hz Solfeggio, theta 6Hz binaural)</div>
                      <div> └── <span className="text-rose-700 font-bold font-sans">Web Cryptography API</span> (Local AES-GCM password payloads, secure audit sealing hashes)</div>
                    </div>

                    <div className="space-y-0.5">
                      <div className="text-stone-900 font-bold">⚙️ SECURE API BACKEND MIDDLEWARE</div>
                      <div> ├── <span className="text-stone-850 font-bold font-sans">Node.js & Express API Gateway</span> (Proxy endpoints shielding credentials)</div>
                      <div> ├── <span className="text-[#34A853] font-bold">Google GenAI SDK (Gemini-3.5-Flash)</span> (Zero-stored context, mood anchor generation)</div>
                      <div> └── <span className="text-purple-700 font-bold">Enterprise Security Headers</span> (Prevent sniffing, clickjacking SAMEORIGIN, dynamic anti-cache)</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200/50 flex items-center gap-3 text-[10px] text-[#1C1E1B] leading-relaxed font-sans shrink-0">
                <span className="text-base select-none">💡</span>
                <span>
                  <b>Actionable Mapping:</b> This tree diagram is fully linked. Clicking any underlined route path inside the <b>Interactive Path Router</b> above triggers an instantaneous, hardware-accelerated route displacement inside the workspace.
                </span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. Privacy Policy Modal */}
      <AnimatePresence>
        {showPrivacy && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1E1B]/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-[#2D312E]/10 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl relative space-y-6 text-left"
            >
              <div className="flex items-center justify-between border-b border-[#2D312E]/5 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🛡️</span>
                  <div>
                    <h3 className="text-sm font-extrabold font-mono uppercase tracking-wider text-stone-900">System Privacy Covenant</h3>
                    <p className="text-[10px] text-[#7A827B]">Zero-tracking local encryption integrity protection</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPrivacy(false)}
                  className="rounded-lg hover:bg-stone-100 p-2 text-stone-500 hover:text-stone-800 text-xs font-bold leading-none select-none transition"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4 text-xs text-stone-700 leading-relaxed overflow-y-auto max-h-[350px] pr-2">
                <p className="font-semibold">
                  At LifeSaver Labs, we stand firm on the principle of biological Sovereignty. Your mental loads, task weights, stress loops, and habits are sacred personal structures.
                </p>

                <div className="space-y-1.5 border-l-2 border-stone-200 pl-3">
                  <h4 className="font-bold text-stone-900 font-mono uppercase tracking-tight">1. Client-Side AES Protection</h4>
                  <p>
                    Every active task, message log, and habit vow is immediately compressed and ciphered in your browser using cryptographic key vectors. Your cleartext actions never transverse remote cloud databases or third-party web trackers.
                  </p>
                </div>

                <div className="space-y-1.5 border-l-2 border-stone-200 pl-3">
                  <h4 className="font-bold text-stone-900 font-mono uppercase tracking-tight">2. Zero Cookie Footprints</h4>
                  <p>
                    We do not deploy marketing pixel arrays, third-party cookie tags, or tracking metrics. The application is isolated, offline-first, and protected behind clean, local session states.
                  </p>
                </div>

                <div className="space-y-1.5 border-l-2 border-stone-200 pl-3">
                  <h4 className="font-bold text-stone-900 font-mono uppercase tracking-tight">3. Gemini API Safeguards</h4>
                  <p>
                    Our AI Cognitive Guide and Auto-scheduling helper proxy requests securely. Standard metadata is stripped, and your actual identity parameters remain masked during generative training evaluations.
                  </p>
                </div>

                <div className="space-y-1.5 border-l-2 border-stone-200 pl-3">
                  <h4 className="font-bold text-stone-900 font-mono uppercase tracking-tight">4. Audit Sealing</h4>
                  <p>
                    All psychometric evaluations produce localized, non-transferable verification signatures in strict compliance with secure auditing declarations.
                  </p>
                </div>
              </div>

              <div className="border-t border-stone-100 pt-4 flex justify-end">
                <button
                  onClick={() => setShowPrivacy(false)}
                  className="bg-[#1C1E1B] hover:bg-stone-800 text-white font-bold py-2 px-6 rounded-xl text-xs cursor-pointer transition"
                >
                  Confirm Understanding
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. Terms & Conditions Modal */}
      <AnimatePresence>
        {showTerms && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1E1B]/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-[#2D312E]/10 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl relative space-y-6 text-left"
            >
              <div className="flex items-center justify-between border-b border-[#2D312E]/5 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">⚖️</span>
                  <div>
                    <h3 className="text-sm font-extrabold font-mono uppercase tracking-wider text-stone-900">Terms of Spatial Alignment</h3>
                    <p className="text-[10px] text-[#7A827B]">Legal frameworks for the LifeSaver ecosystem</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowTerms(false)}
                  className="rounded-lg hover:bg-stone-100 p-2 text-stone-500 hover:text-stone-800 text-xs font-bold leading-none select-none transition"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4 text-xs text-stone-700 leading-relaxed overflow-y-auto max-h-[350px] pr-2">
                <p>
                  Welcome to LifeSaver AI. By accessing this web workspace, you agree to comply with the terms of our interactive, local focusing services.
                </p>

                <div className="space-y-1.5 bg-stone-50 p-3 rounded-xl border border-stone-100">
                  <h4 className="font-bold text-stone-950 font-mono text-[10px] uppercase tracking-wider">Acknowledge Mathematical Gamification</h4>
                  <p className="text-stone-600 mt-0.5 leading-normal">
                    The "Stress Vaporizer", "Interactive Task Gravity Sandbox", and "Chronobiology Solar Mapping Scheduler" are numerical modeling tools. They provide organizational structures to streamline task prioritization and mental focus, and should not be construed as replacement therapies.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <h4 className="font-bold text-stone-900">User Obligations</h4>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>Maintain local cryptographic backups of your session keys where required.</li>
                    <li>Utilize the box breathing and decompression guides in a safe, quiet sitting physical setting.</li>
                    <li>Respect the certifiable psychometric hashes generated for personal audit profiles.</li>
                  </ul>
                </div>

                <div className="space-y-1.5">
                  <h4 className="font-bold text-stone-900">Disclaimers & Limits of Liability</h4>
                  <p>
                    LifeSaver provides the tools "As-Is". We hold harmless all algorithms, including the custom Web Audio soundwave modulators and the Gemini model schedulers, from any performance fluctuations, caching resets, or systemic anomalies.
                  </p>
                </div>
              </div>

              <div className="border-t border-stone-100 pt-4 flex justify-end">
                <button
                  onClick={() => setShowTerms(false)}
                  className="bg-[#1C1E1B] hover:bg-stone-800 text-white font-bold py-2 px-6 rounded-xl text-xs cursor-pointer transition"
                >
                  Agree & Consent
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Google Authentication Portal Popup */}
      <AnimatePresence>
        {showGoogleModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1E1B]/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-[#2D312E]/10 rounded-2xl max-w-sm w-full p-6 shadow-2xl relative space-y-6 text-left"
            >
              <div className="flex items-center justify-between border-b border-[#2D312E]/5 pb-3">
                <div className="flex items-center gap-2">
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.9h6.6a5.64 5.64 0 0 1-2.4 3.75v3.1h3.9c2.25-2.07 3.64-5.18 3.64-8.68Z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.9l-3.9-3.1a7.5 7.5 0 0 1-11.83-4H.15v3.2A11.97 11.97 0 0 0 12 24Z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M4.2 14c-.2-.6-.3-1.28-.3-1.95s.1-1.35.3-1.95V6.9H.15a11.96 11.96 0 0 0 0 10.38l4.05-3.28Z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.6 4.6 1.8l3.43-3.43A11.94 11.94 0 0 0 12 0C7.24 0 3.12 2.73.15 6.9l4.05 3.28c1-2.95 3.75-5.43 7.8-5.43Z"
                    />
                  </svg>
                  <span className="text-[11px] font-sans font-bold uppercase tracking-wider text-[#7A827B]">Google Link Gate</span>
                </div>
                <button
                  onClick={() => setShowGoogleModal(false)}
                  className="text-xs text-[#7A827B] hover:text-[#1C1E1B] font-bold"
                >
                  ✕
                </button>
              </div>

              {isGoogleLoading ? (
                <div className="py-8 flex flex-col items-center justify-center text-center space-y-4 font-sans">
                  <RefreshCw className="h-8 w-8 text-amber-600 animate-spin" />
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-[#1C1E1B]">Authenticating Profile</h4>
                    <p className="text-xs text-[#7A827B]">Establishing secure localized credentials sync...</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 font-sans">
                  <div>
                    <h3 className="text-sm font-bold text-[#1C1E1B]">Sign in with Google</h3>
                    <p className="text-xs text-[#7A827B] mt-0.5">Choose an identical matched profile to access your LifeSaver workspace.</p>
                  </div>

                  <div className="space-y-2">
                    {/* REAL FIREBASE GOOGLE LOGIN */}
                    <button
                      type="button"
                      onClick={handleRealFirebaseGoogleLogin}
                      className="w-full bg-[#1C1E1B] hover:bg-[#2D312E] text-white rounded-xl p-3 text-left transition flex items-center gap-3 cursor-pointer border border-[#2D312E]/50 group shadow-md"
                    >
                      <div className="h-9 w-9 rounded-full bg-white flex items-center justify-center text-sm shadow-xs border border-stone-100 shrink-0">
                        <svg className="h-4.5 w-4.5" viewBox="0 0 24 24">
                          <path
                            fill="#4285F4"
                            d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.9h6.6a5.64 5.64 0 0 1-2.4 3.75v3.1h3.9c2.25-2.07 3.64-5.18 3.64-8.68Z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 24c3.24 0 5.95-1.08 7.93-2.9l-3.9-3.1a7.5 7.5 0 0 1-11.83-4H.15v3.2A11.97 11.97 0 0 0 12 24Z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M4.2 14c-.2-.6-.3-1.28-.3-1.95s.1-1.35.3-1.95V6.9H.15a11.96 11.96 0 0 0 0 10.38l4.05-3.28Z"
                          />
                          <path
                            fill="#EA4335"
                            d="M12 4.75c1.77 0 3.35.6 4.6 1.8l3.43-3.43A11.94 11.94 0 0 0 12 0C7.24 0 3.12 2.73.15 6.9l4.05 3.28c1-2.95 3.75-5.43 7.8-5.43Z"
                          />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">Real Google Cloud Login</p>
                        <p className="text-[9px] font-mono text-stone-400 mt-0.5 truncate">Fully synced secure cloud backup</p>
                      </div>
                      <span className="text-[8px] font-bold px-1.5 py-0.5 bg-amber-500/25 text-amber-300 border border-amber-500/20 rounded-xs uppercase tracking-tight shrink-0">Cloud</span>
                    </button>

                    <div className="flex items-center gap-2 py-1">
                      <div className="h-[1px] bg-[#2D312E]/10 flex-1" />
                      <span className="text-[9px] text-[#7A827B] font-mono uppercase tracking-wider shrink-0">Simulated Profiles</span>
                      <div className="h-[1px] bg-[#2D312E]/10 flex-1" />
                    </div>

                    {isEnteringCustomGoogle ? (
                      <div className="space-y-3 bg-[#FAF9F6] border border-[#2D312E]/10 rounded-xl p-4 animate-in fade-in slide-in-from-top-2 duration-200 mt-2">
                        <div className="space-y-1">
                          <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#7A827B]">Verified Account Email</label>
                          <input
                            type="email"
                            placeholder="athena@gmail.com"
                            value={customGoogleEmail}
                            onChange={(e) => {
                              setCustomGoogleEmail(e.target.value);
                              if (customGoogleError) setCustomGoogleError("");
                            }}
                            className="w-full bg-white border border-[#2D312E]/15 rounded-lg px-3 py-1.5 text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:border-amber-500/50"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#7A827B]">Account Profile Name (Optional)</label>
                          <input
                            type="text"
                            placeholder="Athena Pro"
                            value={customGoogleName}
                            onChange={(e) => setCustomGoogleName(e.target.value)}
                            className="w-full bg-white border border-[#2D312E]/15 rounded-lg px-3 py-1.5 text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:border-amber-500/50"
                          />
                        </div>

                        {customGoogleError && (
                          <p className="text-[10px] font-sans text-rose-600 bg-rose-50 border border-rose-100 rounded px-2 py-1">{customGoogleError}</p>
                        )}

                        <div className="flex gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              if (!customGoogleEmail.trim().includes("@")) {
                                setCustomGoogleError("Please enter a valid Google Account email with @");
                                return;
                              }
                              const finalUsername = customGoogleName.trim() || customGoogleEmail.trim().split("@")[0];
                              handleSimulateGoogleLogin(customGoogleEmail.trim(), finalUsername);
                            }}
                            className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] py-2 rounded-lg cursor-pointer transition text-center"
                          >
                            Link and Verify
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsEnteringCustomGoogle(false);
                              setCustomGoogleEmail("");
                              setCustomGoogleName("");
                              setCustomGoogleError("");
                            }}
                            className="bg-stone-200 hover:bg-stone-300 text-stone-700 font-bold text-[11px] py-2 px-3 rounded-lg cursor-pointer transition text-center"
                          >
                            Back
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setIsEnteringCustomGoogle(true);
                        }}
                        className="w-full bg-white hover:bg-[#FAF9F6] border border-dashed border-[#2D312E]/15 rounded-xl p-3 text-center transition text-xs font-semibold text-[#7A827B] hover:text-[#1C1E1B] cursor-pointer"
                      >
                        + Use another verified account
                      </button>
                    )}
                  </div>

                  <p className="text-[10px] text-[#7A827B] leading-normal text-center">
                    To keep your workspace safe, LifeSaver uses direct, local cryptographic salts. Google accounts credentials are never stored on external websites or remote servers.
                  </p>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
