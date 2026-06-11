'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Cpu, Github, Mail, Eye, EyeOff, ArrowRight, ArrowLeft, Sparkles,
  Building2, Zap, Users, Target, CheckCircle2, Loader2
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useI18n } from '@/hooks/use-i18n'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'

type AuthStep = 'login' | 'register' | 'workspace' | 'seeding' | 'complete'

const stepVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 80 : -80,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 80 : -80,
    opacity: 0,
  }),
}

// ── Progress Indicator ──
function ProgressIndicator({ currentStep, steps }: { currentStep: number; steps: { key: string; label: string }[] }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {steps.map((s, i) => (
        <React.Fragment key={s.key}>
          <div
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all duration-300',
              i < currentStep
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                : i === currentStep
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 scale-110'
                  : 'bg-muted text-muted-foreground'
            )}
          >
            {i < currentStep ? <CheckCircle2 className="h-4 w-4" /> : s.label}
          </div>
          {i < steps.length - 1 && (
            <div
              className={cn(
                'h-0.5 w-8 rounded-full transition-all duration-500',
                i < currentStep ? 'bg-emerald-500' : 'bg-muted'
              )}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  )
}

// ── Login / Register Form ──
function AuthForm({
  isLogin,
  name, setName,
  email, setEmail,
  password, setPassword,
  confirmPassword, setConfirmPassword,
  showPassword, setShowPassword,
  showConfirmPassword, setShowConfirmPassword,
  onLogin, onRegister, onToggleMode, direction,
  t,
}: {
  isLogin: boolean
  name: string; setName: (v: string) => void
  email: string; setEmail: (v: string) => void
  password: string; setPassword: (v: string) => void
  confirmPassword: string; setConfirmPassword: (v: string) => void
  showPassword: boolean; setShowPassword: (v: boolean) => void
  showConfirmPassword: boolean; setShowConfirmPassword: (v: boolean) => void
  onLogin: () => void
  onRegister: () => void
  onToggleMode: () => void
  direction: number
  t: (key: string) => string
}) {
  return (
    <>
      {/* Logo and Title */}
      <motion.div
        className="text-center mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-lg shadow-emerald-500/25 mb-4">
          <Cpu className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">
          {isLogin ? t('auth.welcomeBack') : t('auth.signUp')}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {isLogin ? t('auth.signInDesc') : t('auth.createAccountDesc')}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Card className="border-border/50 overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-500" />

          <CardContent className="p-6">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={isLogin ? 'login' : 'register'}
                custom={direction}
                initial="enter"
                animate="center"
                exit="exit"
                variants={stepVariants}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
              >
                <div className="space-y-4">
                  {!isLogin && (
                    <motion.div
                      className="space-y-2"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Label htmlFor="name" className="text-sm font-medium">
                        {t('auth.name')}
                      </Label>
                      <Input
                        id="name"
                        type="text"
                        placeholder="John Doe"
                        className="h-10"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </motion.div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium">
                      {t('auth.email')}
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        className="h-10 pl-10"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium">
                      {t('auth.password')}
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        className="h-10 pr-10"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {!isLogin && (
                    <motion.div
                      className="space-y-2"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3, delay: 0.1 }}
                    >
                      <Label htmlFor="confirmPassword" className="text-sm font-medium">
                        {t('auth.confirmPassword')}
                      </Label>
                      <div className="relative">
                        <Input
                          id="confirmPassword"
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          className="h-10 pr-10"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {!isLogin && password && confirmPassword && password !== confirmPassword && (
                        <p className="text-xs text-red-500">Passwords do not match</p>
                      )}
                    </motion.div>
                  )}

                  {isLogin && (
                    <div className="flex items-center justify-end">
                      <button
                        type="button"
                        className="text-sm text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors"
                      >
                        {t('auth.forgotPassword')}
                      </button>
                    </div>
                  )}

                  <Button
                    className={cn(
                      'w-full h-10 gap-2 font-semibold',
                      'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600',
                      'text-white shadow-md shadow-emerald-500/20'
                    )}
                    onClick={isLogin ? onLogin : onRegister}
                    disabled={!isLogin ? (!name || !email || !password || password !== confirmPassword) : !email}
                  >
                    {isLogin ? t('auth.signIn') : t('auth.signUp')}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>

                {/* Divider */}
                <div className="relative my-6">
                  <Separator />
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-xs text-muted-foreground">
                    {t('auth.signInWith')}
                  </span>
                </div>

                {/* Social Login */}
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    className="h-10 gap-2 font-medium"
                    type="button"
                    onClick={onLogin}
                  >
                    <Github className="h-4 w-4" />
                    GitHub
                  </Button>
                  <Button
                    variant="outline"
                    className="h-10 gap-2 font-medium"
                    type="button"
                    onClick={onLogin}
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Google
                  </Button>
                </div>

                {/* Toggle Mode */}
                <div className="mt-6 text-center text-sm">
                  <span className="text-muted-foreground">
                    {isLogin ? t('auth.noAccount') : t('auth.hasAccount')}
                  </span>{' '}
                  <button
                    type="button"
                    className="text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300 font-semibold transition-colors"
                    onClick={onToggleMode}
                  >
                    {isLogin ? t('auth.signUpLink') : t('auth.signInLink')}
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>

      {/* Bottom accent */}
      <motion.div
        className="mt-6 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Sparkles className="h-3 w-3 text-emerald-500" />
          <span>InferBench Pro — Secure & Reliable</span>
          <Sparkles className="h-3 w-3 text-emerald-500" />
        </div>
      </motion.div>
    </>
  )
}

// ── Workspace Setup Form ──
function WorkspaceForm({
  orgName, setOrgName,
  defaultEngine, setDefaultEngine,
  teamSize, setTeamSize,
  useCase, setUseCase,
  onBack, onNext,
  currentStepIndex, t,
}: {
  orgName: string; setOrgName: (v: string) => void
  defaultEngine: string; setDefaultEngine: (v: string) => void
  teamSize: string; setTeamSize: (v: string) => void
  useCase: string; setUseCase: (v: string) => void
  onBack: () => void
  onNext: () => void
  currentStepIndex: number
  t: (key: string) => string
}) {
  const steps = [
    { key: 'register', label: '1' },
    { key: 'workspace', label: '2' },
    { key: 'seeding', label: '3' },
  ]

  return (
    <>
      <motion.div
        className="text-center mb-6"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/25 mb-3">
          <Building2 className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-bold tracking-tight">{t('auth.workspace.title')}</h2>
        <p className="text-muted-foreground text-sm mt-1">{t('auth.workspace.subtitle')}</p>
      </motion.div>

      <ProgressIndicator currentStep={currentStepIndex} steps={steps} />

      <Card className="border-border/50 overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-amber-500 via-emerald-400 to-emerald-500" />

        <CardContent className="p-6 space-y-6">
          {/* Organization Name */}
          <div className="space-y-2">
            <Label htmlFor="orgName" className="text-sm font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4 text-amber-500" />
              {t('auth.workspace.orgName')}
            </Label>
            <Input
              id="orgName"
              type="text"
              placeholder={t('auth.workspace.orgNamePlaceholder')}
              className="h-10"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
            />
          </div>

          {/* Default Engine Preference */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              {t('auth.workspace.defaultEngine')}
            </Label>
            <RadioGroup
              value={defaultEngine}
              onValueChange={setDefaultEngine}
              className="grid grid-cols-3 gap-3"
            >
              {[
                { value: 'vllm', label: t('auth.workspace.defaultEngineVllm'), icon: '🚀' },
                { value: 'sglang', label: t('auth.workspace.defaultEngineSglang'), icon: '⚡' },
                { value: 'both', label: t('auth.workspace.defaultEngineBoth'), icon: '🔧' },
              ].map((opt) => (
                <Label
                  key={opt.value}
                  className={cn(
                    'flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 cursor-pointer transition-all duration-200',
                    defaultEngine === opt.value
                      ? 'border-emerald-500 bg-emerald-500/5 shadow-sm shadow-emerald-500/10'
                      : 'border-border hover:border-emerald-300 hover:bg-emerald-500/5'
                  )}
                >
                  <RadioGroupItem value={opt.value} className="sr-only" />
                  <span className="text-lg">{opt.icon}</span>
                  <span className="text-xs font-medium text-center">{opt.label}</span>
                </Label>
              ))}
            </RadioGroup>
          </div>

          {/* Team Size */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-amber-500" />
              {t('auth.workspace.teamSize')}
            </Label>
            <RadioGroup
              value={teamSize}
              onValueChange={setTeamSize}
              className="grid grid-cols-2 gap-3"
            >
              {[
                { value: '1-5', label: t('auth.workspace.teamSize1') },
                { value: '6-20', label: t('auth.workspace.teamSize2') },
                { value: '21-50', label: t('auth.workspace.teamSize3') },
                { value: '50+', label: t('auth.workspace.teamSize4') },
              ].map((opt) => (
                <Label
                  key={opt.value}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border-2 px-3 py-2 cursor-pointer transition-all duration-200',
                    teamSize === opt.value
                      ? 'border-emerald-500 bg-emerald-500/5 shadow-sm shadow-emerald-500/10'
                      : 'border-border hover:border-emerald-300 hover:bg-emerald-500/5'
                  )}
                >
                  <RadioGroupItem value={opt.value} />
                  <span className="text-sm font-medium">{opt.label}</span>
                </Label>
              ))}
            </RadioGroup>
          </div>

          {/* Use Case */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-amber-500" />
              {t('auth.workspace.useCase')}
            </Label>
            <RadioGroup
              value={useCase}
              onValueChange={setUseCase}
              className="grid grid-cols-2 gap-3"
            >
              {[
                { value: 'research', label: t('auth.workspace.useCaseResearch'), icon: '🔬' },
                { value: 'production', label: t('auth.workspace.useCaseProduction'), icon: '🏭' },
                { value: 'benchmarking', label: t('auth.workspace.useCaseBenchmarking'), icon: '📊' },
                { value: 'other', label: t('auth.workspace.useCaseOther'), icon: '💡' },
              ].map((opt) => (
                <Label
                  key={opt.value}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border-2 px-3 py-2 cursor-pointer transition-all duration-200',
                    useCase === opt.value
                      ? 'border-emerald-500 bg-emerald-500/5 shadow-sm shadow-emerald-500/10'
                      : 'border-border hover:border-emerald-300 hover:bg-emerald-500/5'
                  )}
                >
                  <RadioGroupItem value={opt.value} />
                  <span className="text-sm">{opt.icon}</span>
                  <span className="text-sm font-medium">{opt.label}</span>
                </Label>
              ))}
            </RadioGroup>
          </div>

          {/* Navigation buttons */}
          <div className="flex items-center gap-3 pt-2">
            <Button
              variant="outline"
              className="gap-2 h-10"
              onClick={onBack}
            >
              <ArrowLeft className="h-4 w-4" />
              {t('auth.workspace.back')}
            </Button>
            <Button
              className={cn(
                'flex-1 h-10 gap-2 font-semibold',
                'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600',
                'text-white shadow-md shadow-emerald-500/20'
              )}
              onClick={onNext}
              disabled={!orgName}
            >
              {t('auth.workspace.next')}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  )
}

// ── Seeding / Loading State ──
function SeedingView({ currentStepIndex, t }: { currentStepIndex: number; t: (key: string) => string }) {
  const steps = [
    { key: 'register', label: '1' },
    { key: 'workspace', label: '2' },
    { key: 'seeding', label: '3' },
  ]

  return (
    <>
      <ProgressIndicator currentStep={currentStepIndex} steps={steps} />
      <motion.div
        className="text-center py-12"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-xl shadow-emerald-500/30 mb-6">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            <Loader2 className="h-8 w-8" />
          </motion.div>
        </div>
        <h2 className="text-xl font-bold tracking-tight mb-2">{t('auth.workspace.settingUp')}</h2>
        <p className="text-muted-foreground text-sm mb-8">{t('auth.workspace.preparingDemo')}</p>

        {/* Animated progress bar */}
        <div className="max-w-xs mx-auto">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 rounded-full"
              initial={{ width: '0%' }}
              animate={{ width: '90%' }}
              transition={{ duration: 2, ease: 'easeInOut' }}
            />
          </div>
          <div className="mt-4 flex justify-center gap-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="h-2 w-2 rounded-full bg-emerald-500"
                animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
              />
            ))}
          </div>
        </div>
      </motion.div>
    </>
  )
}

