'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Eye, EyeOff } from 'lucide-react'
import { setToken } from '@/lib/api'
import Image from 'next/image'
import { useIssuerLogin, useInvestorLogin } from '@/lib/hooks/useAuth'

export default function LoginPageContent({ initialMode = 'founder' }: Readonly<{ initialMode?: 'investor' | 'founder' }>) {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)

  const issuerLoginMutation = useIssuerLogin()
  const investorLoginMutation = useInvestorLogin()

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (!username || !password) { toast.error('Enter email and password'); return }

    if (initialMode === 'founder') {
      issuerLoginMutation.mutate(
        { email: username, password, deviceToken: 'web' },
        {
          onSuccess: (res) => {
            const token = res.user.token
            const mappedUser = {
              id: res.user._id,
              username: res.user.email,
              company_legal_name: res.user.company_legal_name || res.user.companyLegalName || res.user.company_name || res.user.companyName || '',
              scope: 'issuer',
              perm: {
                admin: true,
                modify: true,
                delete: true,
                create: true,
                share: true,
                download: true,
                rename: true,
              }
            }
            setToken(token, mappedUser as any)
            toast.success('Welcome back!')
            router.replace('/dashboard/files')
          },
          onError: (err: any) => {
            const data = err.response?.data
            let errMsg = err.message || 'Login failed'
            if (data) {
              if (typeof data.message === 'string') {
                errMsg = data.message
              } else if (Array.isArray(data.message)) {
                const first = data.message[0]
                if (typeof first === 'string') {
                  errMsg = first
                } else if (first && typeof first === 'object') {
                  const vals = Object.values(first)
                  if (vals[0] && typeof vals[0] === 'string') {
                    errMsg = vals[0]
                  }
                }
              } else if (data.error) {
                errMsg = data.error
              }
            }
            toast.error(errMsg)
          },
        }
      )
    } else {
      investorLoginMutation.mutate(
        { email: username, password, deviceToken: 'web' },
        {
          onSuccess: (res) => {
            const data = res?.success ? res.data : res
            const token = data?.accessToken || data?.user?.token || data?.token || res?.token
            const refreshToken = data?.refreshToken || res?.refreshToken
            const userId = data?.user?.id || data?.user?._id || data?._id || data?.id
            const email = data?.user?.email || data?.email || username

            if (!token) {
              toast.error('Token not found in login response')
              return
            }

            const firstName = data?.user?.first_name || ''
            const lastName = data?.user?.last_name || ''
            const fullName = [firstName, lastName].filter(Boolean).join(' ')

            const mappedUser = {
              id: userId || 'investor',
              username: email,
              company_legal_name: fullName || data?.user?.username || email,
              scope: 'investor',
              perm: {
                admin: false,
                modify: false,
                delete: false,
                create: false,
                share: false,
                download: true,
                rename: false,
              }
            }
            setToken(token, mappedUser as any, refreshToken)
            toast.success('Welcome back!')
            router.replace('/dashboard/files')
          },
          onError: (err: any) => {
            const data = err.response?.data
            let errMsg = err.message || 'Login failed'
            if (data) {
              if (typeof data.message === 'string') {
                errMsg = data.message
              } else if (Array.isArray(data.message)) {
                const first = data.message[0]
                if (typeof first === 'string') {
                  errMsg = first
                } else if (first && typeof first === 'object') {
                  const vals = Object.values(first)
                  if (vals[0] && typeof vals[0] === 'string') {
                    errMsg = vals[0]
                  }
                }
              } else if (data.error) {
                errMsg = data.error
              }
            }
            toast.error(errMsg)
          },
        }
      )
    }
  }

  const loading = issuerLoginMutation.isPending || investorLoginMutation.isPending

  return (
    <div
      className="min-h-screen flex items-stretch bg-cover bg-bottom bg-no-repeat"
      style={{ backgroundImage: 'url(/images/BackgroundImage.png)' }}
    >
      <div className="flex w-full min-h-[calc(100vh-48px)]">
        {/* LEFT — aside panel */}
        <aside className="leftside-panel w-1/2 pt-0 pb-8 pl-[64px] pr-[64px] flex flex-col justify-between relative">
          <div>
            {/* Logo */}
            <div className="min-h-[64px] flex items-center">
              <a
                href="/"
                onClick={(e) => { e.preventDefault(); router.push('/') }}
                className="inline-flex items-center no-underline cursor-pointer"
              >
                <Image
                  src="/images/logo.svg"
                  alt="FileBrowser"
                  width={200}
                  height={34}
                  className="h-[30px] w-auto"
                  priority
                />
              </a>
            </div>

            {/* Headline */}
            <div className="mt-[67px]">
              <h1 className="text-[54px] font-bold text-black leading-[1.2] mb-[30px] tracking-tight">
                {initialMode === 'investor' ? 'Investor Login' : 'Founder Login'}
              </h1>
              <p className="text-[24px] text-[#555555] leading-[1.4] max-w-[592px] mb-[65px]">
                {initialMode === 'investor'
                  ? 'Access company data rooms, review due diligence documents, and evaluate investment opportunities in a secure environment.'
                  : 'Create and manage your secure data room. Upload pitch decks, financial statements, legal documents, and due diligence materials for investors.'}
              </p>

              <button
                type="button"
                onClick={() => router.push(initialMode === 'investor' ? '/issuer/login' : '/investor/login')}
                className="text-[20px] font-semibold text-[#007aff] hover:text-[#0056b3] transition-colors flex items-center gap-1.5 mt-0"
              >
                {initialMode === 'investor' ? 'Switch to Founder Login →' : 'Switch to Investor Login →'}
              </button>
            </div>
          </div>
        </aside>

        {/* RIGHT — form panel */}
        <main className="rightside-panel w-1/2 flex flex-col justify-between border-l border-[#ebebeb] relative">
          {/* Form area */}
          <div className="flex-1 flex flex-col justify-start lg:pt-[131px] py-10 px-10 lg:px-14 w-full">
            {/* Mobile Header (Visible only on small screens) */}
            <div className="block lg:hidden mb-8">
              {/* Logo */}
              <div className="mb-6">
                <a
                  href="/"
                  onClick={(e) => { e.preventDefault(); router.push('/') }}
                  className="inline-flex items-center no-underline cursor-pointer"
                >
                  <Image
                    src="/images/logo.svg"
                    alt="FileBrowser"
                    width={200}
                    height={34}
                    className="h-[30px] w-auto"
                    priority
                  />
                </a>
              </div>

              {/* Headline */}
              <div>
                <h1 className="text-3xl font-extrabold text-[#1a1a1a] leading-tight mb-2 tracking-tight">
                  {initialMode === 'investor' ? 'Investor Login' : 'Founder Login'}
                </h1>
                <p className="text-sm text-[#555555] leading-relaxed mb-4">
                  {initialMode === 'investor'
                    ? 'Your gateway to exclusive investment opportunities.'
                    : 'Access your fundraising dashboard to manage your deal, track investors, and monitor fundraising progress.'}
                </p>

                <button
                  type="button"
                  onClick={() => router.push(initialMode === 'investor' ? '/issuer/login' : '/investor/login')}
                  className="text-sm font-semibold text-[#007aff] hover:text-[#0056b3] transition-colors flex items-center gap-1.5"
                >
                  {initialMode === 'investor' ? 'Switch to Founder Login →' : 'Switch to Investor Login →'}
                </button>
              </div>
            </div>

            <form onSubmit={handleLogin}>
              {/* Email field */}
              <div className="mb-4">
                <label htmlFor="email" className="input-label">
                  Enter your email address
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="Email"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  autoFocus
                  className="input-field p-inputtext p-component"
                />
              </div>

              {/* Password field */}
              <div className="mb-4">
                <label htmlFor="password" className="input-label">
                  Enter your password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPass ? 'text' : 'password'}
                    placeholder="Password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="input-field p-inputtext p-component pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-[#929292] p-1 flex items-center hover:text-[#555555] transition-colors"
                  >
                    {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Login row */}
              <div className="flex items-center justify-end mb-5 mt-1">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center justify-center px-10 h-[42px] text-sm font-semibold text-[#5a8cc5] bg-[#007aff]/[0.1] border-none rounded-full cursor-pointer min-w-[130px] transition-all duration-200 hover:bg-[#007aff] hover:text-white disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="w-4 h-4 border-2 border-[#4a7abf]/30 border-t-[#4a7abf] rounded-full animate-spin inline-block" />
                  ) : 'Login'}
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  )
}
