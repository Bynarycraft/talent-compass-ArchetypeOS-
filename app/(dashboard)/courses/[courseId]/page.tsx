'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { CheckCircle2, Clock, Video, Users, AlertCircle, ExternalLink } from 'lucide-react'

interface Course {
  id: string
  title: string
  description: string | null
  difficulty: string
  contentUrl: string | null
  contentType: string | null
  duration: number | null
  roadmap?: { archetype: string }
  tests?: { id: string; title: string }[]
  _count?: { enrollments: number }
}

interface Enrollment {
  id: string
  status: string
  progress: number
}

export default function CoursePage() {
  const params = useParams()
  const router = useRouter()
  const courseId = params.courseId

  const [course, setCourse] = useState<Course | null>(null)
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null)
  const [loading, setLoading] = useState(true)
  const [enrolling, setEnrolling] = useState(false)

  useEffect(() => {
    async function fetchCourse() {
      try {
        const res = await fetch(`/api/courses/${courseId}`)
        if (!res.ok) {
          if (res.status === 404) router.push('/404')
          return
        }
        const data = await res.json()
        setCourse(data)

        const enrollRes = await fetch(`/api/courses/${courseId}/enroll-status`)
        if (enrollRes.ok) {
          const enrollData = await enrollRes.json()
          setEnrollment(enrollData)
        }
      } catch (err) {
        console.error('Error fetching course:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchCourse()
  }, [courseId, router])

  const handleStartCourse = async () => {
    setEnrolling(true)
    try {
      const res = await fetch(`/api/courses/${courseId}/enroll`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setEnrollment(data)
      }
    } catch (err) {
      console.error('Failed to enroll:', err)
    } finally {
      setEnrolling(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
    </div>
  )

  if (!course) return <p className="p-4 text-red-500">Course not found</p>

  const isEnrolled = !!enrollment
  const isCompleted = enrollment?.status === 'completed'
  const difficulty = course.difficulty?.toLowerCase() || 'beginner'

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case 'beginner': return { bg: 'bg-emerald-500/10', text: 'text-emerald-500' }
      case 'intermediate': return { bg: 'bg-amber-500/10', text: 'text-amber-500' }
      case 'advanced': return { bg: 'bg-rose-500/10', text: 'text-rose-500' }
      default: return { bg: 'bg-primary/10', text: 'text-primary' }
    }
  }

  const difficultyColor = getDifficultyColor(difficulty)

  const contentUrl = course.contentUrl || ''
  const isYouTube = contentUrl.includes('youtube') || contentUrl.includes('youtu.be')
  const embedUrl = contentUrl
    .replace('watch?v=', 'embed/')
    .replace('youtu.be/', 'youtube.com/embed/')

  return (
    <div className="max-w-6xl mx-auto space-y-12">
      {/* Back Link */}
      <Link href="/courses" className="inline-flex items-center gap-3 text-sm font-bold text-muted-foreground hover:text-primary">
        ← Back to Knowledge Library
      </Link>

      {/* Header Section */}
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center gap-4 flex-wrap">
            <Badge className="bg-primary/10 text-primary border-none font-black tracking-widest px-3 py-1.5">ELITE MODULE</Badge>
            <Badge className={`${difficultyColor.bg} ${difficultyColor.text} text-[10px] font-black tracking-widest px-3 py-1.5 rounded-full border-none`}>
              {course.difficulty?.toUpperCase() || 'STANDARD'}
            </Badge>
            {isCompleted && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                <CheckCircle2 className="h-4 w-4 fill-current" />
                <span className="text-xs font-black">Completed</span>
              </div>
            )}
          </div>
          <h1 className="text-5xl font-black">{course.title}</h1>
          <p className="text-muted-foreground text-xl">{course.description}</p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 pt-4">
            <div className="p-4 rounded-2xl bg-secondary/30 border border-white/5">
              <div className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-1">Duration</div>
              <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /><span className="text-lg font-bold">{course.duration || 'N/A'} min</span></div>
            </div>
            <div className="p-4 rounded-2xl bg-secondary/30 border border-white/5">
              <div className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-1">Type</div>
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4 text-blue-500" />
                <span className="text-lg font-bold">Video</span>
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-secondary/30 border border-white/5">
              <div className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-1">Enrolled</div>
              <div className="flex items-center gap-2"><Users className="h-4 w-4 text-primary" /><span className="text-lg font-bold">{course._count?.enrollments || 0}</span></div>
            </div>
          </div>
        </div>

        {/* Enrollment Card */}
        <Card className="border-none glass rounded-3xl overflow-hidden group h-fit sticky top-8 shadow-2xl shadow-primary/10">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 opacity-50" />
          <CardContent className="pt-8 relative z-10 space-y-6">
            {!isEnrolled ? (
              <div className="space-y-2 text-center">
                <h3 className="text-lg font-black">Ready to Learn?</h3>
                <p className="text-sm text-muted-foreground">Enroll in this course to start your journey</p>
                <Button onClick={handleStartCourse} disabled={enrolling} className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-primary/30">
                  {enrolling ? 'Enrolling...' : 'Enroll Now'}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <h3 className="text-lg font-black">Your Progress</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-bold">Completion</span>
                    <span className="font-black text-primary">{enrollment.progress}%</span>
                  </div>
                  <Progress value={enrollment.progress} className="h-3 rounded-full" />
                </div>
                <Badge className="bg-primary/20 text-primary border-none font-bold capitalize">{enrollment.status}</Badge>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Course Content */}
      <div className="space-y-8">
        <Card className="border-none glass rounded-3xl overflow-hidden">
          <CardHeader className="bg-muted/20 border-b border-border/10 p-8 pb-4">
            <h2 className="text-2xl font-black">Course Content</h2>
          </CardHeader>
          <CardContent className="p-8">
            {course.contentUrl ? (
              <div className="space-y-4">
                {isYouTube ? (
                  <div className="relative w-full pb-[56.25%] rounded-2xl overflow-hidden bg-black/10">
                    <iframe
                      className="absolute inset-0 w-full h-full"
                      src={embedUrl}
                      title={course.title}
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <div className="p-8 rounded-2xl border-2 border-dashed border-border/40 flex flex-col items-center justify-center text-center">
                    <div className="mb-4 p-4 rounded-full bg-primary/10">
                      <Video className="h-8 w-8 text-blue-500" />
                    </div>
                    <h4 className="font-bold mb-2">Video Content</h4>
                    <p className="text-sm text-muted-foreground">This course expects a YouTube link.</p>
                  </div>
                )}
                <Button
                  onClick={() => window.open(contentUrl, '_blank', 'noopener,noreferrer')}
                  className="rounded-2xl font-bold"
                  disabled={!contentUrl}
                >
                  <ExternalLink className="mr-2 h-4 w-4" /> Open on YouTube
                </Button>
              </div>
            ) : (
              <div className="p-8 rounded-2xl border-2 border-dashed border-border/40 text-center">
                <AlertCircle className="h-8 w-8 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">Content not yet available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