// ── Complete View ──
function CompleteView({ t }: { t: (key: string) => string }) {
  return (
    <motion.div
      className="text-center py-12"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, type: 'spring' }}
    >
      <motion.div
        className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-xl shadow-emerald-500/30 mb-6"
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 0.6, repeat: 2 }}
      >
        <CheckCircle2 className="h-8 w-8" />
      </motion.div>
      <h2 className="text-xl font-bold tracking-tight mb-2">{t('auth.workspace.complete')}</h2>
      <p className="text-muted-foreground text-sm">{t('auth.workspace.completeDesc')}</p>
    </motion.div>
  )
}

// ── Main Auth Page ──
export function AuthPage() {
  const { t } = useI18n()
  const { setActivePage, setAuthenticated, setUser } = useAppStore()

  const [step, setStep] = useState<AuthStep>('login')
  const [direction, setDirection] = useState(1)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Form fields
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Workspace fields
  const [orgName, setOrgName] = useState('')
  const [defaultEngine, setDefaultEngine] = useState('both')
  const [teamSize, setTeamSize] = useState('1-5')
  const [useCase, setUseCase] = useState('research')

  const steps = [
    { key: 'register', label: '1' },
    { key: 'workspace', label: '2' },
    { key: 'seeding', label: '3' },
  ]
  const currentStepIndex = steps.findIndex((s) => s.key === step)

  const goToStep = (newStep: AuthStep, dir: number) => {
    setDirection(dir)
    setStep(newStep)
  }

  const handleLogin = () => {
    if (!email) return
    setAuthenticated(true)
    setUser({ name: name || email.split('@')[0], email })
    setActivePage('dashboard')
  }

  const handleRegister = () => {
    if (!name || !email || !password || password !== confirmPassword) return
    goToStep('workspace', 1)
  }

  const handleWorkspaceNext = async () => {
    goToStep('seeding', 1)
    // Call the seed API
    try {
      await fetch('/api/seed', { method: 'POST' })
    } catch {
      // Ignore seed errors - demo data is optional
    }
    // Simulate setup time
    await new Promise((resolve) => setTimeout(resolve, 2000))
    setAuthenticated(true)
    setUser({ name, email })
    goToStep('complete', 1)
    // Auto navigate after showing completion
    setTimeout(() => {
      setActivePage('dashboard')
    }, 1500)
  }

  const handleToggleMode = () => {
    if (step === 'login') {
      goToStep('register', 1)
    } else {
      goToStep('login', -1)
    }
  }

  const isLogin = step === 'login'

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-8rem)] py-8">
      <div className="w-full max-w-md">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            initial="enter"
            animate="center"
            exit="exit"
            variants={stepVariants}
            transition={{ duration: 0.35, ease: 'easeInOut' }}
          >
            {(step === 'login' || step === 'register') && (
              <AuthForm
                isLogin={isLogin}
                name={name} setName={setName}
                email={email} setEmail={setEmail}
                password={password} setPassword={setPassword}
                confirmPassword={confirmPassword} setConfirmPassword={setConfirmPassword}
                showPassword={showPassword} setShowPassword={setShowPassword}
                showConfirmPassword={showConfirmPassword} setShowConfirmPassword={setShowConfirmPassword}
                onLogin={handleLogin}
                onRegister={handleRegister}
                onToggleMode={handleToggleMode}
                direction={direction}
                t={t}
              />
            )}
            {step === 'workspace' && (
              <WorkspaceForm
                orgName={orgName} setOrgName={setOrgName}
                defaultEngine={defaultEngine} setDefaultEngine={setDefaultEngine}
                teamSize={teamSize} setTeamSize={setTeamSize}
                useCase={useCase} setUseCase={setUseCase}
                onBack={() => goToStep('register', -1)}
                onNext={handleWorkspaceNext}
                currentStepIndex={currentStepIndex}
                t={t}
              />
            )}
            {step === 'seeding' && (
              <SeedingView currentStepIndex={currentStepIndex} t={t} />
            )}
            {step === 'complete' && (
              <CompleteView t={t} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
