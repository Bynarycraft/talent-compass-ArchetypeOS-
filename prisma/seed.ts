import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting database seed...')

  // Create Admin user
  const hashedAdminPassword = await bcrypt.hash('admin123', 10)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@archetype.local' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@archetype.local',
      password: hashedAdminPassword,
      role: 'admin',
      archetype: 'Architect'
    }
  })
  console.log('✓ Created admin user:', admin.email)

  // Create Supervisor user
  const hashedSupervisorPassword = await bcrypt.hash('supervisor123', 10)
  const supervisor = await prisma.user.upsert({
    where: { email: 'supervisor@archetype.local' },
    update: {},
    create: {
      name: 'Supervisor User',
      email: 'supervisor@archetype.local',
      password: hashedSupervisorPassword,
      role: 'supervisor',
      archetype: 'Catalyst'
    }
  })
  console.log('✓ Created supervisor user:', supervisor.email)

  // Create Learner users
  const hashedLearnerPassword = await bcrypt.hash('learner123', 10)
  const learner1 = await prisma.user.upsert({
    where: { email: 'learner1@archetype.local' },
    update: {},
    create: {
      name: 'Alice Learner',
      email: 'learner1@archetype.local',
      password: hashedLearnerPassword,
      role: 'learner',
      archetype: 'Maker',
      supervisorId: supervisor.id,
      totalLearningHours: 24
    }
  })
  console.log('✓ Created learner user:', learner1.email)

  const learner2 = await prisma.user.upsert({
    where: { email: 'learner2@archetype.local' },
    update: {},
    create: {
      name: 'Bob Learner',
      email: 'learner2@archetype.local',
      password: hashedLearnerPassword,
      role: 'learner',
      archetype: 'Catalyst',
      supervisorId: supervisor.id,
      totalLearningHours: 18
    }
  })
  console.log('✓ Created learner user:', learner2.email)

  // Create Candidate users
  const hashedCandidatePassword = await bcrypt.hash('candidate123', 10)
  const candidate1 = await prisma.user.upsert({
    where: { email: 'candidate@archetype.local' },
    update: {},
    create: {
      name: 'Charlie Candidate',
      email: 'candidate@archetype.local',
      password: hashedCandidatePassword,
      role: 'candidate',
      archetype: null
    }
  })
  console.log('✓ Created candidate user:', candidate1.email)

  // Create Archetypes
  const _architectureArchetype = await prisma.archetype.upsert({
    where: { name: 'Architect' },
    update: {},
    create: {
      name: 'Architect',
      description: 'System designers and architects'
    }
  })

  const _makerArchetype = await prisma.archetype.upsert({
    where: { name: 'Maker' },
    update: {},
    create: {
      name: 'Maker',
      description: 'Hands-on builders and developers'
    }
  })

  const _catalystArchetype = await prisma.archetype.upsert({
    where: { name: 'Catalyst' },
    update: {},
    create: {
      name: 'Catalyst',
      description: 'Change agents and innovators'
    }
  })

  console.log('✓ Created archetypes')

  // Create Roadmap
  const roadmap = await prisma.roadmap.upsert({
    where: { id: 'roadmap-1' },
    update: {},
    create: {
      id: 'roadmap-1',
      name: 'Full Stack Development',
      archetype: 'Maker',
      description: 'Complete full-stack web development learning path'
    }
  })
  console.log('✓ Created roadmap')

  // Create Modules
  const module1 = await prisma.module.create({
    data: {
      roadmapId: roadmap.id,
      name: 'Frontend Fundamentals',
      description: 'HTML, CSS, JavaScript basics',
      order: 1
    }
  })

  const module2 = await prisma.module.create({
    data: {
      roadmapId: roadmap.id,
      name: 'Backend Development',
      description: 'Node.js and API development',
      order: 2
    }
  })

  console.log('✓ Created modules')

  // Create Courses
  const course1 = await prisma.course.upsert({
    where: { id: 'course-1' },
    update: {
      contentType: 'video',
      contentUrl: 'https://youtube.com/embed/w7ejDZ8SWv8'
    },
    create: {
      id: 'course-1',
      title: 'React Fundamentals',
      description: 'Master the core concepts of React. Learn about components, JSX, state, props, and hooks in this comprehensive beginner course. Build your first interactive web applications with React.',
      difficulty: 'beginner',
      roadmapId: roadmap.id,
      moduleId: module1.id,
      contentType: 'video',
      contentUrl: 'https://youtube.com/embed/w7ejDZ8SWv8',
      duration: 120,
      version: '1.0'
    }
  })

  const course2 = await prisma.course.upsert({
    where: { id: 'course-2' },
    update: {
      contentType: 'video',
      contentUrl: 'https://youtube.com/embed/0aJ8j1HqDJE'
    },
    create: {
      id: 'course-2',
      title: 'Advanced React Patterns',
      description: 'Take your React skills to the next level. Explore advanced patterns like render props, custom hooks, context API, and performance optimization techniques. Perfect for developers who already know React basics.',
      difficulty: 'advanced',
      roadmapId: roadmap.id,
      moduleId: module1.id,
      contentType: 'video',
      contentUrl: 'https://youtube.com/embed/0aJ8j1HqDJE',
      duration: 180,
      version: '1.0'
    }
  })

  const course3 = await prisma.course.upsert({
    where: { id: 'course-3' },
    update: {
      contentType: 'video',
      contentUrl: 'https://youtube.com/embed/ENrzD6iR81g'
    },
    create: {
      id: 'course-3',
      title: 'Node.js & Express Fundamentals',
      description: 'Build scalable backend applications with Node.js and Express. Learn about routing, middleware, databases, authentication, and deployment. This course is essential for full-stack developers.',
      difficulty: 'intermediate',
      roadmapId: roadmap.id,
      moduleId: module2.id,
      contentType: 'video',
      contentUrl: 'https://youtube.com/embed/ENrzD6iR81g',
      duration: 150,
      version: '1.0'
    }
  })

  const course4 = await prisma.course.upsert({
    where: { id: 'course-4' },
    update: {
      contentType: 'video',
      contentUrl: 'https://youtube.com/embed/gieEQFIfgYc'
    },
    create: {
      id: 'course-4',
      title: 'TypeScript for JavaScript Developers',
      description: 'Learn TypeScript and add type safety to your JavaScript projects. Understand interfaces, generics, decorators, and more. A must-have skill for modern web development.',
      difficulty: 'intermediate',
      roadmapId: roadmap.id,
      moduleId: module1.id,
      contentType: 'video',
      contentUrl: 'https://youtube.com/embed/gieEQFIfgYc',
      duration: 140,
      version: '1.0'
    }
  })

  const _course5 = await prisma.course.upsert({
    where: { id: 'course-5' },
    update: {
      contentType: 'video',
      contentUrl: 'https://youtube.com/embed/9Pzj7Aj25lw'
    },
    create: {
      id: 'course-5',
      title: 'Database Design with PostgreSQL',
      description: 'Master relational database design and SQL. Learn about normalization, relationships, queries, and optimization. Perfect for backend and full-stack developers.',
      difficulty: 'intermediate',
      roadmapId: roadmap.id,
      moduleId: module2.id,
      contentType: 'video',
      contentUrl: 'https://youtube.com/embed/9Pzj7Aj25lw',
      duration: 160,
      version: '1.0'
    }
  })

  const _course6 = await prisma.course.upsert({
    where: { id: 'course-6' },
    update: {
      contentType: 'video',
      contentUrl: 'https://youtube.com/embed/lXv5mM2F81o'
    },
    create: {
      id: 'course-6',
      title: 'System Design Interview Prep',
      description: 'Prepare for system design interviews at top tech companies. Learn about architecture, scalability, databases, and distributed systems. Advanced course for experienced developers.',
      difficulty: 'advanced',
      roadmapId: roadmap.id,
      moduleId: module2.id,
      contentType: 'video',
      contentUrl: 'https://youtube.com/embed/lXv5mM2F81o',
      duration: 240,
      version: '1.0'
    }
  })

  console.log('✓ Created courses')

  // Create Course Enrollments
  const enrollments = [
    { userId: learner1.id, courseId: course1.id, status: 'completed', progress: 100 },
    { userId: learner1.id, courseId: course2.id, status: 'in_progress', progress: 45 },
    { userId: learner1.id, courseId: course3.id, status: 'in_progress', progress: 30 },
    { userId: learner2.id, courseId: course1.id, status: 'in_progress', progress: 60 },
    { userId: learner2.id, courseId: course4.id, status: 'in_progress', progress: 20 },
    { userId: candidate1.id, courseId: course1.id, status: 'started', progress: 15 }
  ]

  for (const enrollment of enrollments) {
    await prisma.courseEnrollment.upsert({
      where: {
        userId_courseId: {
          userId: enrollment.userId,
          courseId: enrollment.courseId
        }
      },
      update: {},
      create: enrollment
    })
  }

  console.log('✓ Created course enrollments')

  // Create Tests
  const test1 = await prisma.test.create({
    data: {
      courseId: course1.id,
      title: 'React Fundamentals Test',
      description: 'Test your knowledge of React basics',
      type: 'mcq',
      timeLimit: 60,
      attemptLimit: 3,
      passingScore: 70,
      questions: JSON.stringify([
        {
          id: 1,
          type: 'mcq',
          question: 'What is React?',
          options: ['A UI library', 'A framework', 'A database', 'A language'],
          correctAnswer: 0
        },
        {
          id: 2,
          type: 'mcq',
          question: 'What is JSX?',
          options: ['JavaScript XML', 'Java Syntax', 'Just X', 'JSON X'],
          correctAnswer: 0
        }
      ]),
      gradingType: 'auto'
    }
  })

  console.log('✓ Created tests')

  // Create Test Results
  await prisma.testResult.create({
    data: {
      userId: learner1.id,
      testId: test1.id,
      score: 85,
      status: 'graded',
      answers: JSON.stringify([0, 0]),
      feedback: 'Great job! You passed the test.',
      gradedAt: new Date(),
      submittedAt: new Date(),
      attemptNumber: 1
    }
  })

  console.log('✓ Created test results')

  // Create Learning Sessions
  const now = new Date()
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  
  await prisma.learningSession.create({
    data: {
      userId: learner1.id,
      status: 'completed',
      startTime: yesterday,
      endTime: new Date(yesterday.getTime() + 6 * 60 * 60 * 1000),
      durationMinutes: 360
    }
  })

  await prisma.learningSession.create({
    data: {
      userId: learner2.id,
      status: 'completed',
      startTime: yesterday,
      endTime: new Date(yesterday.getTime() + 4 * 60 * 60 * 1000),
      durationMinutes: 240
    }
  })

  console.log('✓ Created learning sessions')

  // Create Skills
  await prisma.skill.upsert({
    where: { userId_name: { userId: learner1.id, name: 'React' } },
    update: {},
    create: {
      userId: learner1.id,
      name: 'React',
      description: 'React.js library',
      level: 4,
      proficiency: 80,
      evidenceCourses: JSON.stringify([course1.id])
    }
  })

  await prisma.skill.upsert({
    where: { userId_name: { userId: learner1.id, name: 'TypeScript' } },
    update: {},
    create: {
      userId: learner1.id,
      name: 'TypeScript',
      description: 'TypeScript language',
      level: 3,
      proficiency: 65,
      evidenceCourses: JSON.stringify([course2.id])
    }
  })

  console.log('✓ Created skills')

  console.log('✓ Database seeded successfully!')
}

main()
  .catch(e => {
    console.error('Seed error:', e)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
