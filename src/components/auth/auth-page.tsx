'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Cpu, Github, Mail, Eye, EyeOff, ArrowRight, Sparkles } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useI18n } from '@/hooks/use-i18n'
import { cn } from '@/lib/utils'

type AuthMode = 'login' | 'register'

export function AuthPage() {
  const { t } = useI18n()
  const [mode, setMode] = useState<AuthMode>('login')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const isLogin = mode === 'login'

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-8rem)] py-8">
      <div className="w-full max-w-md">
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

        {/* Auth Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="border-border/50 overflow-hidden">
            {/* Gradient top accent */}
            <div className="h-1 bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-500" />
            
            <CardContent className="p-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={mode}
                  initial={{ opacity: 0, x: isLogin ? -20 : 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: isLogin ? 20 : -20 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                >
                  {/* Form */}
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
                    >
                      <Github className="h-4 w-4" />
                      GitHub
                    </Button>
                    <Button
                      variant="outline"
                      className="h-10 gap-2 font-medium"
                      type="button"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24">
                        <path
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                          fill="#4285F4"
                        />
                        <path
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          fill="#34A853"
                        />
                        <path
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          fill="#FBBC05"
                        />
                        <path
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          fill="#EA4335"
                        />
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
                      onClick={() => setMode(isLogin ? 'register' : 'login')}
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
      </div>
    </div>
  )
}
